import { ethers, upgrades } from "hardhat";

// Desplegar la fábrica
export async function deployFactory() {
  const PBBFactory = await ethers.getContractFactory("PBBFactory");
  const factory = await PBBFactory.deploy();
  await factory.waitForDeployment();
  console.log("Fábrica desplegada en:", await factory.getAddress());
  return factory;
}

// Desplegar la implementación base para PBB
export async function deployBaseImplementation() {
  const PublicBulletinBoard = await ethers.getContractFactory("PublicBulletinBoard");
  const pbbBase = await PublicBulletinBoard.deploy();
  await pbbBase.waitForDeployment();
  console.log("PublicBulletinBoard desplegado en:", await pbbBase.getAddress());
  return pbbBase;
}

// Registrar implementación en la fábrica
export async function registerImplementation(factory: any, version: number, implementationAddress: string) {
  const registerTx = await factory.addImplementation(version, implementationAddress);
  await registerTx.wait();
  console.log(`PublicBulletinBoard registrado como versión ${version}`);
}

// Desplegar implementación principal de PBB
export async function deployMainImplementation() {
  const PBBImplementation = await ethers.getContractFactory("PBBImplementation");
  const pbbImplementation = await PBBImplementation.deploy();
  await pbbImplementation.waitForDeployment();
  console.log("PBBImplementation desplegado en:", await pbbImplementation.getAddress());
  return [pbbImplementation, PBBImplementation];
}

// Desplegar un proxy UUPS
export async function deployProxy(factoryAddress: string, implFactory: any) {
  //const PBBImplementation = await ethers.getContractFactory("PBBImplementation");
  const proxy = await upgrades.deployProxy(implFactory, [factoryAddress], {
    initializer: "initialize",
    kind: "uups",
  });
  await proxy.waitForDeployment();
  console.log("Proxy UUPS desplegado en:", await proxy.getAddress());
  return proxy;
}
