// test/PBB.test.ts

import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';
import { anyValue } from '@nomicfoundation/hardhat-chai-matchers/withArgs';

// Importa las funciones de despliegue desde tu script
import { deployFactory, deployImpl, deployProxy } from '../scripts/deploy';

describe('Public Bulletin Board Contract Tests', function () {
  let owner: any;
  let accounts: any;
  let admin: any;
  let authorizedUser: any;
  let factory: any;
  let pbbImplementation: any;
  let PBBFactory: any;
  let proxy: any;
  //let pbbAddress: string;
  //let pbbContract: any;

  beforeEach(async function () {
    [owner, ...accounts] = await ethers.getSigners();
    factory = await deployFactory();
    [PBBFactory, pbbImplementation] = await deployImpl();
    proxy = await deployProxy(PBBFactory, factory);
  });


  it('El admin puede crear un PBB correctamente', async function () {
    // Enviar la transacción y verificar el evento directamente
    await expect(
      proxy.connect(owner).createPBB('ELECCIONES GENERALES', [accounts[0], accounts[1]])
    )
    .to.emit(proxy, 'PBBCreated')
    .withArgs(
      0,
      anyValue,
      );
  });

  it('Usuario autorizado puede agregar un mensaje', async function () {
    

  });

  it('Usuario no autorizado no puede agregar un mensaje', async function () {

  });

  /*

  it('El admin puede agregar y remover usuarios autorizados', async function () {
    // Agregar usuario autorizado
    const txAdd = await pbbContract.connect(admin).authorizeUser(unauthorizedUser.address);
    await txAdd.wait();

    // Verificar que ahora puede agregar mensajes
    const txMessage = await pbbContract.connect(unauthorizedUser).addMessage('Mensaje después de ser autorizado');
    await txMessage.wait();

    const message = await pbbContract.messages(0);
    expect(message.content).to.equal('Mensaje después de ser autorizado');
    expect(message.sender).to.equal(unauthorizedUser.address);

    // Remover usuario autorizado
    const txRemove = await pbbContract.connect(admin).revokeUser(unauthorizedUser.address);
    await txRemove.wait();

    // Verificar que ya no puede agregar mensajes
    await expect(
      pbbContract.connect(unauthorizedUser).addMessage('Mensaje después de ser removido')
    ).to.be.revertedWith('No tienes permiso para realizar esta accion');
  });

  it('Solo el admin puede agregar o remover usuarios autorizados', async function () {
    // Intentar que un usuario no admin agregue un usuario autorizado
    await expect(
      pbbContract.connect(authorizedUser).authorizeUser(unauthorizedUser.address)
    ).to.be.revertedWith('Ownable: caller is not the owner');

    // Intentar que un usuario no admin remueva un usuario autorizado
    await expect(
      pbbContract.connect(authorizedUser).revokeUser(admin.address)
    ).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it('El admin puede transferir la administración', async function () {
    // Transferir administración a otro usuario
    const txChangeAdmin = await pbbContract.connect(admin).transferOwnership(authorizedUser.address);
    await txChangeAdmin.wait();

    // Verificar que el nuevo admin puede agregar usuarios autorizados
    const txAdd = await pbbContract.connect(authorizedUser).authorizeUser(unauthorizedUser.address);
    await txAdd.wait();

    // Verificar que el antiguo admin ya no puede realizar acciones de admin
    await expect(
      pbbContract.connect(admin).authorizeUser(owner.address)
    ).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it('Se pueden obtener mensajes individuales y en rango', async function () {
    // Agregar varios mensajes
    await pbbContract.connect(authorizedUser).addMessage('Mensaje 1');
    await pbbContract.connect(authorizedUser).addMessage('Mensaje 2');
    await pbbContract.connect(authorizedUser).addMessage('Mensaje 3');

    // Obtener mensaje individual
    const message = await pbbContract.messages(1);
    expect(message.content).to.equal('Mensaje 2');

    // Obtener mensajes en rango (si tu contrato lo permite)
    const messages = await pbbContract.getMessagesInRange(0, 3);
    expect(messages.length).to.equal(3);
    expect(messages[0].content).to.equal('Mensaje 1');
    expect(messages[1].content).to.equal('Mensaje 2');
    expect(messages[2].content).to.equal('Mensaje 3');
  });

  it('No se puede obtener un mensaje con ID inválido', async function () {
    await expect(pbbContract.messages(999)).to.be.reverted;
  });

  it('Eventos se emiten correctamente al agregar mensajes', async function () {
    await expect(
      pbbContract.connect(authorizedUser).addMessage('Evento de prueba')
    )
      .to.emit(pbbContract, 'MessageAdded')
      .withArgs(0, authorizedUser.address, 'Evento de prueba', anyValue);
  });

  it('El contrato puede ser actualizado sin perder el estado', async function () {
    // Agregar un mensaje antes de la actualización
    await pbbContract.connect(authorizedUser).addMessage('Mensaje antes de actualización');

    // Nueva implementación con una función adicional
    const ImplementationV2 = await ethers.getContractFactory('PBBImplementationV2');
    const pbbImplementationV2 = await ImplementationV2.deploy();
    await pbbImplementationV2.waitForDeployment();

    // Actualizar el proxy a la nueva implementación
    await upgrades.upgradeProxy(proxy.address, ImplementationV2);

    // Verificar que el estado se mantiene
    const message = await pbbContract.messages(0);
    expect(message.content).to.equal('Mensaje antes de actualización');

    // Usar la nueva función de la implementación V2
    const newFeatureResult = await proxy.connect(admin).newFeatureFunction();
    expect(newFeatureResult).to.equal('Nueva funcionalidad activa');
  });

  it('Manejo adecuado de entradas inválidas en la creación de PBBs', async function () {
    // Intentar crear un PBB con un nombre vacío
    await expect(
      proxy.connect(admin).createPBB('', [])
    ).to.be.revertedWith('El nombre no puede estar vacío');
  });

  it('Previene ataques comunes y vulnerabilidades', async function () {
    // Simular acciones maliciosas si es necesario
    // Por ejemplo, intentar ataques de reentrada (si aplican)
  });

  */

});
