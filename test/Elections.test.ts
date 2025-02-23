import { expect } from "chai";
import { ethers } from "hardhat";
import { PBBFactory, PublicBulletinBoard } from "../typechain-types";
import { Wallet } from "ethers";

describe("Simulación Completa de Elecciones Universitarias", function () {
  let factory: PBBFactory;
  let pbb: PublicBulletinBoard;
  let deployer: any, professor: any, users: any[];

  // Candidatos de la elección
  const candidates = ["Candidato A", "Candidato B", "Candidato C"];

  // Cantidad total de votantes simulados
  const NUM_VOTERS = 400;

  // Almacenaremos aquí las wallets (o signers) de los votantes
  let voterWallets: Wallet[] = [];

  // Ayudante para dividir un array en lotes (batches)
  const splitIntoBatches = (array: any[], batchSize: number) => {
    const batches = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  };

  before(async function () {
    // 1) Despliegue de contratos
    [deployer, professor, ...users] = await ethers.getSigners();

    // Desplegamos la implementación (PublicBulletinBoard) y esperamos a que esté lista
    const PBBImplFactory = await ethers.getContractFactory("PublicBulletinBoard");
    const implementation = await PBBImplFactory.deploy();
    await implementation.waitForDeployment();

    // Desplegamos la fábrica (PBBFactory) y esperamos
    const PBBFactoryContract = await ethers.getContractFactory("PBBFactory");
    factory = (await PBBFactoryContract.deploy()) as PBBFactory;
    await factory.waitForDeployment();

    // Agregamos la implementación a la fábrica con versión 1
    await factory.addImplementation(1, await implementation.getAddress());

    // Creamos un nuevo PBB para las elecciones
    const txPBB = await factory.createPBB(1, "Elecciones Universitarias");
    await txPBB.wait();

    // Obtenemos la dirección del PBB recién creado
    const filter = factory.filters.PBBCreated(deployer.address, undefined, undefined, undefined);
    const events = await factory.queryFilter(filter);
    const pbbAddress = events[0].args?.pbbAddress;
    expect(pbbAddress).to.not.be.undefined;

    // Conectamos con el PBB
    pbb = (await ethers.getContractAt("PublicBulletinBoard", pbbAddress)) as PublicBulletinBoard;

    // Nombramos al "professor" como administrador adicional
    await pbb.addAdmin(professor.address);
  });

  it("Fase Única: Registro, Revocaciones, Cambios de Admin, Votaciones y Mensajes Extra", async function () {
    // Fase 1: Registro Masivo
    // -----------------------------------------
    const fundingAmount = ethers.parseEther("1.0");

    // Tomamos 400 usuarios para que sean votantes
    for (let i = 0; i < NUM_VOTERS; i++) {
      voterWallets.push(users[i]);
      const txFund = await deployer.sendTransaction({
        to: users[i].address,
        value: fundingAmount,
      });
      await txFund.wait();
    }

    // Añadimos a los 400 votantes en lotes de 50
    const voterAddresses = voterWallets.map(v => v.address);
    const batches = splitIntoBatches(voterAddresses, 50);

    for (let i = 0; i < batches.length; i++) {
      const isDeployerTurn = (i % 2 === 0);
      const caller = isDeployerTurn ? deployer : professor;
      await pbb.connect(caller).addMembers(batches[i]);
    }

    console.log("Se han registrado 400 estudiantes.");

    // Fase 2: Revocaciones (Miembros y Admin)
    // Por ejemplo, revocamos a 10 estudiantes que se añadieron erróneamente
    const erroneouslyAddedMembers = voterAddresses.slice(0, 10);
    for (const member of erroneouslyAddedMembers) {
      const txRemove = await pbb.removeMember(member);
      await txRemove.wait();
    }
    console.log("Se han eliminado 10 alumnos erroneamente registrados.");

    // Revocamos al profesor como admin
    const txRemoveAdmin = await pbb.removeAdmin(professor.address);
    await txRemoveAdmin.wait();

    // Asignamos un nuevo admin (ej: users[10])
    const newAdmin = users[10];
    const txAddNewAdmin = await pbb.addAdmin(newAdmin.address);
    await txAddNewAdmin.wait();

    // Fase 3: Votaciones y Mensajes Extra
    const voteTxs: Promise<any>[] = [];
    const extraMsgTxs: Promise<any>[] = [];
    
    // Nota: Se omiten los primeros 10 que han sido revocados
    for (let i = 10; i < voterWallets.length; i++) {
      const voter = voterWallets[i];
      const candidate = candidates[Math.floor(Math.random() * candidates.length)];

      // Mensaje de voto
      voteTxs.push(
        pbb.connect(voter).addMessage(candidate, "ElectionVote")
      );
    }

    // Esperamos a que todas las promesas de voto finalicen
    const voteReceipts = await Promise.all(voteTxs);
    const extraMsgReceipts = await Promise.all(extraMsgTxs);

    console.log(`Se han emitido ${voteReceipts.length} votos y ${extraMsgReceipts.length} mensajes extra.`);

    // Fase 4: Verificación y Recuento de Votos
    const nextMsgId = await pbb.nextMessageId();

    // 10 miembros revocados => 390 que sí votan
    expect(nextMsgId).to.equal((NUM_VOTERS + 1) - 10);

    // Contamos solo los mensajes con el topic "ElectionVote" para ver cuántos votos hay
    const voteCount: { [candidate: string]: number } = {};
    for (const candidate of candidates) {
      voteCount[candidate] = 0;
    }

    // Empezamos en ID = 1
    for (let id = 1; id < Number(nextMsgId); id++) {
      const message = await pbb.getMessageById(id);

      // Decodificamos el contenido
      const decodedContent = ethers.decodeBytes32String(message.content);
      const decodedTopic = ethers.decodeBytes32String(message.topic);

      // Solo sumamos si es un mensaje de topic "ElectionVote"
      if (decodedTopic === "ElectionVote") {
        if (voteCount[decodedContent] !== undefined) {
          voteCount[decodedContent]++;
        }
      }
    }

    console.log("Resultados de la votación:", voteCount);

    // Determinamos al ganador
    let winningCandidate = "";
    let maxVotes = 0;
    for (const candidate of candidates) {
      if (voteCount[candidate] > maxVotes) {
        maxVotes = voteCount[candidate];
        winningCandidate = candidate;
      }
    }
    console.log(`Candidato ganador: ${winningCandidate} con ${maxVotes} votos`);

    // Comprobamos que el total de votos sea 390
    const totalVotes = Object.values(voteCount).reduce((a, b) => a + b, 0);
    expect(totalVotes).to.equal(390);

    console.log("Simulación completada con éxito.");
  });
});
