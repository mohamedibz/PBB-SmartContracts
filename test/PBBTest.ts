import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import {
  deployFactory,
  deployBaseImplementation,
  registerImplementation,
  deployMainImplementation,
  deployProxy,
} from "../scripts/deployFunctions";

describe("Public Bulletin Board Comprehensive Tests", function () {
  let owner: any;
  let admin: any;
  let accounts: any[];
  let factory: any;
  let pbbBase: any;
  let mainImplementation: any;
  let proxy: any;

  before(async function () {
    // Obtener las cuentas
    [owner, admin, ...accounts] = await ethers.getSigners();

    // Desplegar la fábrica
    factory = await deployFactory();

    // Desplegar la implementación base para PBB
    pbbBase = await deployBaseImplementation();

    // Registrar la implementación base en la fábrica
    await registerImplementation(factory, 1, await pbbBase.getAddress());

    // Desplegar la implementación principal de PBB
    const [_, implFactory] = await deployMainImplementation()

    // Desplegar el proxy UUPS
    proxy = await deployProxy(await factory.getAddress(), implFactory);

    console.log("Setup completo.");
  });

  it("Admin can create a PBB successfully", async function () {
    const tx = await proxy.createPBB(1, "Test Board", [accounts[0].address]);
    await expect(tx)
      .to.emit(proxy, "PBBCreated")
      .withArgs(1, "Test Board", owner.address, anyValue, anyValue);
  });
  
  it("Authorized user can add a message to the PBB", async function () {
    await proxy.createPBB(1, "Authorized Test", [accounts[0].address]);

    await expect(proxy.connect(accounts[0]).addMessageToPBB(2, "Hello, World!", "General"))
      .to.emit(proxy, "MessageAdded")
      .withArgs(2, accounts[0].address, "Hello, World!", "General", anyValue);
  });

  it("Unauthorized user cannot add messages", async function () {
    await proxy.createPBB(1, "Unauthorized Test", [accounts[0].address]);

    await expect(proxy.connect(accounts[1]).addMessageToPBB(3, "Not Allowed!", "Error"))
      .to.be.revertedWith("usuario no autorizado");
  });

  it("Admin can authorize and revoke users", async function () {
    await proxy.createPBB(1, "Manage Users Test", [accounts[5]]);

    // Authorize a user
    await proxy.connect(owner).authorizeUser(4, accounts[0]);
    await expect(proxy.connect(accounts[0]).addMessageToPBB(4, "Hello, World!", "General"))
    .to.emit(proxy, "MessageAdded")
    .withArgs(4, accounts[0].address, "Hello, World!", "General", anyValue);

    // Revoke the user
    await proxy.connect(owner).revokeUser(4, accounts[0].address);
    await expect(proxy.connect(accounts[0]).addMessageToPBB(4, "Not Allowed!", "Error"))
    .to.be.revertedWith("usuario no autorizado");
  });

  it("Admin can transfer ownership of the PBB", async function () {
    await proxy.createPBB(1, "Transfer Ownership Test", [owner]);

    await proxy.connect(owner).authorizeUser(5, accounts[6])
    await expect(proxy.connect(accounts[6]).addMessageToPBB(5, "Hello, World!", "General")).to.emit(proxy, "MessageAdded")

    await proxy.connect(owner).transferAdminOfPBB(5, accounts[0]);
    
    await proxy.connect(accounts[0]).authorizeUser(5, accounts[6])
    await expect(proxy.connect(accounts[6]).addMessageToPBB(5, "Hello, World!", "General")).to.emit(proxy, "MessageAdded")

    //expect(await proxy.isAdmin(accounts[0].address)).to.be.true;
  });

  it("Proxy upgrade maintains state and functionality", async function () {
    // Deploy new implementation
    const NewImplementation = await ethers.getContractFactory("PBBImplementationV2");
    const newImpl = await NewImplementation.deploy();
    await newImpl.waitForDeployment();

    // Upgrade proxy
    await upgrades.upgradeProxy(proxy, NewImplementation);

    // Create a new instance of the upgraded proxy
    const upgradedProxy = await ethers.getContractAt("PBBImplementationV2", proxy);

    // Ensure the old state persists
    const oldState = await upgradedProxy.pbbCounter();
    expect(oldState).to.equal(6);

    // Use new functionality
    const result = await upgradedProxy.newFunctionality();
    expect(result).to.equal("Nueva funcionalidad activa");
  });

  it("PBB prevents invalid actions and handles errors", async function () {

    await expect(proxy.createPBB(1, "Tabla", ['0x0000000000000000000000000000000000000000'])).to.be.revertedWith("Invalid user address");
    await expect(proxy.createPBB(1, "Tabla", [])).to.be.revertedWith("Must provide at least one authorized user");
    await expect(proxy.createPBB(3, "Tabla", [accounts[0]])).to.be.revertedWith("Implementation not found for version");
    await expect(proxy.createPBB(1, "", [accounts[0]])).to.be.revertedWith("Name cannot be empty");
  });

  it("Ensures events are emitted for all critical actions", async function () {
    await expect(proxy.createPBB(1, "Event Test", [accounts[0].address])).to.emit(proxy, "PBBCreated");
  });

  it("Admin can upgrade a PBB implementation and maintain state", async function () {

    // Desplegar una nueva implementación de PublicBulletinBoard
    const NewPBBImplementation = await ethers.getContractFactory("PublicBulletinBoardV2");
    const newPBBImpl = await NewPBBImplementation.deploy();
    await newPBBImpl.waitForDeployment();

    // Crear un nuevo PBB
    const tx = await proxy.createPBB(1, "Upgradeable Board", [accounts[0]]);
    const receipt = await tx.wait();

    // Interactuar con el PBB antes de actualizar
    await proxy.connect(accounts[0]).addMessageToPBB(6, "Pre-upgrade message", "General");

    const preUpgradeMessage = await proxy.getMessageFromPBB(6, 1);
    expect(preUpgradeMessage.content).to.equal(ethers.encodeBytes32String("Pre-upgrade message"));

    // Actualizar la implementación del PBB
    await proxy.upgradePBBImplementation(6, await newPBBImpl.getAddress(), '0x');

    // Verificar que la implementación ha cambiado y que se puede interactuar con nuevas funcionalidades

    // Verificar el estado previo
    const messageAfterUpgrade = await proxy.getMessageFromPBB(6, 1);
    expect(messageAfterUpgrade.content).to.equal(ethers.encodeBytes32String("Pre-upgrade message"));

    // Usar la nueva funcionalidad de la versión actualizada
    await proxy.updateDescriptionToPBB(6, 'Hola Mundo')
    const description = await proxy.getDescriptionFromPBB(6);
    expect(description).to.equal("Hola Mundo");

    // Verificar que el estado posterior es coherente
    await proxy.connect(accounts[0]).addMessageToPBB(6, "Post-upgrade message", "Update Test");
    const postUpgradeMessage = await proxy.getMessageFromPBB(6, 2);
    expect(postUpgradeMessage.content).to.equal(ethers.encodeBytes32String("Post-upgrade message"));

  });

});
