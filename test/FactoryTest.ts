const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
import { PBBFactory, PublicBulletinBoard } from "../typechain-types";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";


describe("PBBFactory - Pruebas Integrales", function () {
  let factory: PBBFactory;
  let implementation: PublicBulletinBoard;
  let deployer: any, owner: any, admin: any, user1: any, user2: any;

  beforeEach(async function () {
    [deployer, owner, admin, user1, user2] = await ethers.getSigners();

    // Desplegamos la implementación del PublicBulletinBoard
    const PBBImplFactory = await ethers.getContractFactory("PublicBulletinBoard");
    implementation = await PBBImplFactory.deploy();
    await implementation.waitForDeployment();

    // Desplegamos el contrato PBBFactory
    const PBBFactoryContract = await ethers.getContractFactory("PBBFactory");
    factory = (await PBBFactoryContract.deploy()) as PBBFactory;
    await factory.waitForDeployment();
  });

  describe("Inicialización", function () {
    it("Debe desplegar correctamente el contrato PBBFactory", async function () {
      expect(await factory.owner()).to.equal(deployer.address);
    });
  });

  describe("Añadir Implementación", function () {
    it("Debe permitir al owner añadir una nueva implementación", async function () {
      await expect(factory.addImplementation(1, implementation))
        .to.emit(factory, "ImplementationAdded")
        .withArgs(1, implementation);

      expect(await factory.implementations(1)).to.equal(implementation);
    });

    it("Debe revertir si la implementación ya existe para esa versión", async function () {
      await factory.addImplementation(1, implementation);
      await expect(factory.addImplementation(1, implementation)).to.be.revertedWith("La version ya existe");
    });

    it("Debe revertir si la implementación es la dirección cero", async function () {
      await expect(factory.addImplementation(1, ethers.ZeroAddress)).to.be.revertedWith("Direccion no puede ser la direccion cero");
    });
  });

  /*
  describe("Crear PublicBulletinBoard", function () {
    beforeEach(async function () {
      // Añadimos la implementación antes de crear el PBB
      await factory.addImplementation(1, implementation);
    });

    it("Debe crear un nuevo PBB correctamente", async function () {
      const tx = await factory.createPBB(1, admin.address, "My PBB", [user1.address, user2.address]);
      const receipt = await tx.wait();

      const event = receipt.events?.find(e => e.event === "PBBCreated");
      const pbbAddress = event?.args?.pbbAddress;

      expect(pbbAddress).to.not.be.undefined;

      // Verificamos que el nuevo PBB tiene el nombre correcto
      const pbb = await ethers.getContractAt("PublicBulletinBoard", pbbAddress);
      expect(await pbb.name()).to.equal("My PBB");
      expect(await pbb.owner()).to.equal(admin.address);
    });


    it("Debe incrementar el contador de PBBs después de cada creación", async function () {
      await factory.createPBB(1, admin.address, "First PBB", [user1.address]);
      await factory.createPBB(1, admin.address, "Second PBB", [user2.address]);

      expect(await factory.pbbCount()).to.equal(2);
    });

    it("Debe revertir si se intenta crear un PBB con una implementación no registrada", async function () {
      await expect(factory.createPBB(2, admin.address, "Unknown Version", [user1.address])).to.be.revertedWith("Implementation not found for version");
    });

    it("Debe revertir si el nombre del PBB está vacío", async function () {
      await expect(factory.createPBB(1, admin.address, "", [user1.address])).to.be.revertedWith("El nombre no puede estar vacio");
    });

    it("Debe revertir si la dirección del admin es la dirección cero", async function () {
      await expect(factory.createPBB(1, ethers.ZeroAddress, "Invalid PBB", [user1.address])).to.be.revertedWith("Direccion no puede ser la direccion cero");
    });
  });
*/
  describe("Eventos", function () {
    it("Debe emitir ImplementationAdded al añadir una implementación", async function () {
      await expect(factory.addImplementation(1, implementation))
        .to.emit(factory, "ImplementationAdded")
        .withArgs(1, implementation);
    });

    it("Debe emitir PBBCreated al crear un nuevo PBB", async function () {
      await factory.addImplementation(1, implementation);

      await expect(factory.createPBB(1, admin.address, "My PBB", [user1.address]))
        .to.emit(factory, "PBBCreated")
        .withArgs(deployer.address, anyValue, 1, "My PBB");
    });
  });
});
