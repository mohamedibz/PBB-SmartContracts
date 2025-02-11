import { ethers, network } from "hardhat";
import { Wallet, ContractFactory, Contract } from "ethers";
import * as fs from "fs";
import * as dotenv from "dotenv";


async function main2() {
  const currentNetwork = network.name;
  console.log(`Connecting to network: ${currentNetwork}`);

  // Configurar la wallet con tu clave privada y el proveedor Alchemy
  const provider = new ethers.JsonRpcProvider(process.env.ALCHEMY_RPC_URL);
  const wallet = new Wallet('b33a5dd07abcba41f7f7f500b1090eefc6d72f59be5e24018b0956be3c146a25', provider);

  console.log(`Wallet address: ${wallet.address}`);

  // Leer las direcciones del archivo deployments.json
  const deployments = JSON.parse(fs.readFileSync("./scripts/deployments.json", "utf-8"));
  const factoryAddress = deployments.factory;

  console.log(`Factory address: ${factoryAddress}`);

  // Conectar al contrato PBBFactory usando la wallet
  const PBBFactory = await ethers.getContractFactory("PBBFactory", wallet);

  const factory = PBBFactory.attach(factoryAddress) as Contract & { createPBB: (arg1: number, arg2: string, arg3: string, arg4: string[]) => Promise<any> };

  // Crear un nuevo PBB
  const tx = await factory.createPBB(
    1,
    wallet.address, // La dirección del admin será la misma que la de la wallet
    "Test PBB",
    [wallet.address, '0x96830aa725883ee6f78ea6fd0aef561f51ad7d00'] // Lista de usuarios, solo tú mismo en este caso
  );

  console.log("Transaction sent:", tx.hash);

  // Esperar a que la transacción se confirme
  const receipt = await tx.wait();
  console.log("Transaction confirmed:", receipt.transactionHash);
  console.log("PBB created!");
}



main2().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
