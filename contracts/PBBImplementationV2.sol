// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./PBBImplementation.sol";

/**
 * @title PBB Implementation V2
 * @notice Extiende la funcionalidad de la implementación anterior.
 * @dev Este contrato añade nuevas características manteniendo compatibilidad con el estado anterior.
 */
contract PBBImplementationV2 is PBBImplementation {

    // Nueva variable de estado para demostrar la actualización
    string public newFeature;

    /**
     * @notice Inicializa la nueva funcionalidad introducida en esta versión.
     * @dev Debe ser llamada manualmente después de la actualización del proxy.
     */
    function initializeV2() external {
        require(bytes(newFeature).length == 0, "Already initialized");
        newFeature = "Nueva funcionalidad inicializada";
    }

    /**
     * @notice Devuelve un mensaje indicando que la nueva funcionalidad está activa.
     * @return Un string indicando el estado de la nueva funcionalidad.
     */
    function newFunctionality() external pure returns (string memory) {
        return "Nueva funcionalidad activa";
    }

}
