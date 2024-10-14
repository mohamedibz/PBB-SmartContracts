// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./PBBFactory.sol";
import "./PBBData.sol";

contract PBBImplementation is Initializable {
    
    PBBFactory public factory;
    mapping(uint256 => address) public pbbContracts;
    uint256 pbbCounter;

    event PBBCreated(uint256 indexed id, address pbbAddress);
    event MessageAdded(uint256 indexed pbbId, string content);

    // Inicialización del contrato
    function initialize(address _factory) initializer public {
        factory = PBBFactory(_factory);
        pbbCounter = 0;
    }

    // Crear un nuevo PBB
    function createPBB(string memory name, address[] memory authUsers) external {
        address pbbAddress = factory.createPBB(msg.sender, name, authUsers);
        pbbContracts[pbbCounter] = pbbAddress;
        emit PBBCreated(pbbCounter, pbbAddress);
        pbbCounter++;
    }

    // Agregar un mensaje a un PBB
    function addMessageToPBB(uint256 pbbId, string calldata content) external {
        address pbbAddress = pbbContracts[pbbId];
        require(pbbAddress != address(0), "PBB no existe");
        
        // Llamamos a la función de agregar mensaje en el contrato PBB específico
        PublicBulletinBoard(pbbAddress).addMessage(content);

        // Emitimos el evento indicando que se ha agregado un mensaje
        emit MessageAdded(pbbId, content);
    }

    // Obtener un mensaje por ID de un PBB específico
    function getMessageFromPBB(uint256 pbbId, uint256 messageId) external view returns (PublicBulletinBoard.Message memory) {
        address pbbAddress = pbbContracts[pbbId];
        require(pbbAddress != address(0), "PBB no existe");

        // Recuperamos el mensaje desde el contrato PBB
        return PublicBulletinBoard(pbbAddress).getMessageById(messageId);
    }

    // Obtener mensajes paginados desde un PBB específico
    function getMessagesInRangeFromPBB(uint256 pbbId, uint256 startIndex, uint256 endIndex) external view returns (PublicBulletinBoard.Message[] memory) {
        address pbbAddress = pbbContracts[pbbId];
        require(pbbAddress != address(0), "PBB no existe");

        // Recuperamos los mensajes paginados desde el contrato PBB
        return PublicBulletinBoard(pbbAddress).getMessagesInRange(startIndex, endIndex);
    }
}
