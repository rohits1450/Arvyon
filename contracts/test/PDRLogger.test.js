const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PDRLogger", function () {
  let pdrLogger;
  let owner, agent1, agent2;

  beforeEach(async function () {
    [owner, agent1, agent2] = await ethers.getSigners();
    const PDRLogger = await ethers.getContractFactory("PDRLogger");
    pdrLogger = await PDRLogger.deploy();
    await pdrLogger.deployed();
  });

  describe("logDecision", function () {
    it("Should log decision successfully", async function () {
      const policyHash = ethers.utils.id("test-policy");
      const actionType = "TRADE";

      const tx = await pdrLogger.logDecision(agent1.address, actionType, policyHash, true);
      await tx.wait();

      // If no error thrown, test passes
      expect(tx).to.not.be.null;
    });

    it("Should log decision with isCompliant = false", async function () {
      const policyHash = ethers.utils.id("test-policy");
      const actionType = "VOTE";

      const tx = await pdrLogger.logDecision(agent1.address, actionType, policyHash, false);
      await tx.wait();

      expect(tx).to.not.be.null;
    });

    it("Should log multiple decisions with different agents", async function () {
      const hash1 = ethers.utils.id("policy-1");
      const hash2 = ethers.utils.id("policy-2");

      const tx1 = await pdrLogger.logDecision(agent1.address, "ACTION_A", hash1, true);
      const tx2 = await pdrLogger.logDecision(agent2.address, "ACTION_B", hash2, false);

      await tx1.wait();
      await tx2.wait();

      expect(tx1).to.not.be.null;
      expect(tx2).to.not.be.null;
    });

    it("Should log decision with different action types", async function () {
      const policyHash = ethers.utils.id("test-policy");
      const actionTypes = ["TRADE", "VOTE", "DATA_ACCESS", "EXECUTE"];

      for (const actionType of actionTypes) {
        const tx = await pdrLogger.logDecision(agent1.address, actionType, policyHash, true);
        await tx.wait();
        expect(tx).to.not.be.null;
      }
    });

    it("Should allow any address to log decisions", async function () {
      const policyHash = ethers.utils.id("test-policy");

      const tx1 = await pdrLogger.connect(owner).logDecision(agent1.address, "ACTION", policyHash, true);
      const tx2 = await pdrLogger.connect(agent1).logDecision(agent2.address, "ACTION", policyHash, true);
      const tx3 = await pdrLogger.connect(agent2).logDecision(owner.address, "ACTION", policyHash, false);

      await tx1.wait();
      await tx2.wait();
      await tx3.wait();

      expect(tx1).to.not.be.null;
      expect(tx2).to.not.be.null;
      expect(tx3).to.not.be.null;
    });

    it("Should handle empty string action types", async function () {
      const policyHash = ethers.utils.id("test-policy");

      const tx = await pdrLogger.logDecision(agent1.address, "", policyHash, true);
      await tx.wait();

      expect(tx).to.not.be.null;
    });

    it("Should handle zero policy hash", async function () {
      const actionType = "ACTION";

      const tx = await pdrLogger.logDecision(agent1.address, actionType, ethers.constants.HashZero, true);
      await tx.wait();

      expect(tx).to.not.be.null;
    });
  });
});
