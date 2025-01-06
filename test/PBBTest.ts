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
      .withArgs(anyValue, "Test Board", owner.address, anyValue, anyValue);
  });
  
  it("Authorized user can add a message to the PBB", async function () {
    await proxy.createPBB(1, "Authorized Test", [accounts[0].address]);

    await expect(proxy.connect(accounts[0]).addMessageToPBB(1, "Hello, World!", "General"))
      .to.emit(proxy, "MessageAdded")
      .withArgs(1, accounts[0].address, "Hello, World!", "General", anyValue);
  });

  it("Unauthorized user cannot add messages", async function () {
    await proxy.createPBB(1, "Unauthorized Test", [accounts[0].address]);

    await expect(proxy.connect(accounts[1]).addMessageToPBB(1, "Not Allowed!", "Error"))
      .to.be.revertedWith("usuario no autorizado");
  });

  it("Admin can authorize and revoke users", async function () {
    await proxy.createPBB(1, "Manage Users Test", []);

    // Authorize a user
    await proxy.connect(owner).authorizeUser(1, accounts[0].address);

    await expect(proxy.connect(accounts[0]).addMessageToPBB(1, "Hello, World!", "General"))
    .to.emit(proxy, "MessageAdded")
    .withArgs(1, accounts[0].address, "Hello, World!", "General", anyValue);


    // Revoke the user
    await proxy.connect(owner).revokeUser(1, accounts[0].address);

    await expect(proxy.connect(accounts[0]).addMessageToPBB(1, "Not Allowed!", "Error"))
    .to.be.revertedWith("usuario no autorizado");

  });

  it("Admin can transfer ownership of the PBB", async function () {
    await proxy.createPBB(1, "Transfer Ownership Test", []);
    const pbbAddress = await proxy.pbbContracts(1);
    const PBBContract = await ethers.getContractAt("PublicBulletinBoard", pbbAddress);

    await PBBContract.connect(owner).transferAdmin(accounts[0].address);
    expect(await PBBContract.isAdmin(accounts[0].address)).to.be.true;
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
    await expect(proxy.createPBB(1, "", [])).to.be.revertedWith("Name cannot be empty");
  });

  /*
  it("Pagination works correctly for retrieving messages", async function () {
    const messages = ["First", "Second", "Third"];
    await proxy.createPBB(1, "Pagination Test", [accounts[0].address]);


    for (const msg of messages) {
      await proxy.connect(accounts[0]).addMessageToPBB(6, msg, "General");
    }

    const paginated = await proxy.connect(accounts[0]).getMessagesInRangeFromPBB(1, 0, 3);
    expect(paginated.map((m: any) => m.content)).to.deep.equal(messages);
  });
  */

  it("Ensures events are emitted for all critical actions", async function () {
    await expect(proxy.createPBB(1, "Event Test", [accounts[0].address])).to.emit(proxy, "PBBCreated");
  });

});
