// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol"; // Para restringir ciertas funciones al dueño del contrato
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol"; // Para crear proxies UUPS
import "./PublicBulletinBoard.sol"; // La implementación del PBB

contract PBBFactory is Ownable {

    // Almacena las direcciones de las implementaciones por versión
    mapping(uint256 => address) public implementations;

    // Almacena las direcciones de todos los PBBs creados y su cantidad
    mapping(uint256 => address) public pbbAddresses;
    uint256 public pbbCount;  // Contador para llevar el registro del número de PBBs creados

    // Evento para notificar al frontend cuando se crea un nuevo PBB
    event PBBCreated(address indexed creator, address indexed pbbAddress, uint256 version, string name);
    
    event ImplementationAdded(uint256 version, address implementation);

    modifier notZeroAddress(address _addr) {
        require(_addr != address(0), "Direccion no puede ser la direccion cero");
        _;
    }

    constructor() Ownable(msg.sender) {}
 
    /**
     * @notice Añade una nueva implementación base para los PBBs.
     * @dev Solo el propietario puede registrar implementaciones.
     * @param version Versión asignada a la implementación.
     * @param implementation Dirección del contrato base.
     */
    function addImplementation(uint256 version, address implementation) external onlyOwner notZeroAddress(implementation) {
        require(implementations[version] == address(0), "La version ya existe");
        
        // Guardamos la dirección de la implementación para esa versión
        implementations[version] = implementation;
        emit ImplementationAdded(version, implementation);
    }

    /**
     * @notice Crea un nuevo PBB como proxy UUPS basado en una implementación registrada.
     * @param version Versión del contrato base que se utilizará.
     * @param admin Dirección que será el administrador del nuevo PBB.
     * @param name Nombre del nuevo PBB.
     * @param authUsers Lista de direcciones de usuarios autorizados inicialmente.
     * @return La dirección del contrato PBB creado.
     */
    function createPBB(uint256 version, address admin, string calldata name, address[] calldata authUsers) external notZeroAddress(admin) returns (address) {
        
        // Obtenemos la implementación correspondiente a la versión solicitada
        address implementation = implementations[version];
        require(implementation != address(0), "Implementation not found for version");
        require(bytes(name).length > 0, "El nombre no puede estar vacio");

        // Codificamos los datos para inicializar el PBB usando la función `initialize` del contrato
        bytes memory initData = abi.encodeWithSelector(
            PublicBulletinBoard.initialize.selector, // La función que queremos llamar
            name,
            msg.sender,
            authUsers
        );

        // Creamos el proxy UUPS apuntando a la implementación actual
        ERC1967Proxy proxy = new ERC1967Proxy(implementation, initData);

        // Guardamos la dirección del nuevo PBB en el mapping
        pbbAddresses[pbbCount] = address(proxy);
        pbbCount++;

        // Emitimos un evento para que el frontend sepa que se ha creado un nuevo PBB
        emit PBBCreated(msg.sender, address(proxy), version, name);

        return address(proxy);  // Devolvemos la dirección del proxy creado
    }
}
