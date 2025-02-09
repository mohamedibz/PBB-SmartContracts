import { run } from "hardhat";
import * as fs from "fs";
import chalk from "chalk"; 

// Leer las direcciones del archivo deployments.json
const deployments = JSON.parse(fs.readFileSync("./scripts/deployments.json", "utf-8"));

async function verifyContract(address: string, constructorArgs: any[] = []) {
  try {
    await run("verify:verify", {
      address,
      constructorArguments: constructorArgs,
    });
    console.log(chalk.green(`✔️  Contrato verificado correctamente: ${address}`));  
    } catch (error) {
    console.error(chalk.red(`❌  Error verificando el contrato ${address}: ${error}`));
  }
}

async function main() {
  // Verificar la fábrica
  if (deployments.factory) {
    console.log("Verificando la fábrica...");
    await verifyContract(deployments.factory);
  }

  // Verificar la implementación base del PBB
  if (deployments.pbbBase) {
    console.log("Verificando la implementación base del PBB...");
    await verifyContract(deployments.pbbBase);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
