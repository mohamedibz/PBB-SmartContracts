// test/PublicBulletinBoard.test.ts

import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { PublicBulletinBoard, PublicBulletinBoardV2 } from "../typechain-types"; // Asegúrate de que la ruta sea correcta
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";

describe("PublicBulletinBoard", function () {

  // Variables globales para los tests
  let pbb: PublicBulletinBoard;
  let pbbFactory: any;
  let newImplementationFactory: any;

  let deployer: any, admin: any, member: any, user: any, developer: any, factoryAddress: any, other: any;
  

  beforeEach(async () => {
    // Obtenemos las cuentas de prueba
    [deployer, admin, member, user, developer, factoryAddress, other] = await ethers.getSigners();

    // Obtenemos la fábrica del contrato y lo desplegamos como proxy UUPS
    pbbFactory = await ethers.getContractFactory("PublicBulletinBoard", deployer);
    pbb = (await upgrades.deployProxy(
      pbbFactory,
      ["Mi Tablón Público", admin.address, factoryAddress.address],
      { initializer: "initialize" }
    )) as unknown as PublicBulletinBoard;

    await pbb.waitForDeployment();

  });

  /******************************************************************
   *                        PRUEBAS DE INICIALIZACIÓN               *
   ******************************************************************/
  describe("Initialization", function () {
    it("should initialize correctly with provided parameters", async function () {
      expect(await pbb.name()).to.equal("Mi Tablón Público");
      expect(await pbb.nextMessageId()).to.equal(1);

      // Verificar roles asignados
      const DEFAULT_ADMIN_ROLE = await pbb.DEFAULT_ADMIN_ROLE();
      expect(await pbb.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;

      const ADMIN_ROLE = await pbb.ADMIN_ROLE();
      expect(await pbb.hasRole(ADMIN_ROLE, admin.address)).to.be.true;

      const DEVELOPER_ROLE = await pbb.DEVELOPER_ROLE();
      expect(await pbb.hasRole(DEVELOPER_ROLE, factoryAddress.address)).to.be.true;
      expect(await pbb.hasRole(DEVELOPER_ROLE, admin.address)).to.be.true;
    });

    it("should revert if name is empty", async function () {
      const PublicBulletinBoard = await ethers.getContractFactory("PublicBulletinBoard");
      await expect(
        upgrades.deployProxy(PublicBulletinBoard, ["", admin.address, factoryAddress.address], { initializer: "initialize" })
      ).to.be.revertedWith("El nombre no puede estar vacio");
    });

    it("should revert if _owner or _factory is zero address", async function () {
      const PublicBulletinBoard = await ethers.getContractFactory("PublicBulletinBoard");

      await expect(
        upgrades.deployProxy(PublicBulletinBoard, ["Tablón", ethers.ZeroAddress, factoryAddress.address], { initializer: "initialize" })
      ).to.be.revertedWith("Direccion no puede ser la direccion cero");

      await expect(
        upgrades.deployProxy(PublicBulletinBoard, ["Tablón", admin.address, ethers.ZeroAddress], { initializer: "initialize" })
      ).to.be.revertedWith("Direccion no puede ser la direccion cero");
    });
  });

  /******************************************************************
   *                     PRUEBAS DE FUNCIONALIDAD DE MENSAJES       *
   ******************************************************************/
  describe("Message Functionality", function () {

    beforeEach(async function () {
      // Agregamos el rol MEMBER a la cuenta 'member'
      await pbb.connect(admin).addMember(member.address);
      expect(await pbb.hasRole(await pbb.MEMBER_ROLE(), member.address)).to.be.true;
    });

    it("should allow a member to add a message", async function () {
      const content = "Hola mundo";
      const topic = "Saludo";

      const tx = await pbb.connect(member).addMessage(content, topic);
      const receipt = await tx.wait();

      if (receipt === null) {
        throw new Error("Transaction receipt is null");
      }

       // Obtener la interfaz del contrato
      const contractInterface = pbb.interface;

      // Analizar los logs para encontrar el evento 'MessageAdded'
      const event = receipt.logs
        .map((log) => {
        try {
            return contractInterface.parseLog(log);
        } catch {
            return null;
        }
        })
        .find((parsedLog) => parsedLog && parsedLog.name === "MessageAdded");

      // Verificar que se emitió el evento 'MessageAdded'
      expect(event, "No se emitió el evento MessageAdded").to.not.be.null;
      expect(event?.args?.sender).to.equal(member.address);
      expect(event?.args?.content).to.equal(content);
      expect(event?.args?.topic).to.equal(topic);

      // Verificar que nextMessageId se ha incrementado
      expect(await pbb.nextMessageId()).to.equal(2);

      // Recuperar y verificar el mensaje
      const message = await pbb.getMessageById(1);
      expect(message.id).to.equal(1);
      expect(message.sender).to.equal(member.address);
      expect(message.timestamp).to.be.gt(0);
    });
    
    it("should revert if a non-member attempts to add a message", async function () {
      const content = "Mensaje invalido";
      const topic = "Error";
      await expect(pbb.connect(user).addMessage(content, topic)).to.be.reverted;
    });

    it("should revert if content or topic exceed MAX_BYTES", async function () {
      const longString = "a".repeat(33);
      await expect(pbb.connect(member).addMessage(longString, "Topico")).to.be.revertedWith("String demasiado largo");
      await expect(pbb.connect(member).addMessage("Contenido", longString)).to.be.revertedWith("String demasiado largo");
    });

    it("should correctly retrieve message details", async function () {
      const content = "Test";
      const topic = "UnitTest";
      await pbb.connect(member).addMessage(content, topic);
      const message = await pbb.getMessageById(1);
      expect(message.sender).to.equal(member.address);
      expect(message.timestamp).to.be.gt(0);
    });

    it("should increment nextMessageId after adding multiple messages", async function () {
      await pbb.connect(member).addMessage("Msg1", "T1");
      await pbb.connect(member).addMessage("Msg2", "T2");
      expect(await pbb.nextMessageId()).to.equal(3);
    });
  });

  /******************************************************************
   *                    PRUEBAS DE CONSISTENCIA DE ESTADO           *
  ******************************************************************/
  describe("State Consistency", function () {

    beforeEach(async function () {
        // Agregamos el rol MEMBER a la cuenta 'member'
        await pbb.connect(admin).addMember(member.address);
        expect(await pbb.hasRole(await pbb.MEMBER_ROLE(), member.address)).to.be.true;
    });

    it("should maintain consistent state after multiple successful transactions", async function () {
      for (let i = 0; i < 10; i++) {
        await pbb.connect(member).addMessage(`Mensaje ${i}`, `Topic ${i}`);
      }
      expect(await pbb.nextMessageId()).to.equal(11);
  
      const message = await pbb.getMessageById(10);
      expect(message.content).to.equal(ethers.encodeBytes32String("Mensaje 9"));
    });
  
    it("should revert and maintain state consistency after a failed transaction", async function () {
      const initialMessageId = await pbb.nextMessageId();
  
      // Intentar agregar un mensaje inválido
      await expect(pbb.connect(member).addMessage("123456789012345678901234567890123", "OverflowTest")).to.be.revertedWith("String demasiado largo");
  
      // Verificar que el estado no ha cambiado
      expect(await pbb.nextMessageId()).to.equal(initialMessageId);
    });
  
  });
  
  /******************************************************************
   *                     PRUEBAS DE GESTIÓN DE MIEMBROS             *
   ******************************************************************/
  describe("Member Management", function () {
    it("should allow admin to add a new member", async function () {
      await pbb.connect(admin).addMember(user.address);
      expect(await pbb.hasRole(await pbb.MEMBER_ROLE(), user.address)).to.be.true;
    });

    it("should revert when adding an already existing member", async function () {
      await pbb.connect(admin).addMember(user.address);
      await expect(pbb.connect(admin).addMember(user.address)).to.be.revertedWith("El usuario ya es miembro");
    });

    it("should allow admin to remove a member", async function () {
      await pbb.connect(admin).addMember(user.address);
      await pbb.connect(admin).removeMember(user.address);
      expect(await pbb.hasRole(await pbb.MEMBER_ROLE(), user.address)).to.be.false;
    });

    it("should revert when trying to remove a non-member", async function () {
      await expect(pbb.connect(admin).removeMember(user.address)).to.be.revertedWith("El usuario no es miembro");
    });

    it("should allow adding multiple members via addMembers", async function () {
      const newMembers = [user.address, other.address];
      await pbb.connect(admin).addMembers(newMembers);
      expect(await pbb.hasRole(await pbb.MEMBER_ROLE(), user.address)).to.be.true;
      expect(await pbb.hasRole(await pbb.MEMBER_ROLE(), other.address)).to.be.true;
    });

    it("should revert when addMembers is called with an empty list", async function () {
      await expect(pbb.connect(admin).addMembers([])).to.be.revertedWith("Lista de miembros vacia");
    });

    it("should revert when addMembers is called with more than MAX_MEMBERS_PER_CALL addresses", async function () {
      const addresses: string[] = [];
      for (let i = 0; i < 51; i++) {
        addresses.push(ethers.Wallet.createRandom().address);
      }
      await expect(pbb.connect(admin).addMembers(addresses)).to.be.revertedWith("Se excede el maximo de miembros por llamada");
    });
  });

  /******************************************************************
   *                     PRUEBAS DE GESTIÓN DE ADMINISTRADORES        *
   ******************************************************************/
  describe("Admin Management", function () {
    it("should allow admin to add another admin", async function () {
      await pbb.connect(admin).addAdmin(user.address);
      expect(await pbb.hasRole(await pbb.ADMIN_ROLE(), user.address)).to.be.true;
    });

    it("should revert when a non-admin tries to add an admin", async function () {
      await expect(pbb.connect(user).addAdmin(other.address)).to.be.reverted;
    });

    it("should allow an admin to remove another admin when more than one exists", async function () {
      await pbb.connect(admin).addAdmin(user.address);
      await pbb.connect(admin).removeAdmin(user.address);
      expect(await pbb.hasRole(await pbb.ADMIN_ROLE(), user.address)).to.be.false;
    });

    it("should revert when an admin tries to remove themselves", async function () {
      await expect(pbb.connect(admin).removeAdmin(admin.address)).to.be.revertedWith("No puedes revocarte a ti mismo");
    });

    it("should revert when attempting to remove the only admin", async function () {
      await expect(pbb.connect(admin).removeAdmin(admin.address)).to.be.reverted;
    });

  });

  /******************************************************************
   *                     PRUEBAS DE UPGRADEABILIDAD                   *
   ******************************************************************/
  describe("Upgradeability", function () {
    let newImplementation: PublicBulletinBoardV2;
    beforeEach(async function () {
      newImplementationFactory = await ethers.getContractFactory("PublicBulletinBoardV2");
      newImplementation = (await newImplementationFactory.deploy()) as PublicBulletinBoardV2;
      await newImplementation.waitForDeployment();
    });

    it("should allow upgrade when called by an account with DEVELOPER_ROLE", async function () {
      const upgraded = await upgrades.upgradeProxy(await pbb.getAddress(), newImplementationFactory.connect(factoryAddress));
      expect(await upgraded.version()).to.equal(2);
    });

    it("should revert upgrade when called by an account without DEVELOPER_ROLE", async function () {
      await expect(
        upgrades.upgradeProxy(await pbb.getAddress(), newImplementationFactory.connect(user))
      ).to.be.reverted;
    });

    describe("Post-upgrade functionality: Comments", function () {
      let upgraded: any;
  
      beforeEach(async function () {
        // En este bloque se asume que algunos datos fueron creados con la implementación original.
        // Aquí, por ejemplo, creamos un mensaje usando una cuenta miembro.
        await pbb.connect(admin).addMember(await member.getAddress());
        await pbb.connect(member).addMessage("Mensaje de prueba", "General");
  
        // Ahora se realiza la actualización
        upgraded = await upgrades.upgradeProxy(await pbb.getAddress(), newImplementationFactory.connect(factoryAddress));
      });
  
      it("should allow a member to add a comment to an existing message", async function () {
        // Se añade un comentario al mensaje creado (ID = 1)
        await upgraded.connect(member).addComment(1, "Este es un comentario de prueba");
  
        // Se verifica que el comentario se haya almacenado correctamente.
        // Como en el contrato se define el mapping como: mapping(uint256 => string[]) public messageComments;
        // Podemos acceder al comentario usando dos parámetros: el ID del mensaje y la posición del comentario en el array.
        const comment = (await upgraded.getComment(1, 0)).content;
        expect(comment).to.equal("Este es un comentario de prueba");
      });
  
      it("should revert when a non-member tries to add a comment", async function () {
        // Se intenta añadir un comentario con una cuenta que no posee el rol MEMBER_ROLE.
        await expect(
          upgraded.connect(user).addComment(1, "Comentario no autorizado")
        ).to.be.reverted;
      });

    });

  });

  /******************************************************************
   *                          PRUEBAS DE UTILIDADES                 *
   ******************************************************************/
  describe("Utilities", function () {

    it("should return the correct contract version", async function () {
      expect(await pbb.version()).to.equal(1);
    });
  });

  /******************************************************************
   *        PRUEBAS EXTENDIDAS DE EVENTOS Y COMPORTAMIENTO          *
   ******************************************************************/
  describe("Event Emissions", function () {

    beforeEach(async function () {
      // Agregamos el rol MEMBER a la cuenta 'member'
      await pbb.connect(admin).addMember(member.address);
      expect(await pbb.hasRole(await pbb.MEMBER_ROLE(), member.address)).to.be.true;
    });

    it("should emit MessageAdded for multiple messages in the same block", async function () {
      const tx1 = pbb.connect(member).addMessage("Block Message 1", "Block Topic 1");
      const tx2 = pbb.connect(member).addMessage("Block Message 2", "Block Topic 2");

      await Promise.all([tx1, tx2]);

      const receipt1 = await (await tx1).wait();
      const receipt2 = await (await tx2).wait();

      expect(receipt1!.logs.length).to.be.greaterThan(0);
      expect(receipt2!.logs.length).to.be.greaterThan(0);
    });

    it("should emit multiple events for addMembers in a single call", async function () {
      const newMembers = [user.address, other.address];
      
      const tx = await pbb.connect(admin).addMembers(newMembers);
      const receipt = await tx.wait();

      let memberAddedCount = 0;
      for (const log of receipt!.logs) {
        try {
          const parsedLog = pbb.interface.parseLog(log);
          if (parsedLog!.name === "MemberAdded") {
            memberAddedCount++;
          }
        } catch (e) {
          continue;
        }
      }

      expect(memberAddedCount).to.equal(newMembers.length);
    });

    it("should emit AdminRevoked event when an admin is removed", async function () {
      await pbb.connect(admin).addAdmin(user.address);
      await expect(pbb.connect(admin).removeAdmin(user.address))
        .to.emit(pbb, "AdminRevoked")
        .withArgs(admin.address, user.address, anyValue);
    });

    it("should not emit events if addMessage reverts", async function () {
      const longString = "a".repeat(33); // Exceeds MAX_BYTES
      await expect(pbb.connect(member).addMessage(longString, "Topic"))
        .to.be.revertedWith("String demasiado largo");

      const receipt = await (await pbb.connect(member).addMessage("Valid Message", "Topic")).wait();
      expect(receipt!.logs.length).to.be.greaterThan(0);
    });

    it("should emit all expected events after an upgrade", async function () {
      const newImplementationFactory = await ethers.getContractFactory("PublicBulletinBoardV2");
      const upgraded = await upgrades.upgradeProxy(await pbb.getAddress(), newImplementationFactory.connect(admin)) as unknown as PublicBulletinBoardV2;

      await expect(upgraded.connect(member).addMessage("Post-Upgrade", "Topic"))
        .to.emit(upgraded, "MessageAdded")
        .withArgs(member.address, "Post-Upgrade", "Topic", anyValue);
    });

    it("should emit MemberRemoved when a member is removed", async function () {
      await pbb.connect(admin).addMember(user.address);
      await expect(pbb.connect(admin).removeMember(user.address))
        .to.emit(pbb, "MemberRemoved")
        .withArgs(admin.address, user.address, anyValue);
    });

  });

  /******************************************************************
  *                  PRUEBAS DE RENDIMIENTO Y ESCALABILIDAD        *
  ******************************************************************/
  describe("Performance and Scalability", function () {

    beforeEach(async function () {
        // Agregamos el rol MEMBER a la cuenta 'member'
        await pbb.connect(admin).addMember(member.address);
        expect(await pbb.hasRole(await pbb.MEMBER_ROLE(), member.address)).to.be.true;
    });
  
    it("should handle 1000 messages without crashing", async function () {
      let totalGasUsed = ethers.toBigInt("0");
      
      for (let i = 0; i < 5000; i++) {
        const tx = await pbb.connect(member).addMessage(`Message ${i}`, `Topic ${i}`);
        const receipt = await tx.wait();
        totalGasUsed = totalGasUsed + (receipt!.gasUsed);
      }
      expect(await pbb.nextMessageId()).to.equal(5001);
    
    });
  
    it("should retrieve messages efficiently even with a large dataset", async function () {
      for (let i = 0; i < 500; i++) {
        await pbb.connect(member).addMessage(`Mensaje ${i}`, "Topic");
      }
  
      // Verificar que podemos recuperar el último mensaje sin problemas
      const message = await pbb.getMessageById(500);
      expect(message.content).to.equal(ethers.encodeBytes32String("Mensaje 499"));
    });
  
    it("should measure gas consumption for addMessage", async function () {
      const tx = await pbb.connect(member).addMessage("Gas Test", "Topic");
      const receipt = await tx.wait();

      console.log(`Gas used for addMessage: ${receipt!.gasUsed.toString()}`);
    });
  
    it("should maintain consistent state under rapid consecutive transactions", async function () {
      const addMessagePromises = [];
      for (let i = 0; i < 50; i++) {
        addMessagePromises.push(pbb.connect(member).addMessage(`Concurrent ${i}`, "Topic"));
      }
      await Promise.all(addMessagePromises);
  
      // Verificar que todos los mensajes se añadieron correctamente
      expect(await pbb.nextMessageId()).to.equal(51);
    });
  
  });


});
