import { expect } from "chai";
import { ethers } from "hardhat";
import { PBBFactory, PublicBulletinBoard } from "../typechain-types";

describe("Integration Test", function () {
  let factory: PBBFactory;
  let implementation: PublicBulletinBoard;
  let deployer: any, admin: any, users: any[];

  beforeEach(async function () {
    [deployer, admin, ...users] = await ethers.getSigners();

    const PBBImplFactory = await ethers.getContractFactory("PublicBulletinBoard");
    implementation = await PBBImplFactory.deploy();
    await implementation.waitForDeployment();

    const PBBFactoryContract = await ethers.getContractFactory("PBBFactory");
    factory = (await PBBFactoryContract.deploy()) as PBBFactory;
    await factory.waitForDeployment();

    await factory.addImplementation(1, await implementation.getAddress());
  });

  /******************************************************************
   *                PRUEBA MASIVA DE CREACIÓN DE PBBs              *
   ******************************************************************/
  it("should create and configure 20 PBBs with multiple users", async function () {
    for (let i = 0; i < 20; i++) {
      const tx = await factory.createPBB(1, `PBB ${i + 1}`);
      await tx.wait();

      const filter = factory.filters.PBBCreated(deployer.address, undefined, undefined, undefined);
      const events = await factory.queryFilter(filter);
      const pbbAddress = events[i].args?.pbbAddress;

      expect(pbbAddress).to.not.be.undefined;

      const pbb = await ethers.getContractAt("PublicBulletinBoard", pbbAddress);

      // Configurar 5 usuarios diferentes para cada PBB
      const selectedUsers = users.sort(() => 0.5 - Math.random()).slice(0, 5);
      const addresses = selectedUsers.map(user => user.address);

      if (addresses.length === 0) {
        throw new Error("El array de direcciones está vacío. Verifica los datos.");
      }

      const tx2 = await pbb.addMembers(addresses);
      await tx2.wait();

      // Verificar que cada usuario tenga el rol de miembro
      for (const user of selectedUsers) {
        expect(await pbb.hasRole(await pbb.MEMBER_ROLE(), user.address)).to.be.true;
      }
    }

    expect(await factory.pbbCount()).to.equal(20);
  });

  /******************************************************************
   *               PRUEBA DE CARGA MASIVA DE MENSAJES              *
   ******************************************************************/
  it("should handle 1000 messages in a single PBB", async function () {
    const tx = await factory.createPBB(1, "High Load PBB");
    await tx.wait();

    const filter = factory.filters.PBBCreated(deployer.address, undefined, undefined, undefined);
    const events = await factory.queryFilter(filter);
    const pbbAddress = events[0].args?.pbbAddress;

    const pbb = await ethers.getContractAt("PublicBulletinBoard", pbbAddress);

    await pbb.addMember(users[0].address);
    const user = users[0];

    for (let i = 1; i <= 1000; i++) {
      await pbb.connect(user).addMessage(`Message ${i}`, "General");
    }

    expect(await pbb.nextMessageId()).to.equal(1001);
  });

  /******************************************************************
   *        PRUEBA DE TRANSACCIONES CONCURRENTES                   *
   ******************************************************************/
  it("should maintain consistent state with parallel transactions", async function () {
    const tx = await factory.createPBB(1, "Concurrent PBB");
    await tx.wait();

    const filter = factory.filters.PBBCreated(deployer.address, undefined, undefined, undefined);
    const events = await factory.queryFilter(filter);
    const pbbAddress = events[0].args?.pbbAddress;

    const pbb = await ethers.getContractAt("PublicBulletinBoard", pbbAddress);

    await pbb.addMember(users[0].address);
    const user = users[0];

    // Simular 10 transacciones simultáneas
    const promises = [];
    for (let i = 1; i <= 10; i++) {
      promises.push(pbb.connect(user).addMessage(`Concurrent Message ${i}`, "General"));
    }
    await Promise.all(promises);

    expect(await pbb.nextMessageId()).to.equal(11);
  });

  /******************************************************************
   *                PRUEBA DE EMISIÓN DE EVENTOS                   *
   ******************************************************************/
  it("should emit all expected events during PBB operations", async function () {
    await factory.createPBB(1, "Event Test PBB");
    const filter = factory.filters.PBBCreated(deployer.address, undefined, undefined, undefined);
    const events = await factory.queryFilter(filter);

    expect(events.length).to.equal(1);
    expect(events[0].args?.name).to.equal("Event Test PBB");
  });
});
