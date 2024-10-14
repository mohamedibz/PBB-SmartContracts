// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";  // Para manejar el owner de forma sencilla

contract PublicBulletinBoard is Ownable {

    struct Message {
        uint256 id;
        address sender;
        string content;
        uint256 timestamp;
    }

    address admin;
    string public name;
    mapping(uint256 => Message) public messages;
    mapping(address => bool) public authorizedUsers;
    uint256 public nextMessageId;

    // Evento para registrar cada nuevo mensaje
    event MessageAdded(uint256 indexed id, address indexed sender, string content, uint256 timestamp);

    constructor(address _admin, string memory _name, address[] memory _authorizedUsers) Ownable(_admin) {
        admin = _admin;
        name = _name;
        nextMessageId = 1;

        // Añadir usuarios autorizados
        for (uint256 i = 0; i < _authorizedUsers.length; i++) {
            authorizedUsers[_authorizedUsers[i]] = true;
        }

        // Hacemos que el admin también esté autorizado por defecto
        authorizedUsers[admin] = true;
    }

    // Modificador para permitir solo al admin
    modifier onlyAdmin() {
        require(tx.origin == admin, "Solo el administrador puede realizar esta accion");
        _;
    }

    // Modificador para permitir solo usuarios autorizados
    modifier onlyAuthorized() {
        require(authorizedUsers[tx.origin], "No tienes permiso para realizar esta accion");
        _;
    }

    // Función para agregar un mensaje, solo usuarios autorizados pueden hacerlo
    function addMessage(string calldata content) external onlyAuthorized {
        messages[nextMessageId] = Message({
            id: nextMessageId,
            sender: msg.sender,
            content: content,
            timestamp: block.timestamp
        });

        emit MessageAdded(nextMessageId, msg.sender, content, block.timestamp);
        nextMessageId++;
    }

    // Obtener un mensaje por su ID
    function getMessageById(uint256 id) external view returns (Message memory) {
        require(id > 0 && id < nextMessageId, "ID de mensaje no valido");
        return messages[id];
    }

    // Función de paginación para obtener mensajes en un rango
    function getMessagesInRange(uint256 startIndex, uint256 endIndex) external view returns (Message[] memory) {
        require(startIndex < endIndex, "startIndex debe ser menor que endIndex");
        require(endIndex <= nextMessageId, "endIndex fuera de rango");

        Message[] memory result = new Message[](endIndex - startIndex);

        for (uint256 i = startIndex; i < endIndex; i++) {
            result[i - startIndex] = messages[i];
        }

        return result;
    }

    // Función para agregar un nuevo usuario autorizado, solo el admin puede hacerlo
    function addAuthorizedUser(address newUser) external onlyAdmin {
        authorizedUsers[newUser] = true;
    }

    // Función para remover un usuario autorizado, solo el admin puede hacerlo
    function removeAuthorizedUser(address user) external onlyAdmin {
        authorizedUsers[user] = false;
    }

    // Cambiar al administrador, solo el actual administrador puede hacerlo
    function changeAdmin(address newAdmin) external onlyAdmin {
        admin = newAdmin;
    }
}
