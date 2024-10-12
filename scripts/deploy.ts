import { ethers, upgrades } from 'hardhat';

async function main() {

  // DESPLEGAR LA FABRICA
  const PBBFactory = await ethers.getContractFactory("PBBFactory");
  const factory = await PBBFactory.deploy();
  await factory.waitForDeployment()
  console.log("Fabrica desplegada en: " + await factory.getAddress())


  // DESPLEGAR LA IMPLEMENTACION
  const PBBImplementation = await ethers.getContractFactory('PBBImplementation');
  const pbbImplementation = await PBBImplementation.deploy();
  await pbbImplementation.waitForDeployment();
  console.log("PBBImplementation desplegado en:", await pbbImplementation.getAddress());


  // DESPLEGAR EL PROXY
  const [owner] = await ethers.getSigners();  // Obtenemos la dirección del owner
  const proxy = await upgrades.deployProxy(PBBImplementation, [await factory.getAddress()], {
     initializer: 'initialize',
     kind: 'transparent'
    });
  await proxy.waitForDeployment();
  console.log("Proxy desplegado en:", await proxy.getAddress());
  

  // CREAR UN NUEVO PBB
  const table = await proxy.createPBB(1, 'Primera Tabla', [owner]);  // Creamos un Public Bulletin Board con ID 1
  await table.wait();
  console.log("PBB creado con ID 1");

  // AGREGAR MENSAJES
  await proxy.addMessageToPBB(1, "Mensaje 1 en PBB 1");
  await proxy.addMessageToPBB(1, "Mensaje 2 en PBB 1");
  await proxy.addMessageToPBB(1, "Mensaje 3 en PBB 1");
  console.log("Mensajes agregados al PBB 1");

  // RECUPERAR MENSAJES
  const message1 = await proxy.getMessageFromPBB(1, 1);
  const message2 = await proxy.getMessageFromPBB(1, 2);
  const message3 = await proxy.getMessageFromPBB(1, 3);

  // PROBAR LA PAGINACION
  const paginatedMessages = await proxy.getMessagesInRangeFromPBB(1, 1, 3);
  console.log("Mensajes paginados (1-3): ");
  paginatedMessages.forEach((msg: any, index: number) => {
    console.log(`Mensaje ${index + 1}: ${msg.content}`);
  });

}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
