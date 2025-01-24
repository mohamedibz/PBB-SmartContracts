// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./PublicBulletinBoard.sol";

/**
 * @title Public Bulletin Board V2 (PBBV2)
 * @notice Extensión del contrato original PublicBulletinBoard con soporte para una descripción del tablón.
 */
contract PublicBulletinBoardV2 is PublicBulletinBoard {
    // Nueva variable que permite almacenar la descripción del tablón
    string public description;

    // Evento para registrar cambios en la descripción
    event DescriptionUpdated(string oldDescription, string newDescription);

    /**
     * @notice Inicializa la nueva funcionalidad de la versión 2.
     * @dev Se usa para añadir una descripción al tablón.
     * @param _description La descripción inicial del tablón.
     */
    function initializeV2(string calldata _description) external onlyOwner {
        description = _description;
    }

    /**
     * @notice Actualiza la descripción del tablón.
     * @param newDescription La nueva descripción del tablón.
     */
    function updateDescription(string calldata newDescription) external onlyOwner {
        string memory oldDescription = description;
        description = newDescription;
        emit DescriptionUpdated(oldDescription, newDescription);
    }

    /**
     * @notice Sobrescribe la función `version` para reflejar la nueva versión del contrato.
     * @return La versión actual del contrato.
     */
    function version() public pure override returns (uint256) {
        return 2;
    }
}
