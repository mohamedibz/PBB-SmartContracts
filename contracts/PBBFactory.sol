// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol"; // Para crear proxies UUPS

/**
 * @title PBBFactory
 * @notice Fábrica para crear y administrar Public Bulletin Boards (PBBs) usando proxies UUPS.
 * @dev Utiliza AccessControl para el manejo de permisos y roles. Las implementaciones de PBB se actualizan mediante `upgradeToAndCall`.
 */
contract PBBFactory is AccessControl  {

    bytes32 public constant DEVELOPER_ROLE = keccak256("DEVELOPER_ROLE");

    // Almacenamiento de implementaciones y PBBs creados
    mapping(uint256 => address) public implementations;
    mapping(uint256 => address) public pbbAddresses;
    uint256 public pbbCount; // Contador de PBBs creados

    // Eventos para notificación de cambios
    event PBBCreated(address indexed creator, address indexed pbbAddress, uint256 version, string name);
    event ImplementationAdded(uint256 version, address implementation);
    event PBBUpdated(address indexed pbbAddress, uint256 version);
    
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
        require(implementations[version] == address(0), "La version ya existe");
        
        implementations[version] = implementation;
        emit ImplementationAdded(version, implementation);
    }

    /**
     * @notice Crea un nuevo PBB como proxy UUPS basado en una implementación registrada.
     * @param version Versión del contrato base que se utilizará.
     * @param name Nombre del nuevo PBB.
     * @param authUsers Lista de direcciones de usuarios autorizados inicialmente.
     * @return La dirección del contrato PBB creado.
     */
    function createPBB(uint256 version, string calldata name, address[] calldata authUsers) external returns (address) {
        
        address implementation = implementations[version];
        require(implementation != address(0), "Implementacion no encontrada para la version especificada");
        require(bytes(name).length > 0, "El nombre no puede estar vacio");

        bytes memory initData = abi.encodeWithSelector(
            bytes4(keccak256("initialize(string,address,address,address[])")),
            name,
            msg.sender,
            address(this),
            authUsers
        );

        ERC1967Proxy proxy = new ERC1967Proxy(implementation, initData);
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
    function updatePBB(address pbbAddress, uint256 version) external onlyRole(DEVELOPER_ROLE) notZeroAddress(pbbAddress) {
        require(implementations[version] != address(0), "Implementacion no valida");


        (bool success, ) = pbbAddress.call(
            abi.encodeWithSignature("upgradeToAndCall(address,bytes)", implementations[version], new bytes(0))
        );
        require(success, "Fallo en la actualizacion de la PBB");

        emit PBBUpdated(pbbAddress, version);
    }


}
