// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./PBBFactory.sol";
import "./PublicBulletinBoard.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title PBB Implementation
 * @notice Este contrato gestiona la interacción y administración de múltiples Public Bulletin Boards (PBBs).
 * @dev Utiliza el patrón UUPS para actualizaciones y permite la creación y gestión de contratos PBB.
 */
contract PBBImplementation is UUPSUpgradeable {

    PBBFactory public factory; // Dirección del contrato Factory utilizado para crear PBBs.
    mapping(uint256 => address) public pbbContracts; // Mapeo de IDs de PBB a sus direcciones.
    uint256 public pbbCounter; // Contador para asignar IDs únicos a los PBBs creados.

    // Eventos
    /**
     * @notice Emitido cuando se crea un nuevo PBB.
     * @param pbbId ID único del PBB creado.
     * @param name Nombre del PBB.
     * @param creator Dirección que creó el PBB.
     * @param pbbAddress Dirección del contrato PBB creado.
     * @param timestamp Marca de tiempo del momento de creación.
     */
    event PBBCreated(uint256 indexed pbbId, string name, address indexed creator, address pbbAddress, uint256 timestamp);

    /**
     * @notice Emitido cuando se agrega un mensaje a un PBB.
     * @param pbbId ID del PBB al que se agregó el mensaje.
     * @param sender Dirección del remitente del mensaje.
     * @param content Contenido del mensaje.
     * @param topic Tema del mensaje.
     * @param timestamp Marca de tiempo del momento en que se agregó el mensaje.
     */
    event MessageAdded(uint256 indexed pbbId, address indexed sender, string content, string topic, uint256 timestamp);

    /**
     * @notice Emitido cuando un usuario es autorizado en un PBB.
     * @param pbbId ID del PBB.
     * @param admin Dirección del administrador que autorizó al usuario.
     * @param newUser Dirección del usuario autorizado.
     * @param timestamp Marca de tiempo del momento de autorización.
     */
    event UserAuthorized(uint256 indexed pbbId, address indexed admin, address indexed newUser, uint256 timestamp);

    /**
     * @notice Emitido cuando un usuario es revocado de un PBB.
     * @param pbbId ID del PBB.
     * @param admin Dirección del administrador que revocó al usuario.
     * @param user Dirección del usuario revocado.
     * @param timestamp Marca de tiempo del momento de revocación.
     */
    event UserRevoked(uint256 indexed pbbId, address indexed admin, address indexed user, uint256 timestamp);

    /**
     * @notice Emitido cuando se transfiere el rol de administrador en un PBB.
     * @param pbbId ID del PBB.
     * @param oldAdmin Dirección del administrador anterior.
     * @param newAdmin Dirección del nuevo administrador.
     * @param timestamp Marca de tiempo de la transferencia.
     */
    event AdminTransferred(uint256 indexed pbbId, address indexed oldAdmin, address indexed newAdmin, uint256 timestamp);

    // Modificador para verificar si un PBB existe
    modifier pbbExists(uint256 pbbId) {
        require(pbbContracts[pbbId] != address(0), "PBB does not exist");
        _;
    }

    /**
     * @notice Inicializa el contrato con la dirección del Factory.
     * @param _factory Dirección del contrato Factory utilizado para crear PBBs.
     */
    function initialize(address _factory) external {
        factory = PBBFactory(_factory);
        pbbCounter = 1;
    }

    /**
     * @notice Crea un nuevo PBB y lo registra en este contrato.
     * @param version Versión del contrato PBB que se desea crear.
     * @param name Nombre del PBB.
     * @param authUsers Lista de direcciones de usuarios autorizados inicialmente.
     */
    function createPBB(uint256 version, string calldata name, address[] calldata authUsers) external {
        address pbbAddress = factory.createPBB(version, msg.sender, name, authUsers);
        pbbContracts[pbbCounter] = pbbAddress;

        emit PBBCreated(pbbCounter, name, msg.sender, pbbAddress, block.timestamp);

        for (uint256 i = 0; i < authUsers.length; i++) {
            emit UserAuthorized(pbbCounter, msg.sender, authUsers[i], block.timestamp);
        }

        pbbCounter++;
    }

    /**
     * @notice Agrega un mensaje a un PBB específico.
     * @param pbbId ID del PBB al que se desea agregar el mensaje.
     * @param content Contenido del mensaje.
     * @param topic Tema del mensaje.
     */
    function addMessageToPBB(uint256 pbbId, string calldata content, string calldata topic) external pbbExists(pbbId) {
        address pbbAddress = pbbContracts[pbbId];
        uint256 version = PublicBulletinBoard(pbbAddress).version();

        if (version == 1 || version == 2) {
            
            PublicBulletinBoard pbb = PublicBulletinBoard(pbbAddress);
            require(pbb.isAuthorized(msg.sender), "usuario no autorizado");

            pbb.addMessage(content, topic);
        } else {
            revert("Version no soportada");
        }

        emit MessageAdded(pbbId, msg.sender, content, topic, block.timestamp);
    }

    /**
     * @notice Obtiene un mensaje específico de un PBB por su ID.
     * @param pbbId ID del PBB.
     * @param messageId ID del mensaje dentro del PBB.
     * @return Detalles del mensaje como un struct `Message`.
     */
    function getMessageFromPBB(uint256 pbbId, uint256 messageId) external pbbExists(pbbId) view returns (PublicBulletinBoard.Message memory) {
        address pbbAddress = pbbContracts[pbbId];
        return PublicBulletinBoard(pbbAddress).getMessageById(messageId);
    }

    /**
     * @notice Obtiene un rango de mensajes de un PBB.
     * @param pbbId ID del PBB.
     * @param startIndex Índice inicial (incluido).
     * @param endIndex Índice final (excluido).
     * @return Un array de mensajes dentro del rango.
     */
    function getMessagesInRangeFromPBB(uint256 pbbId, uint256 startIndex, uint256 endIndex) external pbbExists(pbbId) view returns (PublicBulletinBoard.Message[] memory) {
        address pbbAddress = pbbContracts[pbbId];
        return PublicBulletinBoard(pbbAddress).getMessagesInRange(startIndex, endIndex);
    }

    /**
     * @notice Autoriza a un nuevo usuario en un PBB.
     * @param pbbId ID del PBB.
     * @param user Dirección del usuario a autorizar.
     */
    function authorizeUser(uint256 pbbId, address user) external pbbExists(pbbId) {
        address pbbAddress = pbbContracts[pbbId];
        PublicBulletinBoard pbb = PublicBulletinBoard(pbbAddress);
        require(pbb.isAdmin(msg.sender), "Usuario no es administrador");
        pbb.addAuthorizedUser(user);
        emit UserAuthorized(pbbId, msg.sender, user, block.timestamp);
    }

    /**
     * @notice Revoca la autorización de un usuario en un PBB.
     * @param pbbId ID del PBB.
     * @param user Dirección del usuario a revocar.
     */
    function revokeUser(uint256 pbbId, address user) external pbbExists(pbbId) {
        address pbbAddress = pbbContracts[pbbId];
        PublicBulletinBoard pbb = PublicBulletinBoard(pbbAddress);
        require(pbb.isAdmin(msg.sender), "Usuario no es administrador");
        pbb.removeAuthorizedUser(user);
        emit UserRevoked(pbbId, msg.sender, user, block.timestamp);
    }

    /**
     * @notice Transfiere el rol de administrador de un PBB a una nueva dirección.
     * @param pbbId ID del PBB.
     * @param newAdmin Dirección del nuevo administrador.
     */
    function transferAdminOfPBB(uint256 pbbId, address newAdmin) external pbbExists(pbbId) {
        address pbbAddress = pbbContracts[pbbId];
        PublicBulletinBoard pbb = PublicBulletinBoard(pbbAddress);
        require(pbb.isAdmin(msg.sender), "Usuario no es administrador");
        require(newAdmin != address(0), "Nueva direccion no puede ser la direccion cero");

        pbb.transferAdmin(msg.sender, newAdmin);
        emit AdminTransferred(pbbId, msg.sender, newAdmin, block.timestamp);
    }

    /**
     * @notice Autoriza la actualización del contrato.
     * @dev Función requerida por el patrón UUPS.
     * @param newImplementation Dirección de la nueva implementación.
     */
    function _authorizeUpgrade(address newImplementation) internal virtual override {}
}
