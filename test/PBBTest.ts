const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
import { PublicBulletinBoard, PublicBulletinBoardV2 } from "../typechain-types";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";

describe("PublicBulletinBoard - Pruebas Integrales", function () {
  let pbb: PublicBulletinBoard;
  let deployer: any, admin: any, user1: any, user2: any, user3: any;

  beforeEach(async function () {
    [deployer, admin, user1, user2, user3] = await ethers.getSigners();

    // Desplegamos el contrato proxy pasando "admin" como dueño y [user1] como usuario autorizado inicial.
    const pbbImpl = await ethers.getContractFactory("PublicBulletinBoard");
    pbb = (await upgrades.deployProxy(
      pbbImpl,
      ["My PBB", admin.address, [user1.address]],
      { initializer: "initialize" }
    )) as unknown as PublicBulletinBoard;
    await pbb.waitForDeployment();
  });

  describe("Inicialización", function () {
    it("Debe inicializar con el nombre, versión y usuarios autorizados correctos", async function () {
      expect(await pbb.name()).to.equal("My PBB");
      expect(await pbb.version()).to.equal(1);
      expect(await pbb.authorizedUsers(user1.address)).to.equal(true);
      expect(await pbb.authorizedUsers(user2.address)).to.equal(false);
    });

    it("No debe permitir re-inicialización", async function () {
      // Intentamos desplegar otro proxy utilizando el mismo contrato lógico con `initialize`.
      await expect(
      pbb.initialize("New PBB", admin.address, [])
      ).to.be.reverted;
    });
  });

  describe("Gestión de Mensajes", function () {
    it("Debe agregar un mensaje correctamente e incrementar el nextMessageId", async function () {
      await pbb.connect(user1).addMessage("Hello World", "General");
      const message = await pbb.getMessageById(1);
      expect(message.id).to.equal(1);
      expect(message.sender).to.equal(user1.address);
      expect(message.timestamp).to.gt(0);
      const nextId = await pbb.nextMessageId();
      expect(nextId).to.equal(2);
    });

    it("Debe revertir si el contenido del mensaje excede 32 bytes", async function () {
      // Se crea un string de 33 caracteres (más de 32 bytes)
      const longStr = "123456789012345678901234567890123";
      await expect(
        pbb.connect(user1).addMessage(longStr, "General")
      ).to.be.revertedWith("String demasiado largo");
    });

    it("Debe aceptar un mensaje con el maximo numero de bytes (31)", async function () {
      // 32 caracteres ASCII equivalen a 32 bytes
      const longMessage = "a".repeat(31);
      await pbb.connect(user1).addMessage(longMessage, "General");
      const message = await pbb.getMessageById(1);
      // Comparamos usando ethers.utils.formatBytes32String; se puede recortar el padding
      expect(message.content).to.equal(ethers.encodeBytes32String(longMessage));
    });


    it("Debe revertir al solicitar un mensaje con ID inválido", async function () {
      await expect(pbb.getMessageById(0)).to.be.revertedWith("ID de mensaje no valido");
      await pbb.connect(user1).addMessage("Test", "General");
      const nextId = await pbb.nextMessageId();
      await expect(pbb.getMessageById(nextId)).to.be.revertedWith("ID de mensaje no valido");
    });
  });

  describe("Gestión de Usuarios Autorizados", function () {
    it("Solo el owner debe poder añadir usuarios autorizados", async function () {
      // user1 no es owner, debe fallar al intentar autorizar a user2
      await expect(
        pbb.connect(user1).addAuthorizedUser(user2.address)
      ).to.be.reverted;
      // El owner (admin) autoriza a user2
      await expect(pbb.connect(admin).addAuthorizedUser(user2.address))
        .to.emit(pbb, "UserAuthorized")
        .withArgs(admin.address, user2.address, anyValue);
      expect(await pbb.authorizedUsers(user2.address)).to.equal(true);
    });

    it("Solo el owner debe poder revocar usuarios autorizados", async function () {
      // El owner revoca a user1, quien ya estaba autorizado
      await expect(pbb.connect(admin).removeAuthorizedUser(user1.address))
        .to.emit(pbb, "UserRevoked")
        .withArgs(admin.address, user1.address, anyValue);
      expect(await pbb.authorizedUsers(user1.address)).to.equal(false);
      // Un usuario no owner no puede revocar autorizaciones
      await expect(pbb.connect(user1).removeAuthorizedUser(user2.address)).to.be.reverted;
    });

    it("Debe manejar correctamente la adición de un usuario ya autorizado", async function () {
      // user1 ya está autorizado; la operación debería completarse sin efectos colaterales.
      await expect(pbb.connect(admin).addAuthorizedUser(user1.address))
        .to.emit(pbb, "UserAuthorized")
        .withArgs(admin.address, user1.address, anyValue);
      expect(await pbb.authorizedUsers(user1.address)).to.equal(true);
    });

    it("Debe manejar la revocación de un usuario no autorizado", async function () {
      // user2 no está autorizado; la operación se ejecuta y el estado permanece en false.
      await expect(pbb.connect(admin).removeAuthorizedUser(user2.address))
        .to.emit(pbb, "UserRevoked")
        .withArgs(admin.address, user2.address, anyValue);
      expect(await pbb.authorizedUsers(user2.address)).to.equal(false);
    });
  });

  describe("Transferencia de Administración", function () {
    it("Solo el owner debe poder transferir la administración", async function () {
      await expect(
        pbb.connect(user1).transferAdmin(user2.address)
      ).to.be.reverted;
    });

    it("Debe revertir si se intenta transferir a la dirección cero", async function () {
      await expect(
        pbb.connect(admin).transferAdmin(ethers.ZeroAddress)
      ).to.be.revertedWith("Direccion no puede ser la direccion cero");
    });

    it("Debe transferir correctamente la administración y actualizar los privilegios", async function () {
      // Transfiere la administración de admin a user2
      await expect(pbb.connect(admin).transferAdmin(user2.address))
        .to.emit(pbb, "AdminTransferred")
        .withArgs(admin.address, user2.address, anyValue);
      
      // Verifica que user2 ahora es owner (puede llamar a funciones restringidas)
      await expect(pbb.connect(user2).addAuthorizedUser(user3.address))
        .to.emit(pbb, "UserAuthorized");
      
      // El antiguo owner ya no posee privilegios owner
      await expect(
        pbb.connect(admin).addAuthorizedUser(user3.address)
      ).to.be.reverted;
    });
  });

  describe("Actualización (UUPS Upgrade)", function () {
    let pbbV2Factory: any;

    beforeEach(async function () {
      pbbV2Factory = await ethers.getContractFactory("PublicBulletinBoardV2");
    });

    it("Solo el owner debe poder autorizar una actualización", async function () {
      // Un intento de upgrade desde un usuario que no es owner debe fallar.
      await expect(
        upgrades.upgradeProxy(pbb, pbbV2Factory.connect(user1))
      ).to.be.reverted;
    });

    it("Debe actualizar y mantener el estado del contrato", async function () {
      // Se agrega un mensaje y se autoriza un usuario para crear estado.
      await pbb.connect(user1).addMessage("Upgrade Test", "General");
      await pbb.connect(admin).addAuthorizedUser(user2.address);

      // Se realiza la actualización usando la cuenta owner (admin).
      const upgraded = (await upgrades.upgradeProxy(
        pbb,
        pbbV2Factory.connect(admin)
      )) as unknown as PublicBulletinBoardV2;

      // Verificamos que el mensaje y la autorización se mantienen.
      const message = await upgraded.getMessageById(1);
      expect(message.content).to.equal(ethers.encodeBytes32String("Upgrade Test"));
      expect(await upgraded.authorizedUsers(user2.address)).to.equal(true);
      // La función version ahora debe retornar 2.
      expect(await upgraded.version()).to.equal(2);
    });

    // Nota: La verificación de que se rechace pasar la dirección cero en _authorizeUpgrade
    // se realiza internamente mediante el modificador "notZeroAddress" y no es invocable directamente
    // en un test ya que la función es interna.
  });

  describe("Emisión de Eventos", function () {
    it("Debe emitir MessageAdded al agregar un mensaje", async function () {
      await expect(pbb.connect(user1).addMessage("Event Test", "General"))
        .to.emit(pbb, "MessageAdded")
        .withArgs(user1.address, "Event Test", "General", anyValue);
    });

    it("Debe emitir UserAuthorized al autorizar a un usuario", async function () {
      await expect(pbb.connect(admin).addAuthorizedUser(user2.address))
        .to.emit(pbb, "UserAuthorized")
        .withArgs(admin.address, user2.address, anyValue);
    });

    it("Debe emitir UserRevoked al revocar la autorización de un usuario", async function () {
      await expect(pbb.connect(admin).removeAuthorizedUser(user1.address))
        .to.emit(pbb, "UserRevoked")
        .withArgs(admin.address, user1.address, anyValue);
    });

    it("Debe emitir AdminTransferred al transferir la administración", async function () {
      await expect(pbb.connect(admin).transferAdmin(user2.address))
        .to.emit(pbb, "AdminTransferred")
        .withArgs(admin.address, user2.address, anyValue);
    });
  });

  describe("Secuencia de Operaciones Complejas", function () {
    it("Debe ejecutar una serie de operaciones y mantener un estado coherente", async function () {
      // El owner autoriza a user2 y user3.
      await pbb.connect(admin).addAuthorizedUser(user2.address);
      await pbb.connect(admin).addAuthorizedUser(user3.address);

      // Cada usuario autorizado agrega un mensaje.
      await pbb.connect(user1).addMessage("Msg from user1", "Topic1");
      await pbb.connect(user2).addMessage("Msg from user2", "Topic2");
      await pbb.connect(user3).addMessage("Msg from user3", "Topic3");

      // Se transfiere la administración de admin a user1.
      await pbb.connect(admin).transferAdmin(user1.address);

      // El nuevo owner (user1) revoca la autorización a user2.
      await pbb.connect(user1).removeAuthorizedUser(user2.address);

      // user2 ya no está autorizado y la acción debe revertir.
      await expect(
        pbb.connect(user2).addMessage("Otro mensaje", "Topic2")
      ).to.be.revertedWith("No estas autorizado para realizar esta accion");

      // Verificar que los mensajes anteriores se mantienen.
      const msg1 = await pbb.getMessageById(1);
      const msg2 = await pbb.getMessageById(2);
      const msg3 = await pbb.getMessageById(3);
      expect(msg1.sender).to.equal(user1.address);
      expect(msg2.sender).to.equal(user2.address);
      expect(msg3.sender).to.equal(user3.address);
    });
  });

  describe("Función Version", function () {
    it("Debe retornar la versión correcta", async function () {
      expect(await pbb.version()).to.equal(1);
    });
  });

});
