import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "./PublicBulletinBoard.sol";

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title PBB Factory
 * @notice Este contrato actúa como una fábrica para crear y gestionar implementaciones de Public Bulletin Boards (PBBs).
 * @dev Utiliza el patrón Clones de OpenZeppelin para crear clones eficientes de contratos base.
 */
contract PBBFactory is Ownable {

    // Mapeo de versiones a direcciones de implementaciones base
    mapping(uint256 => address) public implementations;

    // Eventos
    /**
     * @notice Emitido cuando se crea un nuevo PBB.
     * @param creator Dirección que solicitó la creación del PBB.
     * @param pbbAddress Dirección del contrato PBB creado.
     * @param version Versión del contrato base utilizado para el PBB.
     * @param name Nombre del PBB.
     */
    event PBBCreated(address indexed creator, address indexed pbbAddress, uint256 version, string name);

    /**
     * @notice Emitido cuando se registra una nueva implementación base.
     * @param version Versión asignada a la implementación.
     * @param implementation Dirección del contrato base registrado.
     */
    event ImplementationAdded(uint256 version, address implementation);

    /**
     * @notice Constructor del contrato. Establece al creador como propietario inicial.
     */
    constructor() Ownable(msg.sender) {}

    /**
     * @notice Registra una nueva implementación base para PBBs.
     * @dev Solo el propietario puede registrar implementaciones.
     * @param version Versión que se asignará a la implementación.
     * @param implementation Dirección del contrato base que se registra.
     */
    function addImplementation(uint256 version, address implementation) external onlyOwner {
        require(implementation != address(0), "Invalid implementation address");
        require(implementations[version] == address(0), "Version already exists");
        implementations[version] = implementation;
        emit ImplementationAdded(version, implementation);
    }

    /**
     * @notice Crea un nuevo PBB basado en una implementación registrada.
     * @dev Utiliza la librería Clones de OpenZeppelin para crear un contrato clon.
     * @param version Versión del contrato base que se utilizará.
     * @param admin Dirección que será el administrador del nuevo PBB.
     * @param name Nombre del nuevo PBB.
     * @param authUsers Lista de direcciones de usuarios autorizados inicialmente.
     * @return La dirección del contrato PBB creado.
     */
    function createPBB(uint256 version, address admin, string calldata name, address[] calldata authUsers) external returns (address) {
        address implementation = implementations[version];

        require(authUsers.length > 0, "Must provide at least one authorized user"); 
        require(implementation != address(0), "Implementation not found for version");
        require(bytes(name).length > 0, "Name cannot be empty");

        // Codifica los datos de inicialización para la función `initialize`
        bytes memory initData = abi.encodeWithSelector(
            bytes4(keccak256("initialize(string,address,address,address[])")),
            name,
            admin,
            msg.sender,
            authUsers
        );

        // Despliega un nuevo proxy ERC-1967 con la implementación seleccionada
        ERC1967Proxy proxy = new ERC1967Proxy(implementation, initData);

        // Emitir evento para registrar el despliegue
        emit PBBCreated(msg.sender, address(proxy), version, name);

        return address(proxy);

    }
}
