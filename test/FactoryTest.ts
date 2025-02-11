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
      const DEVELOPER_ROLE = ethers.id("DEVELOPER_ROLE");

      expect(await factory.hasRole(DEVELOPER_ROLE, deployer.address)).to.be.true;
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
      await expect(factory.addImplementation(1, ethers.ZeroAddress)).to.be.revertedWith("La direccion no puede ser la direccion cero");
    });
  });

  
  describe("Crear PublicBulletinBoard", function () {

    beforeEach(async function () {
      // Añadimos la implementación antes de crear el PBB
      await factory.addImplementation(1, implementation);
    });

    it("Debe crear un nuevo PBB correctamente", async function () {
      const tx = await factory.createPBB(1, "My PBB", [user1.address, user2.address]);
      await tx.wait();

      const filter = factory.filters.PBBCreated(deployer.address, undefined, undefined, undefined);

      // Obtener el número actual de bloques
      const currentBlock = await ethers.provider.getBlockNumber();

      // Consultar los eventos PBBCreated desde el bloque actual
      const events = await factory.queryFilter(filter, currentBlock);

      // Verificar que se haya emitido el evento y obtener la dirección del PBB
      expect(events.length).to.be.greaterThan(0);
      const pbbAddress = events[0].args?.pbbAddress;

      expect(pbbAddress).to.not.be.undefined;

      // Verificamos que el nuevo PBB tiene el nombre correcto
      const pbb = await ethers.getContractAt("PublicBulletinBoard", pbbAddress);

      expect(await pbb.name()).to.equal("My PBB");
      expect(await pbb.owner()).to.equal(deployer.address);
    });

    it("Debe incrementar el contador de PBBs después de cada creación", async function () {
      await factory.createPBB(1, "First PBB", [user1.address]);
      await factory.createPBB(1, "Second PBB", [user2.address]);

      expect(await factory.pbbCount()).to.equal(2);
    });

    it("Debe revertir si se intenta crear un PBB con una implementación no registrada", async function () {
      await expect(factory.createPBB(2, "Unknown Version", [user1.address])).to.be.revertedWith("Implementacion no encontrada para la version especificada");
    });

    it("Debe revertir si el nombre del PBB está vacío", async function () {
      await expect(factory.createPBB(1, "", [user1.address])).to.be.revertedWith("El nombre no puede estar vacio");
    });

  });


  describe("Eventos", function () {
    it("Debe emitir ImplementationAdded al añadir una implementación", async function () {
      await expect(factory.addImplementation(1, implementation))
        .to.emit(factory, "ImplementationAdded")
        .withArgs(1, implementation);
    });

    it("Debe emitir PBBCreated al crear un nuevo PBB", async function () {
      await factory.addImplementation(1, implementation);

      await expect(factory.createPBB(1, "My PBB", [user1.address]))
        .to.emit(factory, "PBBCreated")
        .withArgs(deployer.address, anyValue, 1, "My PBB");
    });

  });

  
});
