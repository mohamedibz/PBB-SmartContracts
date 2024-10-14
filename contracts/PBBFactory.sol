// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./PBBData.sol";

contract PBBFactory {

    event PBBDeployed(address indexed creator, address pbbAddress);

    // Función para crear una nueva instancia de PublicBulletinBoard
    function createPBB(address owner, string memory name, address[] memory authUsers) external returns (address) {
        // Creamos una nueva instancia del contrato PublicBulletinBoard
        PublicBulletinBoard newPBB = new PublicBulletinBoard(owner, name, authUsers);

        // Emitimos un evento que indica que se ha desplegado un nuevo PBB
        emit PBBDeployed(owner, address(newPBB));

        // Devolvemos la dirección del nuevo PBB
        return address(newPBB);
    }
}
