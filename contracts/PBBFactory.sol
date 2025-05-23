// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol"; // Para crear proxies UUPS
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./IPublicBulletinBoard.sol";

/**
 * @title IUpgradeableProxy
 * @notice Interfaz para el método upgradeToAndCall que usan los proxies UUPS.
 */
interface IUpgradeableProxy {
    /**
    * @notice Actualiza la implementación y, opcionalmente, ejecuta una llamada de inicialización.
    * @param newImplementation La dirección de la nueva implementación.
    * @param data Datos para inicializar el contrato después de la actualización.
    */
    function upgradeToAndCall(address newImplementation, bytes calldata data) external;
}


/**
 * @title PBBFactory
 * @notice Fábrica para crear y administrar Public Bulletin Boards (PBBs) usando proxies UUPS.
 * @dev Utiliza AccessControl para el manejo de permisos y roles. Las implementaciones de PBB se actualizan mediante `upgradeToAndCall`.
 */
contract PBBFactory is AccessControl, ReentrancyGuard {

    bytes32 public constant DEVELOPER_ROLE = keccak256("DEVELOPER_ROLE");

    // Almacenamiento de implementaciones y PBBs creados
    mapping(uint256 => address) public implementations;
    mapping(uint256 => address) public pbbAddresses;
    mapping(address => uint256) public pbbVersion;
    uint256 public pbbCount; // Contador de PBBs creados

    // Eventos para notificación de cambios
    event PBBCreated(address indexed creator, address indexed pbbAddress, uint256 version, string name);
    event ImplementationAdded(address implementation, uint256 version);
    event PBBUpdated(address indexed pbbAddress, uint256 version);
    event FailedUpdate(address indexed pbbAddress, uint256 version);
    
    uint256[50] private __gap;

    /**
     * @dev Modificador para verificar que la dirección no sea la dirección cero.
     */
    modifier notZeroAddress(address _addr) {
        require(_addr != address(0), "La direccion no puede ser la direccion cero");
        _;
    }

    /**
     * @dev Constructor del contrato. Establece al deployer como `DEFAULT_ADMIN_ROLE` y `DEVELOPER_ROLE`.
     */
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(DEVELOPER_ROLE, msg.sender);
    }
 
    /**
     * @notice Añade una nueva implementación base para los PBBs.
     * @param version Versión de la implementación.
     * @param implementation Dirección del contrato base de la implementación.
     * @dev Solo accesible para cuentas con el rol `DEVELOPER_ROLE`.
     */
    function addImplementation(uint256 version, address implementation) external onlyRole(DEVELOPER_ROLE) notZeroAddress(implementation) {
        
        try IPublicBulletinBoard(implementation).supportsInterface(type(IPublicBulletinBoard).interfaceId) returns (bool result) {
            require(result, "Implementacion incompatible con IPublicBulletinBoard");
        } catch {
            revert("Error al verificar la compatibilidad de la implementacion");
        }
        
        require(implementations[version] == address(0), "La version ya existe");
        
        implementations[version] = implementation;
        emit ImplementationAdded(implementation, version);
    }

    /**
     * @notice Crea un nuevo PBB como proxy UUPS basado en una implementación registrada.
     * @param version Versión del contrato base que se utilizará.
     * @param name Nombre del nuevo PBB.
     * @return La dirección del contrato PBB creado.
     */
    function createPBB(uint256 version, string calldata name) external returns (address) {
        
        address implementation = implementations[version];
        require(implementation != address(0), "Implementacion no encontrada para la version especificada");
        require(bytes(name).length > 0, "El nombre no puede estar vacio");

        bytes memory initData = abi.encodeWithSelector(
            bytes4(keccak256("initialize(string,address,address)")),
            name,
            msg.sender,
            address(this)
        );

        ERC1967Proxy proxy = new ERC1967Proxy(implementation, initData);

        pbbVersion[address(proxy)] = version;
        pbbAddresses[pbbCount] = address(proxy);
        pbbCount++;

        emit PBBCreated(msg.sender, address(proxy), version, name);
        return address(proxy);
    }

    /**
     * @notice Actualiza la implementación de un PBB a una nueva versión.
     * @param pbbAddress Dirección del PBB a actualizar.
     * @param version Versión de la nueva implementación.
     * @dev Solo accesible para cuentas con el rol `DEVELOPER_ROLE`.
     */
    function updatePBB(address pbbAddress, uint256 version) external nonReentrant onlyRole(DEVELOPER_ROLE) notZeroAddress(pbbAddress) {

        require(implementations[version] != address(0), "Implementacion no valida");
        require(pbbVersion[pbbAddress] != version, "El boletin ya esta actualizado a esta version");

        address newImplementation = implementations[version];

        try IPublicBulletinBoard(newImplementation).supportsInterface(type(IPublicBulletinBoard).interfaceId) returns (bool result) {
            require(result, "Implementacion incompatible con IPublicBulletinBoard");
        } catch {
            emit FailedUpdate(pbbAddress, version);
            revert("Fallo en la verificacion de compatibilidad");
        }

        pbbVersion[pbbAddress] = version;

        try IUpgradeableProxy(pbbAddress).upgradeToAndCall(implementations[version], new bytes(0)) {
            emit PBBUpdated(pbbAddress, version);

        } catch {
            pbbVersion[pbbAddress] = 0;
            revert("Fallo en la actualizacion de la PBB");
        }
        
    }


}
