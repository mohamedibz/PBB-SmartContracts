const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
import { PublicBulletinBoard, PublicBulletinBoardV2, PBBFactory } from "../typechain-types";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";

describe("Integration Test: Flujo completo de Public Bulletin Board", function () {
  let factory: PBBFactory;
  let pbbImplementation: PublicBulletinBoard;
  let pbb: PublicBulletinBoard; // instancia del PBB creado mediante el factory
  let deployer: any, admin: any, user1: any, user2: any, user3: any;

  before(async function () {
    // Obtenemos las cuentas a usar en el test
    [deployer, admin, user1, user2, user3] = await ethers.getSigners();

    // ---------------------------------------------------------------------
    // 1. Desplegar la implementación de PublicBulletinBoard (versión 1)
    // ---------------------------------------------------------------------
    const PBBFactoryImpl = await ethers.getContractFactory("PublicBulletinBoard");
    pbbImplementation = await PBBFactoryImpl.deploy();
    await pbbImplementation.waitForDeployment();

    // ---------------------------------------------------------------------
    // 2. Desplegar el contrato factory (PBBFactory)
    // ---------------------------------------------------------------------
    const PBBFactoryContract = await ethers.getContractFactory("PBBFactory");
    factory = (await PBBFactoryContract.deploy()) as PBBFactory;
    await factory.waitForDeployment();

    // Como owner del factory (deployer), agregamos la implementación para la versión 1
    const implementationAddress = await pbbImplementation.getAddress();
    await factory.addImplementation(1, implementationAddress);

    // ---------------------------------------------------------------------
    // 3. Crear un nuevo PBB mediante el factory
    // ---------------------------------------------------------------------
    // Nota: En el factory se codifica la llamada a initialize usando:
    //      (name, msg.sender, authUsers)
    // Es decir, el owner del nuevo PBB será el que invoque createPBB.
    // Por ejemplo, aquí lo llamamos desde deployer, por lo que el owner será deployer.
    // Crear un filtro para el evento PBBCreated

    const filter = factory.filters.PBBCreated(deployer.address, undefined, undefined, undefined);

    // Obtener el número actual de bloques
    const currentBlock = await ethers.provider.getBlockNumber();

    await factory.createPBB(1, "Test PBB", [user1.address]);
    
    // Consultar los eventos PBBCreated desde el bloque actual
    const events = await factory.queryFilter(filter, currentBlock);

    // Verificar que se haya emitido el evento y obtener la dirección del PBB
    expect(events.length).to.be.greaterThan(0);
    const pbbAddress = events[0].args?.pbbAddress;

    expect(pbbAddress).to.not.be.undefined;
    
    // Obtenemos la instancia del PBB (proxy) creado
    pbb = await ethers.getContractAt("PublicBulletinBoard", pbbAddress) as PublicBulletinBoard;
    
  });

  describe("Estado inicial y flujo de usuario", function () {
    it("El PBB creado debe tener los parámetros correctos", async function () {
      // Verifica el nombre y que el owner es quien llamó a createPBB (deployer en este caso)
      expect(await pbb.name()).to.equal("Test PBB");
      expect(await pbb.owner()).to.equal(deployer.address);
      // user1 fue autorizado en la creación; user2 aún no lo está
      expect(await pbb.authorizedUsers(user1.address)).to.equal(true);
      expect(await pbb.authorizedUsers(user2.address)).to.equal(false);
    });

    it("Un usuario autorizado (user1) puede agregar mensajes", async function () {
      await pbb.connect(user1).addMessage("Hola desde user1", "General");
      const message = await pbb.getMessageById(1);
      expect(message.sender).to.equal(user1.address);
      expect(message.timestamp).to.gt(0);
    });

    it("Un usuario no autorizado (user2) no puede agregar mensajes", async function () {
      await expect(
        pbb.connect(user2).addMessage("Hola desde user2", "General")
      ).to.be.revertedWith("No estas autorizado para realizar esta accion");
    });

    it("El owner puede autorizar a nuevos usuarios y éstos pueden interactuar", async function () {
      // El owner (deployer) añade a user2
      await pbb.connect(deployer).addAuthorizedUser(user2.address);
      expect(await pbb.authorizedUsers(user2.address)).to.equal(true);

      // Ahora user2 puede agregar un mensaje
      await pbb.connect(user2).addMessage("Mensaje de user2 autorizado", "General");
      const msg2 = await pbb.getMessageById(2);
      expect(msg2.sender).to.equal(user2.address);
    });

    it("Se puede transferir la administración y se actualizan los privilegios", async function () {
      // Transferimos el admin desde deployer a admin
      await pbb.connect(deployer).transferAdmin(admin.address);
      expect(await pbb.owner()).to.equal(admin.address);

      // El antiguo owner (deployer) ya no puede, por ejemplo, añadir usuarios
      await expect(
        pbb.connect(deployer).addAuthorizedUser(user3.address)
      ).to.be.reverted;

      // El nuevo owner (admin) añade a user3
      await pbb.connect(admin).addAuthorizedUser(user3.address);
      expect(await pbb.authorizedUsers(user3.address)).to.equal(true);
    });
  });

  describe("Flujo de actualización y preservación de estado", function () {
    it("Se actualiza a V2 preservando el estado", async function () {
      // Preparamos el estado: user1 añade un mensaje nuevo
      await pbb.connect(user1).addMessage("Mensaje antes de upgrade", "Upgrade");
    
      // Verificamos el contador de mensajes antes de la actualización
      const msgCountBefore = await pbb.nextMessageId();
    
      // Forzar la importación del proxy antes de actualizarlo
      const proxyAddress = await pbb.getAddress(); // Dirección del proxy existente
      const PBBV1Factory = await ethers.getContractFactory("PublicBulletinBoard");
      const importedPBB = await upgrades.forceImport(proxyAddress, PBBV1Factory);
    
      console.log("Proxy importado con éxito:", await importedPBB.getAddress());




    
      // Solo el owner actual (admin) puede autorizar la actualización.
      //const PBBV2Factory = await ethers.getContractFactory("PublicBulletinBoardV2");
      //const upgradedPBB = (await upgrades.upgradeProxy(proxyAddress, PBBV2Factory.connect(admin))) as unknown as PublicBulletinBoard;
      
      // Desplegamos la nueva implementación V2
      const PBBV2Factory = await ethers.getContractFactory("PublicBulletinBoardV2");
      const newImplementation = await PBBV2Factory.deploy();
      await newImplementation.waitForDeployment();
      console.log("Nueva implementación V2 desplegada en:", await newImplementation.getAddress());

      // Añadimos la nueva implementación a la Factory
      await factory.connect(deployer).addImplementation(2, await newImplementation.getAddress());

      // Actualizamos la PBB específica a la nueva implementación usando la Factory
      await factory.connect(deployer).updatePBB(await pbb.getAddress(), 2);



      // Verificamos que el estado (mensajes, autorizaciones) se mantiene tras la actualización
      expect(await pbb.nextMessageId()).to.equal(msgCountBefore);
    
      // Verificamos que el mensaje agregado antes de la actualización sigue presente
      const preUpgradeMsg = await pbb.getMessageById(BigInt(msgCountBefore) - 1n);
      expect(preUpgradeMsg.content).to.equal(ethers.encodeBytes32String("Mensaje antes de upgrade"));
    
      // Verificamos que la nueva versión del contrato retorna 2
      expect(await pbb.version()).to.equal(2);
    });
    

  });

});


