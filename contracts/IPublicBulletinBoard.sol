// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/introspection/IERC165.sol";

/**
 * @title IPublicBulletinBoard
 * @notice Interfaz estándar para garantizar compatibilidad en actualizaciones de PublicBulletinBoard.
 */
interface IPublicBulletinBoard is IERC165 {

    // ===== Estructuras y constantes =====

    struct Message {
        uint256 id;
        address sender;
        bytes32 content;
        bytes32 topic;
        uint256 timestamp;
    }

    // ===== Eventos =====

    event MessageAdded(address indexed sender, string content, string topic, uint256 timestamp);
    event AdminAdded(address indexed admin, address indexed newAdmin, uint256 timestamp);
    event AdminRevoked(address indexed admin, address indexed revokedAdmin, uint256 timestamp);
    event MemberAdded(address indexed admin, address indexed newMember, uint256 timestamp);
    event MemberRemoved(address indexed admin, address indexed revokedMember, uint256 timestamp);

    // ===== Métodos de Gestión de Mensajes =====
    
    function addMessage(string calldata content, string calldata topic) external;
    function getMessageById(uint256 id) external view returns (Message memory);
    
    // ===== Métodos de Control de Accesos =====

    function addMember(address newMember) external;
    function removeMember(address member) external;
    function addAdmin(address newAdmin) external;
    function removeAdmin(address admin) external;

    // ===== Métodos de Utilidad =====
    
    function version() external pure returns (uint256);
}
