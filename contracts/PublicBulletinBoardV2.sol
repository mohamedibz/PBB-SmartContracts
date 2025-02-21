// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./PublicBulletinBoard.sol";

/**
 * @title Public Bulletin Board V2 – Optimizado
 * @notice Extiende PublicBulletinBoard agregando comentarios optimizados para cada mensaje.
 * @dev Se utiliza un mapping de mappings para mayor eficiencia en el almacenamiento y acceso a los comentarios.
 */
contract PublicBulletinBoardV2 is PublicBulletinBoard {
    
    struct Comment {
        address commenter;
        string content;
        uint256 timestamp;
    }
    
    mapping(uint256 => mapping(uint256 => Comment)) private comments;
    
    mapping(uint256 => uint256) private commentCount;

    event CommentAdded(address indexed commenter, uint256 indexed messageId, uint256 commentId, string comment, uint256 timestamp);

    /**
     * @notice Añade un comentario a un mensaje existente.
     * @param messageId ID del mensaje al que se añade el comentario.
     * @param comment Contenido del comentario.
     * @dev Requiere que el messageId sea válido y que el comentario no esté vacío.
     */
    function addComment(uint256 messageId, string calldata comment) external onlyRole(MEMBER_ROLE) nonReentrant {
        require(messageId > 0 && messageId < nextMessageId, "ID de mensaje no valido");
        require(bytes(comment).length > 0, "El comentario no puede estar vacio");

        uint256 currentCommentId = commentCount[messageId];
        
        comments[messageId][currentCommentId] = Comment({
            commenter: msg.sender,
            content: comment,
            timestamp: block.timestamp
        });

        commentCount[messageId]++; 

        emit CommentAdded(msg.sender, messageId, currentCommentId, comment, block.timestamp);
    }

    /**
     * @notice Recupera un comentario específico de un mensaje.
     * @param messageId ID del mensaje.
     * @param commentId ID del comentario.
     * @return commenter Dirección del usuario que comentó.
     * @return content Contenido del comentario.
     * @return timestamp Marca de tiempo del comentario.
     */
    function getComment(uint256 messageId, uint256 commentId) external view returns (address commenter, string memory content, uint256 timestamp) {
        require(messageId > 0 && messageId < nextMessageId, "ID de mensaje no valido");
        require(commentId < commentCount[messageId], "ID de comentario no valido");

        Comment storage comment = comments[messageId][commentId];
        return (comment.commenter, comment.content, comment.timestamp);
    }

    /**
     * @notice Devuelve el número de comentarios de un mensaje.
     * @param messageId ID del mensaje.
     * @return Número total de comentarios para el mensaje.
     */
    function getCommentCount(uint256 messageId) external view returns (uint256) {
        require(messageId > 0 && messageId < nextMessageId, "ID de mensaje no valido");
        return commentCount[messageId];
    }

    /**
     * @notice Devuelve la versión del contrato.
     * @return La versión actual (2).
     */
    function version() public pure override returns (uint256) {
        return 2;
    }

}
