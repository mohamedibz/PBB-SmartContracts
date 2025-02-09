// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./PublicBulletinBoard.sol";

/**
 * @title PublicBulletinBoardV2
 * @notice Versión actualizada del contrato que extiende la funcionalidad del original.
 */
contract PublicBulletinBoardV2 is PublicBulletinBoard {
    /**
     * @notice Retorna la versión actualizada.
     */
    function version() public pure override returns (uint256) {
        return 2;
    }
    
    // Puedes agregar nuevas funciones o cambios en la lógica aquí.
}
