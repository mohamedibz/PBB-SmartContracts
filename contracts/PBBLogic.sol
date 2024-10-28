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

    event PBBCreated(uint256 indexed pbbId, string name, address indexed creator, address pbbAddress, uint256 timestamp);
    event MessageAdded(uint256 indexed pbbId, address indexed sender, string content, uint256 timestamp);

    event UserAuthorized(uint256 indexed pbbId, address indexed admin, address indexed newUser, uint256 timestamp);
    event UserRevoked(uint256 indexed pbbId, address indexed admin, address indexed user, uint256 timestamp);


    // Inicialización del contrato
    function initialize(address _factory) initializer public {
        factory = PBBFactory(_factory);
        pbbCounter = 1;
    }

    // Crear un nuevo PBB
    function createPBB(string memory name, address[] memory authUsers) external {
        address pbbAddress = factory.createPBB(msg.sender, name, authUsers);
        pbbContracts[pbbCounter] = pbbAddress;
        
        emit PBBCreated(pbbCounter, name, msg.sender, pbbAddress, block.timestamp);
        
        for (uint256 i = 0; i < authUsers.length; i++) {
            emit UserAuthorized(pbbCounter, msg.sender, authUsers[i], block.timestamp);
        }
        pbbCounter++;
    }

    // Agregar un mensaje a un PBB
    function addMessageToPBB(uint256 pbbId, string calldata content) external {
        address pbbAddress = pbbContracts[pbbId];
        require(pbbAddress != address(0), "PBB no existe");

        PublicBulletinBoard pbb = PublicBulletinBoard(pbbAddress);
        require(pbb.isAuthorized(msg.sender), "Usuario no autorizado");
        
        pbb.addMessage(content);
        emit MessageAdded(pbbId, msg.sender, content, block.timestamp);
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

    function authorizeUser(uint256 pbbId, address user) external {
        address pbbAddress = pbbContracts[pbbId];
        require(pbbAddress != address(0), "La direccion no existe");

        PublicBulletinBoard pbb = PublicBulletinBoard(pbbAddress);
        require(pbb.isAdmin(msg.sender), "Usuario no es administrador");
        pbb.addAuthorizedUser(user);
        emit UserAuthorized(pbbId, msg.sender, user, block.timestamp);
    }

    function revokeUser(uint256 pbbId, address user) external {
        address pbbAddress = pbbContracts[pbbId];
        require(pbbAddress != address(0), "Usuario no es administrador");

        PublicBulletinBoard pbb = PublicBulletinBoard(pbbAddress);
        require(pbb.isAdmin(msg.sender), "Usuario no es administrador");
        pbb.removeAuthorizedUser(user);
        emit UserRevoked(pbbId, msg.sender, user, block.timestamp);
    }

}
