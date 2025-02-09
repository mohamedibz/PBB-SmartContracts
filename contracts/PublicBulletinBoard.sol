// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

/**
 * @title Public Bulletin Board (PBB)
 * @notice Este contrato permite la creación de tablones públicos donde los usuarios autorizados pueden publicar mensajes.
 * @dev Compatible con el patrón proxy UUPS para actualizaciones individuales.
 */
contract PublicBulletinBoard is Initializable, OwnableUpgradeable, UUPSUpgradeable, ReentrancyGuardUpgradeable {
    
    struct Message {
        uint256 id;
        address sender;
        bytes32 content;
        bytes32 topic;
        uint256 timestamp;
    }

    string public name;
    mapping(uint256 => Message) public messages;
    mapping(address => bool) public authorizedUsers;
    uint256 public nextMessageId;

    uint256 public constant MAX_BYTES = 32;

    // EVENTS

    event MessageAdded(address indexed sender, string content, string topic, uint256 timestamp);

    event UserAuthorized(address indexed owner, address indexed newUser, uint256 timestamp);

    event UserRevoked(address indexed owner, address indexed user, uint256 timestamp);

    event AdminTransferred(address indexed oldAdmin, address indexed newAdmin, uint256 timestamp);


    // ===== Inicialización del contrato =====
    function initialize(string calldata _name, address _owner, address[] calldata _authUsers) external initializer {
        __Ownable_init(_owner);
        __UUPSUpgradeable_init();
        
        name = _name;
        nextMessageId = 1;

        for (uint256 i = 0; i < _authUsers.length; i++) {
            authorizedUsers[_authUsers[i]] = true;
        }
    }


    // MODIFIERS
    modifier onlyAuthorized() {
    require(authorizedUsers[msg.sender], "No estas autorizado para realizar esta accion");
    _;
    }

    modifier notZeroAddress(address _addr) {
    require(_addr != address(0), "Direccion no puede ser la direccion cero");
    _;
    }


    // ESTO LO DEJO PARA DESPUES
    // ===== Actualización del contrato (UUPS) =====
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner notZeroAddress(newImplementation) { }


    // TRANSFERIR ADMIN
    function transferAdmin(address newAdmin) external onlyOwner notZeroAddress(newAdmin) {
        address admin = owner();
        _transferOwnership(newAdmin);
        emit AdminTransferred(admin, newAdmin, block.timestamp);

    }

    // ===== Gestión de Mensajes =====
    function addMessage(string calldata content, string calldata topic) external onlyAuthorized nonReentrant {

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

        emit MessageAdded(msg.sender, content, topic, block.timestamp);
    }

    function getMessageById(uint256 id) external view returns (Message memory) {
        require(id > 0 && id < nextMessageId, "ID de mensaje no valido");
        return messages[id];
    }

    // ===== Gestión de Usuarios Autorizados =====
    function addAuthorizedUser(address newUser) external onlyOwner {
        authorizedUsers[newUser] = true;
        emit UserAuthorized(owner(), newUser, block.timestamp);

    }

    function removeAuthorizedUser(address user) external onlyOwner {
        authorizedUsers[user] = false;
        emit UserRevoked(owner(), user, block.timestamp);
    }




    // ===== Métodos de Utilidad =====
    function version() public pure virtual returns (uint256) {
        return 1;
    }

    function _toBytes32(string memory source) internal pure returns (bytes32) {
        bytes memory tempBytes = bytes(source);
        require(tempBytes.length <= MAX_BYTES, "String demasiado largo");
        bytes32 result;
        assembly {
            result := mload(add(source, 32))
        }
        return result;
    }

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
