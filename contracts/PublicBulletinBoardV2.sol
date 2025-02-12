// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Asegúrate de que la ruta del import sea la correcta según tu estructura de proyecto.
import "./PublicBulletinBoard.sol";

/**
 * @title Public Bulletin Board V2 – Con Comentarios
 * @notice Esta versión extiende el PublicBulletinBoard original agregando la funcionalidad de comentarios a cada mensaje.
 * @dev Se hereda de PublicBulletinBoard y se añaden nuevas variables y funciones al final del layout de storage.
 */
contract PublicBulletinBoardV2 is PublicBulletinBoard {

    // ==============================================================
    // NUEVA VARIABLE: Mapping que asocia a cada mensaje (por ID)
    // un array de comentarios (cada comentario es un string).
    // ==============================================================

    mapping(uint256 => string[]) public messageComments;

    // ==============================================================
    // NUEVO EVENTO: Se emite cuando se añade un comentario.
    // ==============================================================

    event CommentAdded(address indexed commenter, uint256 indexed messageId, string comment, uint256 timestamp);

    // ==============================================================
    // NUEVA FUNCIÓN: Añadir un comentario a un mensaje existente.
    // Solo los usuarios con rol MEMBER_ROLE pueden comentar.
    // ==============================================================

    /**
     * @notice Añade un comentario a un mensaje existente.
     * @param messageId ID del mensaje al que se añade el comentario.
     * @param comment Contenido del comentario.
     * @dev Requiere que el messageId sea válido y que el comentario no esté vacío.
     */
    function addComment(uint256 messageId, string calldata comment) external onlyRole(MEMBER_ROLE) nonReentrant {

        require(messageId > 0 && messageId < nextMessageId, "ID de mensaje no valido");
        require(bytes(comment).length > 0, "El comentario no puede estar vacio");

        // Se añade el comentario al array correspondiente a ese mensaje.
        messageComments[messageId].push(comment);

        emit CommentAdded(msg.sender, messageId, comment, block.timestamp);
    }

    // ==============================================================
    // OVERRIDE: Función version() para indicar que esta es la versión 2.
    // ==============================================================

    /**
     * @notice Devuelve la versión del contrato.
     * @return La versión actual (2).
     */
    function version() public pure override returns (uint256) {
        return 2;
    }
}