describe("Simulación Frontend: Múltiples PBBs, autorizaciones y revocaciones", function () {
  let factory: PBBFactory;
  let pbbImplementation: PublicBulletinBoard;
  let deployer: any, admin: any, user1: any, user2: any, user3: any, user4: any;

  before(async function () {
    // Obtenemos las cuentas que simulan distintos roles de usuarios en la app
    [deployer, admin, user1, user2, user3, user4] = await ethers.getSigners();

    // 1. Desplegar la implementación de PublicBulletinBoard (V1)
    const PBBImpl = await ethers.getContractFactory("PublicBulletinBoard");
    pbbImplementation = await PBBImpl.deploy();
    await pbbImplementation.waitForDeployment();

    // 2. Desplegar la Factory que se usará para crear los PBBs
    const PBBFactoryContract = await ethers.getContractFactory("PBBFactory");
    factory = (await PBBFactoryContract.deploy()) as PBBFactory;
    await factory.waitForDeployment();

    // Registrar la implementación V1 en la factory (como deployer, owner del factory)
    const implementationAddress = await pbbImplementation.getAddress();
    await factory.addImplementation(1, implementationAddress);
  });
  

  describe("Simulación de creación de múltiples PBBs y flujo de autorizaciones", function () {
    it("El frontend crea múltiples PBBs y cada uno tiene sus autorizaciones iniciales", async function () {
      
      // Simulamos la creación de 3 PBBs con diferentes nombres y autorizaciones
      const pbbNames = ["PBB Alpha", "PBB Beta", "PBB Gamma"];
      // Definimos para cada PBB los usuarios autorizados inicialmente
      const authUsersPerPBB = [
        [user1.address, user2.address], // PBB Alpha: user1 y user2 autorizados
        [user2.address, user3.address], // PBB Beta: user2 y user3 autorizados
        [user1.address, user3.address]  // PBB Gamma: user1 y user3 autorizados
      ];
      const pbbAddresses: string[] = [];

      const filter = factory.filters.PBBCreated(deployer.address, undefined, undefined, undefined);
      // Obtener el número actual de bloques
      const currentBlock = await ethers.provider.getBlockNumber();

      // Para cada PBB, se utiliza la factory para crearlo y se extrae el address del evento emitido
      for (let i = 0; i < pbbNames.length; i++) {
        await factory.createPBB(1, pbbNames[i], authUsersPerPBB[i]);

        // Filtramos el evento PBBCreated y obtenemos la dirección del proxy creado
        // Consultar los eventos PBBCreated desde el bloque actual
        const events = await factory.queryFilter(filter, currentBlock);

        // Verificar que se haya emitido el evento y obtener la dirección del PBB
        expect(events.length).to.be.greaterThan(0);
        const pbbAddress = events[i].args?.pbbAddress;          
        pbbAddresses.push(pbbAddress);

      }

      // Validamos que se hayan creado las 3 instancias
      expect(pbbAddresses.length).to.equal(3);

      // Guardamos las instancias para simular interacciones desde el frontend
      const pbbAlpha = await ethers.getContractAt("PublicBulletinBoard", pbbAddresses[0]) as PublicBulletinBoard;
      const pbbBeta  = await ethers.getContractAt("PublicBulletinBoard", pbbAddresses[1]) as PublicBulletinBoard;
      const pbbGamma = await ethers.getContractAt("PublicBulletinBoard", pbbAddresses[2]) as PublicBulletinBoard;

      // ***********************************************************************
      // Simulamos acciones en cada PBB, como si fuesen interacciones en el frontend
      // ***********************************************************************

      // --- PBB Alpha ---
      // Usuarios autorizados: user1 y user2; user3 y user4 no lo están inicialmente.
      await expect(pbbAlpha.connect(user1).addMessage("Alpha: mensaje de user1", "General"))
        .to.emit(pbbAlpha, "MessageAdded");
      await expect(pbbAlpha.connect(user2).addMessage("Alpha: mensaje de user2", "General"))
        .to.emit(pbbAlpha, "MessageAdded");
      await expect(
        pbbAlpha.connect(user3).addMessage("Alpha: intento de user3", "General")
      ).to.be.revertedWith("No estas autorizado para realizar esta accion");


      
      // --- PBB Beta ---
      // Usuarios autorizados: user2 y user3; user1 y user4 no lo están.
      
      await expect(pbbBeta.connect(user2).addMessage("Beta: mensaje de user2", "General"))
        .to.emit(pbbBeta, "MessageAdded");
      await expect(pbbBeta.connect(user3).addMessage("Beta: mensaje de user3", "General"))
        .to.emit(pbbBeta, "MessageAdded");
      await expect(
        pbbBeta.connect(user1).addMessage("Beta: intento de user1", "General")
      ).to.be.revertedWith("No estas autorizado para realizar esta accion");
      
      
      // --- PBB Gamma ---
      // Usuarios autorizados: user1 y user3; user2 y user4 no lo están.
      await expect(pbbGamma.connect(user1).addMessage("Gamma: mensaje de user1", "General"))
        .to.emit(pbbGamma, "MessageAdded");
      await expect(pbbGamma.connect(user3).addMessage("Gamma: mensaje de user3", "General"))
        .to.emit(pbbGamma, "MessageAdded");
      await expect(
        pbbGamma.connect(user2).addMessage("Gamma: intento de user2", "General")
      ).to.be.revertedWith("No estas autorizado para realizar esta accion");

      // ***********************************************************************
      // Ahora simulamos que el frontend realiza cambios en las autorizaciones
      // ***********************************************************************

      // En PBB Alpha: el owner (deployer, que creó el PBB a través de la factory) realiza cambios
      // Agrega a user3 y user4; luego revoca la autorización de user2.
      await expect(pbbAlpha.connect(deployer).addAuthorizedUser(user3.address))
        .to.emit(pbbAlpha, "UserAuthorized")
        .withArgs(deployer.address, user3.address, anyValue);
      await expect(pbbAlpha.connect(deployer).addAuthorizedUser(user4.address))
        .to.emit(pbbAlpha, "UserAuthorized")
        .withArgs(deployer.address, user4.address, anyValue);

      // Ahora user3 y user4 pueden agregar mensajes en Alpha
      await expect(pbbAlpha.connect(user3).addMessage("mensaje de user3 autorizado", "General"))
        .to.emit(pbbAlpha, "MessageAdded");
      await expect(pbbAlpha.connect(user4).addMessage("mensaje de user4 autorizado", "General"))
        .to.emit(pbbAlpha, "MessageAdded");

      // Revocar autorización a user2
      await expect(pbbAlpha.connect(deployer).removeAuthorizedUser(user2.address))
        .to.emit(pbbAlpha, "UserRevoked")
        .withArgs(deployer.address, user2.address, anyValue);
      // Ahora user2 no debe poder enviar mensajes en Alpha
      await expect(
        pbbAlpha.connect(user2).addMessage("intento de user2 tras revocación", "General")
      ).to.be.revertedWith("No estas autorizado para realizar esta accion");

      // En PBB Beta: se agrega user1 y se revoca la autorización a user3
      await expect(pbbBeta.connect(deployer).addAuthorizedUser(user1.address))
        .to.emit(pbbBeta, "UserAuthorized")
        .withArgs(deployer.address, user1.address, anyValue);
      await expect(pbbBeta.connect(user1).addMessage("user1 tras autorización", "General"))
        .to.emit(pbbBeta, "MessageAdded");
      await expect(pbbBeta.connect(deployer).removeAuthorizedUser(user3.address))
        .to.emit(pbbBeta, "UserRevoked")
        .withArgs(deployer.address, user3.address, anyValue);
      await expect(
        pbbBeta.connect(user3).addMessage("user3 tras revocación", "General")
      ).to.be.revertedWith("No estas autorizado para realizar esta accion");

      // En PBB Gamma: se agrega user2 y se revoca la autorización a user1
      await expect(pbbGamma.connect(deployer).addAuthorizedUser(user2.address))
        .to.emit(pbbGamma, "UserAuthorized")
        .withArgs(deployer.address, user2.address, anyValue);
      await expect(pbbGamma.connect(user2).addMessage("user2 tras autorización", "General"))
        .to.emit(pbbGamma, "MessageAdded");
      await expect(pbbGamma.connect(deployer).removeAuthorizedUser(user1.address))
        .to.emit(pbbGamma, "UserRevoked")
        .withArgs(deployer.address, user1.address, anyValue);
      await expect(
        pbbGamma.connect(user1).addMessage("user1 tras revocación", "General")
      ).to.be.revertedWith("No estas autorizado para realizar esta accion");
    
    });
    
  });

});