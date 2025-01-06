import { ethers, upgrades } from "hardhat";

async function upgradeProxy(proxyAddress: string, newImplementationName: string) {
  const NewImplementation = await ethers.getContractFactory(newImplementationName);
  const upgradedProxy = await upgrades.upgradeProxy(proxyAddress, NewImplementation);
  console.log(`Proxy en ${proxyAddress} actualizado a ${newImplementationName}`);
}

async function main() {
  const proxyAddress = "DIRECCION_DEL_PROXY_AQUI";
  const newImplementationName = "PBBImplementationV2"; // Cambia según sea necesario

  await upgradeProxy(proxyAddress, newImplementationName);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
