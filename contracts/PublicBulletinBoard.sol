// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title Public Bulletin Board (PBB)
 * @notice Este contrato permite la creación de tablones públicos donde los usuarios autorizados pueden publicar mensajes.
 * @dev Utiliza el patrón proxy para actualizaciones y permite la gestión de permisos de usuarios.
 */
contract PublicBulletinBoard is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    
    /**
     * @notice Estructura para representar un mensaje en el tablón.
     * @dev Cada mensaje tiene un identificador único, un remitente, contenido, un tema y una marca de tiempo.
     */
    struct Message {
        uint256 id;            // Identificador único del mensaje
        address sender;        // Dirección del remitente
        bytes32 content;       // Contenido del mensaje, limitado a 32 bytes
        bytes32 topic;         // Tema del mensaje, limitado a 32 bytes
        uint256 timestamp;     // Marca de tiempo del momento de creación
    }

    address admin; // Dirección del administrador del contrato
    string public name; // Nombre del tablón
    mapping(uint256 => Message) public messages; // Almacén de mensajes por ID
    mapping(address => bool) public authorizedUsers; // Mapeo de usuarios autorizados
    uint256 public nextMessageId; // Contador para el próximo ID de mensaje

    uint256 public constant MAX_BYTES = 32; // Máximo tamaño permitido para strings convertidos a bytes32

    /**
     * @notice Inicializa el contrato con el nombre, administrador, propietario y usuarios autorizados iniciales.
     * @dev Configura el propietario inicial y establece las direcciones autorizadas.
     * @param _name Nombre del tablón.
     * @param _admin Dirección del administrador inicial.
     * @param _owner Dirección del propietario inicial del contrato.
     * @param _authUsers Lista de direcciones de usuarios autorizados inicialmente.
     */
    function initialize(string calldata _name, address _admin, address _owner, address[] calldata _authUsers) external initializer {
        admin = _admin;
        name = _name;
        nextMessageId = 1;
        _transferOwnership(_owner);

        for (uint256 i = 0; i < _authUsers.length; i++) {
            authorizedUsers[_authUsers[i]] = true;
        }
    }

    /**
     * @notice Autoriza la actualización del contrato.
     * @dev Función requerida por el patrón UUPS.
     * @param newImplementation Dirección de la nueva implementación.
     */
    function _authorizeUpgrade(address newImplementation) internal virtual override {
        require(newImplementation != address(0), "Invalid implementation address");
        require(owner() == msg.sender, "Not authorized to upgrade");
    }

    /**
     * @notice Verifica si una dirección es el administrador del contrato.
     * @param user Dirección a verificar.
     * @return `true` si la dirección es el administrador, de lo contrario `false`.
     */
    function isAdmin(address user) external view returns (bool) {
        return user == admin;
    }

    /**
     * @notice Transfiere los permisos de administrador a una nueva dirección.
     * @dev Solo el administrador actual puede ejecutar esta función.
     * @param newAdmin Dirección del nuevo administrador.
     */
    function transferAdmin(address _admin, address newAdmin) external {
        require(_admin == admin, "Solo el administrador actual puede transferir permisos");
        require(newAdmin != address(0), "La nueva direccion de administrador no puede ser la direccion cero");
        admin = newAdmin;
    }

    /**
     * @notice Devuelve la versión del contrato.
     * @return La versión actual del contrato.
     */
    function version() public pure virtual returns (uint256) {
        return 1;
    }

    /**
     * @notice Agrega un nuevo mensaje al tablón.
     * @dev Solo el propietario del contrato puede ejecutar esta función. Los contenidos se convierten a bytes32.
     * @param content Contenido del mensaje (máximo 32 bytes).
     * @param topic Tema del mensaje (máximo 32 bytes).
     */
    function addMessage(string calldata content, string calldata topic) external onlyOwner {
        bytes32 contentBytes = _toBytes32(content);
        bytes32 topicBytes = _toBytes32(topic);

        messages[nextMessageId] = Message({
            id: nextMessageId,
            sender: msg.sender,
            content: contentBytes,
            topic: topicBytes,
            timestamp: block.timestamp
        });

        nextMessageId++;
    }

    /**
     * @notice Obtiene un mensaje específico por su ID.
     * @param id ID del mensaje solicitado.
     * @return Un struct `Message` con los detalles del mensaje.
     */
    function getMessageById(uint256 id) external view returns (Message memory) {
        require(id > 0 && id < nextMessageId, "ID de mensaje no valido");
        return messages[id];
    }

    /**
     * @notice Obtiene un rango de mensajes del tablón.
     * @dev Los índices deben estar dentro del rango existente de mensajes.
     * @param startIndex Índice inicial (incluido).
     * @param endIndex Índice final (excluido).
     * @return Un array de structs `Message` dentro del rango especificado.
     */
    function getMessagesInRange(uint256 startIndex, uint256 endIndex) external view returns (Message[] memory) {
        require(startIndex < endIndex, "startIndex debe ser menor que endIndex");
        require(endIndex <= nextMessageId, "endIndex fuera de rango");

        Message[] memory result = new Message[](endIndex - startIndex);

        for (uint256 i = startIndex; i < endIndex; i++) {
            result[i - startIndex] = messages[i];
        }

        return result;
    }

    /**
     * @notice Autoriza a un nuevo usuario para publicar mensajes.
     * @dev Solo el propietario del contrato puede ejecutar esta función.
     * @param newUser Dirección del nuevo usuario a autorizar.
     */
    function addAuthorizedUser(address newUser) external onlyOwner {
        authorizedUsers[newUser] = true;
    }

    /**
     * @notice Revoca la autorización de un usuario.
     * @dev Solo el propietario del contrato puede ejecutar esta función.
     * @param user Dirección del usuario a revocar.
     */
    function removeAuthorizedUser(address user) external onlyOwner {
        authorizedUsers[user] = false;
    }

    /**
     * @notice Verifica si un usuario está autorizado para publicar mensajes.
     * @param user Dirección del usuario a verificar.
     * @return `true` si el usuario está autorizado, de lo contrario `false`.
     */
    function isAuthorized(address user) external view returns (bool) {
        return authorizedUsers[user];
    }

    /**
     * @notice Convierte un string a bytes32, validando su longitud.
     * @dev Internamente asegura que el string no exceda el límite de 32 bytes.
     * @param source El string a convertir.
     * @return La representación en bytes32 del string.
     */
    function _toBytes32(string memory source) internal pure returns (bytes32) {
        bytes memory tempBytes = bytes(source);
        require(tempBytes.length <= MAX_BYTES, "El string es demasiado largo");
        bytes32 result;
        assembly {
            result := mload(add(source, 32))
        }
        return result;
    }

    /**
     * @notice Convierte un bytes32 a string.
     * @dev Elimina los bytes vacíos al final.
     * @param data El valor en bytes32 a convertir.
     * @return El string resultante.
     */
    function _toString(bytes32 data) internal pure returns (string memory) {
        uint256 length = 0;
        while (length < 32 && data[length] != 0) {
            length++;
        }
        bytes memory result = new bytes(length);
        for (uint256 i = 0; i < length; i++) {
            result[i] = data[i];
        }
        return string(result);
    }
}
