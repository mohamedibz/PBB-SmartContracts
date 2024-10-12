// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";  // Importamos Ownable de OpenZeppelin
import "@openzeppelin/contracts/access/AccessControl.sol";

contract PublicBulletinBoard { 

    //bytes32 public constant WRITER_ROLE = keccak256("WRITER_ROLE");

    struct Message {
        uint256 id;
        address sender;
        string content;
        uint256 timestamp;
    }

    address admin;
    string name;
    mapping(address => bool) public authorizedUsers;
    mapping(uint256 => Message) public messages;
    uint256 public nextMessageId;

    // Evento para registrar cada nuevo mensaje
    event MessageAdded(uint256 indexed id, address indexed sender, string content, uint256 timestamp);

    
    
    constructor(string memory _name, address[] memory _authorizedUsers) {
        name = _name;
        nextMessageId = 1;
        
        // Asignamos el rol de admin al deployer
        //grantRole(DEFAULT_ADMIN_ROLE, owner);
        
        // Añadir usuarios autorizados a la lista y asignarles el rol de escritor
        for (uint256 i = 0; i < _authorizedUsers.length; i++) {
            authorizedUsers[_authorizedUsers[i]] = true;
            //grantRole(WRITER_ROLE, _authorizedUsers[i]);
        }
    }



    // Ahora solo el dueño (owner) puede agregar mensajes
    function addMessage(string calldata content) external {

        // Usamos tx.origin para verificar que el remitente original está autorizado
        //require(hasRole(WRITER_ROLE, tx.origin), "No estas autorizado para escribir");

        messages[nextMessageId] = Message({
            id: nextMessageId,
            sender: msg.sender,
            content: content,
            timestamp: block.timestamp
        });

        emit MessageAdded(nextMessageId, msg.sender, content, block.timestamp);
        nextMessageId++;
    }



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
}
