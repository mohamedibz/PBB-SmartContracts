import * as fs from "fs";
import { deployFactory, deployBaseImplementation, registerImplementation } from "./deployFunctions";

// Definimos una interfaz para las direcciones desplegadas
interface Deployments {
  factory: string;
  pbbBase: string;
}

// Función para leer y actualizar el archivo deployments.json
function updateDeploymentsFile(newDeployments: Deployments) {
  const filePath = "./scripts/deployments.json";

  let existingDeployments: Deployments = { factory: "", pbbBase: "" };

  // Si el archivo no existe, crearlo vacío
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(existingDeployments, null, 2));
    console.log(`Archivo ${filePath} creado.`);
  }

  // Leer el archivo existente
  existingDeployments = JSON.parse(fs.readFileSync(filePath, "utf-8")) as Deployments;

  // Actualizar las direcciones
  const updatedDeployments = { ...existingDeployments, ...newDeployments };
  fs.writeFileSync(filePath, JSON.stringify(updatedDeployments, null, 2));

  console.log("Direcciones actualizadas en deployments.json:", updatedDeployments);
}

async function main() {
  // DESPLEGAR LA FÁBRICA
  const factory = await deployFactory();
  const factoryAddress = await factory.getAddress();

  // DESPLEGAR LA IMPLEMENTACIÓN BASE PARA PBB
  const pbbBase = await deployBaseImplementation();
  const baseAddress = await pbbBase.getAddress();

  // REGISTRAR LA IMPLEMENTACIÓN EN LA FÁBRICA
  await registerImplementation(factory, 1, baseAddress);

  // Actualizar el archivo deployments.json con las nuevas direcciones
  updateDeploymentsFile({ factory: factoryAddress, pbbBase: baseAddress });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
