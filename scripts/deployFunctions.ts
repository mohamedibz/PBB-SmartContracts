import chalk from "chalk";

const { ethers, upgrades } = require("hardhat");

// Desplegar la fábrica
export async function deployFactory() {
  const PBBFactory = await ethers.getContractFactory("PBBFactory");
  const factory = await PBBFactory.deploy();
  await factory.waitForDeployment();
  console.log(chalk.green(" ✔️ Fábrica desplegada en:", await factory.getAddress()));
  return factory;
}

// Desplegar la implementación base para PBB
export async function deployBaseImplementation() {
  const PublicBulletinBoard = await ethers.getContractFactory("PublicBulletinBoard");
  const pbbBase = await PublicBulletinBoard.deploy();
  await pbbBase.waitForDeployment();
  console.log(chalk.green(" ✔️ PublicBulletinBoard desplegado en:", await pbbBase.getAddress()));
  return pbbBase;
}

// Desplegar la implementación base para PBB
export async function deployBaseV2Implementation() {
  const PublicBulletinBoardV2 = await ethers.getContractFactory("PublicBulletinBoardV2");
  const pbbBaseV2 = await PublicBulletinBoardV2.deploy();
  await pbbBaseV2.waitForDeployment();
  console.log(chalk.green(" ✔️ PublicBulletinBoardV2 desplegado en:", await pbbBaseV2.getAddress()));
  return pbbBaseV2;
}

// Registrar implementación en la fábrica
export async function registerImplementation(factory: any, version: number, implementationAddress: string) {
  const registerTx = await factory.addImplementation(version, implementationAddress);
  await registerTx.wait();
  console.log(chalk.green(` ✔️ PublicBulletinBoard registrado como versión ${version}`));
}


