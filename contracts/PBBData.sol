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
    address public authorizedContract;

    constructor(address logic, address _admin, string memory _name, address[] memory _authorizedUsers) Ownable(logic) {
        name = _name;
        nextMessageId = 1;
        admin = _admin;
        // Añadir usuarios autorizados
        for (uint256 i = 0; i < _authorizedUsers.length; i++) {
            authorizedUsers[_authorizedUsers[i]] = true;
        }
    }
    
    function isAuthorized(address user) external view returns (bool) {
        return authorizedUsers[user];
    }

    function isAdmin(address user) external view returns (bool) {
        return user == admin;
    }

    // Función para agregar un mensaje, solo usuarios autorizados pueden hacerlo
    function addMessage(string calldata content) external onlyOwner {
        messages[nextMessageId] = Message({
            id: nextMessageId,
            sender: msg.sender,
            content: content,
            timestamp: block.timestamp
        });

        nextMessageId++;
    }

    // Obtener un mensaje por su ID
    function getMessageById(uint256 id) external view onlyOwner returns (Message memory) {
        require(id > 0 && id < nextMessageId, "ID de mensaje no valido");
        return messages[id];
    }

    // Función de paginación para obtener mensajes en un rango
    function getMessagesInRange(uint256 startIndex, uint256 endIndex) external view onlyOwner returns (Message[] memory) {
        require(startIndex < endIndex, "startIndex debe ser menor que endIndex");
        require(endIndex <= nextMessageId, "endIndex fuera de rango");

        Message[] memory result = new Message[](endIndex - startIndex);

        for (uint256 i = startIndex; i < endIndex; i++) {
            result[i - startIndex] = messages[i];
        }

        return result;
    }

    // Función para agregar un nuevo usuario autorizado, solo el admin puede hacerlo
    function addAuthorizedUser(address newUser) external onlyOwner {
        authorizedUsers[newUser] = true;
    }

    // Función para remover un usuario autorizado, solo el admin puede hacerlo
    function removeAuthorizedUser(address user) external onlyOwner {
        authorizedUsers[user] = false;
    }

}
