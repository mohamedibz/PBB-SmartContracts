

import { deployFactory, deployBaseImplementation, registerImplementation, deployMainImplementation, deployProxy } from "./deployFunctions";
//import { ethers, upgrades } from 'hardhat';


async function main() {

    // DESPLEGAR LA FABRICA
    const factory = await deployFactory()
    const factoryAddress = await factory.getAddress();
    
    // DESPLEGAR LA IMPLEMENTACIÓN BASE PARA PBB
    const pbbBase = await deployBaseImplementation()
    const baseAddress = await pbbBase.getAddress();
    
    // REGISTRAR LA IMPLEMENTACIÓN EN LA FÁBRICA
    await registerImplementation(factory, 1, baseAddress)
    
    // DESPLEGAR LA IMPLEMENTACIÓN PRINCIPAL DE PBB
    const [_, implFactory] = await deployMainImplementation()
    
    // DESPLEGAR EL PROXY UUPS
    await deployProxy(factoryAddress, implFactory)

}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
