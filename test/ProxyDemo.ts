import { expect } from "chai";
import { ignition, ethers } from "hardhat";



import PrimeraVersion from "../ignition/modules/PrimeraVersion";
import SegundaVersion from "../ignition/modules/SegundaVersion";

describe("Demo Proxy", function () {
  //const [, otherAccount] = await ethers.getSigners();

  describe("Proxy interaction", async function () {

    it("Should be interactable via proxy", async function () {
      const { proxyV1 } = await ignition.deploy(PrimeraVersion);
      console.log(await proxyV1.getAddress());
      
      await proxyV1.addMessage("Hola 1");
      await proxyV1.addMessage("Hola 2");
      await proxyV1.addMessage("Hola 3");
      
      expect(await proxyV1.getMessage(0)).to.equal("Hola 1");
      expect(await proxyV1.getMessage(1)).to.equal("Hola 2");
      expect(await proxyV1.getMessage(2)).to.equal("Hola 3");
    });

  });

  describe("Upgrade Proxy", async function () {

    it("Should persist data after upgrading", async function () {
      
      const { proxyV1 } = await ignition.deploy(PrimeraVersion);
      console.log(await proxyV1.getAddress());

      await proxyV1.addMessage("Hola 1");
      await proxyV1.addMessage("Hola 2");
      await proxyV1.addMessage("Hola 3");


      const { proxyV2 } = await ignition.deploy(SegundaVersion)
      console.log(await proxyV2.getAddress());

      expect(await proxyV2.getMessage(0)).to.equal("Hola 1");
      expect(await proxyV2.getMessage(1)).to.equal("Hola 2");
      expect(await proxyV2.getMessage(2)).to.equal("Hola 3");
      
    });
  });

});
