import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { PBBFactory, PublicBulletinBoard, PublicBulletinBoardV2 } from "../typechain-types";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";

/******************************************************************
 *                PRUEBAS DE PBBFactory - INICIALIZACIÓN          *
 ******************************************************************/
describe("PBBFactory", function () {
  let factory: PBBFactory;
  let implementation: PublicBulletinBoard;
  let newImplementation: PublicBulletinBoardV2;
  let deployer: any, owner: any, admin: any, user1: any, user2: any;

    beforeEach(async function () {
        [deployer, owner, admin, user1, user2] = await ethers.getSigners();

        const PBBImplFactory = await ethers.getContractFactory("PublicBulletinBoard");
        implementation = await PBBImplFactory.deploy();
        await implementation.waitForDeployment();

        const PBBImplFactory2 = await ethers.getContractFactory("PublicBulletinBoardV2");
        newImplementation = await PBBImplFactory2.deploy();
        await newImplementation.waitForDeployment();

        const PBBFactoryContract = await ethers.getContractFactory("PBBFactory");
        factory = (await PBBFactoryContract.deploy()) as PBBFactory;
        await factory.waitForDeployment();
    });

    describe("Initialization", function () {
        it("should deploy with correct roles assigned", async function () {
        const DEVELOPER_ROLE = ethers.id("DEVELOPER_ROLE");
        const DEFAULT_ADMIN_ROLE = await factory.DEFAULT_ADMIN_ROLE();

        expect(await factory.hasRole(DEVELOPER_ROLE, deployer.address)).to.be.true;
        expect(await factory.hasRole(DEFAULT_ADMIN_ROLE, deployer.address)).to.be.true;
        });
    });

    /******************************************************************
     *         PRUEBAS DE GESTIÓN DE IMPLEMENTACIONES                *
     ******************************************************************/
    describe("Implementation Management", function () {
        it("should allow adding a new implementation by developer", async function () {
        await expect(factory.addImplementation(1, await implementation.getAddress()))
            .to.emit(factory, "ImplementationAdded")
            .withArgs(await implementation.getAddress(), 1);

        expect(await factory.implementations(1)).to.equal(await implementation.getAddress());
        });

        it("should revert when adding an implementation for an existing version", async function () {
        await factory.addImplementation(1, await implementation.getAddress());
        await expect(factory.addImplementation(1, await implementation.getAddress()))
            .to.be.revertedWith("La version ya existe");
        });

        it("should revert when adding implementation with zero address", async function () {
        await expect(factory.addImplementation(1, ethers.ZeroAddress))
            .to.be.revertedWith("La direccion no puede ser la direccion cero");
        });
    });

    /******************************************************************
     *                PRUEBAS DE CREACIÓN Y CONFIGURACIÓN DE PBBs    *
     ******************************************************************/
    describe("PBB Creation and Configuration", function () {
        beforeEach(async function () {
        await factory.addImplementation(1, await implementation.getAddress());
        });

        it("should create a new PBB and then configure users", async function () {
        const tx = await factory.createPBB(1, "Test PBB");
        await tx.wait();

        // Recuperamos la dirección del evento emitido
        const filter = factory.filters.PBBCreated(deployer.address, undefined, undefined, undefined);
        const events = await factory.queryFilter(filter);
        const pbbAddress = events[0].args?.pbbAddress;

        expect(pbbAddress).to.not.be.undefined;

        // Verificamos que el PBB tiene el nombre correcto
        const pbb = await ethers.getContractAt("PublicBulletinBoard", pbbAddress);
        expect(await pbb.name()).to.equal("Test PBB");

        // Configuración de miembros después de la creación
        const tx2 = await pbb.addMembers([await user1.getAddress(), await user2.getAddress()]);

        await tx2.wait();

        expect(await pbb.hasRole(await pbb.MEMBER_ROLE(), user1.address)).to.be.true;
        expect(await pbb.hasRole(await pbb.MEMBER_ROLE(), user2.address)).to.be.true;
        });

        it("should handle multiple PBB creations and configurations", async function () {
        for (let i = 1; i <= 3; i++) {
            const tx = await factory.createPBB(1, `PBB ${i}`);
            await tx.wait();

            const filter = factory.filters.PBBCreated(deployer.address, undefined, undefined, undefined);
            const events = await factory.queryFilter(filter);
            const pbbAddress = events[i - 1].args?.pbbAddress;

            expect(pbbAddress).to.not.be.undefined;

            const pbb = await ethers.getContractAt("PublicBulletinBoard", pbbAddress);

            // Configuración de miembros para cada PBB
            const tx2 = await pbb.addMember(user1.address);
            await tx2.wait();

            const MEMBER_ROLE = ethers.id("MEMBER_ROLE");
            expect(await pbb.hasRole(MEMBER_ROLE, user1.address)).to.be.true;
        }

        expect(await factory.pbbCount()).to.equal(3);
        });
    });

    /******************************************************************
     *           PRUEBAS DE ACTUALIZACIÓN Y EVENTOS COMPLEJOS        *
     ******************************************************************/
    describe("PBB Updates and Events", function () {
        let pbbAddress: string;

        beforeEach(async function () {
        await factory.addImplementation(1, await implementation.getAddress());
        const tx = await factory.createPBB(1, "Updatable PBB");
        await tx.wait();

        const filter = factory.filters.PBBCreated(deployer.address, undefined, undefined, undefined);
        const events = await factory.queryFilter(filter);
        pbbAddress = events[0].args?.pbbAddress;
        });

        it("should update a PBB to a new implementation and preserve state", async function () {

        await factory.addImplementation(2, await newImplementation.getAddress());
        await factory.updatePBB(pbbAddress, 2);

        const pbb = await ethers.getContractAt("PublicBulletinBoardV2", pbbAddress);
        expect(await pbb.version()).to.equal(2);
        });

        it("should emit ImplementationAdded and PBBCreated events", async function () {
        await expect(factory.addImplementation(2, await implementation.getAddress()))
            .to.emit(factory, "ImplementationAdded")
            .withArgs(await implementation.getAddress(), 2);

        await expect(factory.createPBB(2, "Event PBB"))
            .to.emit(factory, "PBBCreated")
            .withArgs(deployer.address, anyValue, 2, "Event PBB");
        });
    });

    /******************************************************************
     *           PRUEBAS DE SEGURIDAD Y ROBUSTEZ DEL CONTRATO         *
     ******************************************************************/
    describe("Security and Robustness", function () {
    
        beforeEach(async function () {
            await factory.addImplementation(1, await implementation.getAddress());
        });

        it("should revert if PBB name exceeds maximum length ( 64 characters )", async function () {
        const longName = "a".repeat(65);
        await expect(factory.createPBB(1, longName))
            .to.be.revertedWith("El nombre no debe exceder 64 caracteres"); // Aquí cambia el mensaje si el contrato tiene validación específica
        });
    
        it("should maintain state consistency after failed transactions", async function () {
        const initialCount = await factory.pbbCount();
    
        // Intentar crear un PBB con una implementación no registrada
        await expect(factory.createPBB(2, "Invalid Version"))
            .to.be.revertedWith("Implementacion no encontrada para la version especificada");
    
        // Verificar que el contador de PBBs no ha cambiado
        expect(await factory.pbbCount()).to.equal(initialCount);
        });
    
        it("should prevent adding the same user twice in configurePBB", async function () {
        const tx = await factory.createPBB(1, "Test PBB");
        await tx.wait();
    
        const filter = factory.filters.PBBCreated(deployer.address, undefined, undefined, undefined);
        const events = await factory.queryFilter(filter);
        const pbbAddress = events[0].args?.pbbAddress;
    
        const pbb = await ethers.getContractAt("PublicBulletinBoardV2", pbbAddress);

        // Intentar agregar el mismo usuario dos veces
        await pbb.addMember(user1.address);
        await expect(pbb.addMember(user1.address))
            .to.be.revertedWith("El usuario ya es miembro");
        });
    
        it("should handle a large number of PBB creations without exceeding gas limits", async function () {
        for (let i = 1; i <= 20; i++) {
            const tx = await factory.createPBB(1, `PBB ${i}`);
            const receipt = await tx.wait();
            //console.log(`Gas used for PBB ${i}: ${receipt!.gasUsed.toString()}`);
        }
        expect(await factory.pbbCount()).to.equal(20);
        });

    });
    
});
