const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Executor", function () {
  let policyRegistry, pdrLogger, executor;
  let owner, agent1, agent2, unauthorizedUser;

  beforeEach(async function () {
    [owner, agent1, agent2, unauthorizedUser] = await ethers.getSigners();

    // Deploy PolicyRegistry
    const PolicyRegistry = await ethers.getContractFactory("PolicyRegistry");
    policyRegistry = await PolicyRegistry.deploy();
    await policyRegistry.deployed();

    // Deploy PDRLogger
    const PDRLogger = await ethers.getContractFactory("PDRLogger");
    pdrLogger = await PDRLogger.deploy();
    await pdrLogger.deployed();

    // Deploy Verifier (PolicyCheckVerifier)
    const Verifier = await ethers.getContractFactory("Groth16Verifier");
    const verifier = await Verifier.deploy();
    await verifier.deployed();

    // Deploy Executor
    const Executor = await ethers.getContractFactory("Executor");
    executor = await Executor.deploy(policyRegistry.address, pdrLogger.address, verifier.address);
    await executor.deployed();
  });

  describe("Deployment", function () {
    it("Should set correct owner", async function () {
      expect(await executor.owner()).to.equal(owner.address);
    });

    it("Should set correct PolicyRegistry address", async function () {
      expect(await executor.policyRegistry()).to.equal(policyRegistry.address);
    });

    it("Should set correct PDRLogger address", async function () {
      expect(await executor.pdrLogger()).to.equal(pdrLogger.address);
    });

    it("Should set correct PolicyCheckVerifier address", async function () {
      const verifier = await ethers.getContractFactory("Groth16Verifier");
      const verifierInstance = await verifier.deploy();
      await verifierInstance.deployed();

      const newExecutor = await ethers.getContractFactory("Executor");
      const executor2 = await newExecutor.deploy(policyRegistry.address, pdrLogger.address, verifierInstance.address);
      await executor2.deployed();

      expect(await executor2.policyCheckVerifier()).to.equal(verifierInstance.address);
    });
  });

  describe("executeWithVerification", function () {
    beforeEach(async function () {
      const policyHash = ethers.utils.id("agent1-policy");
      await policyRegistry.connect(agent1).registerPolicy(policyHash);
    });

    // NOTE: These tests are updated to work with the new ZK proof signature
    // Real proof generation requires the SnarkJS pipeline
    // For now, we test that the function accepts the correct parameters

    it("Should fail execution when agent has no policy", async function () {
      try {
        // Create dummy proof data
        const proofA = [0, 0];
        const proofB = [[0, 0], [0, 0]];
        const proofC = [0, 0];
        const pubSignals = [1, 50, 10, 100]; // [isCompliant, actionValue, policyMin, policyMax]

        await executor.executeWithVerification(agent2.address, "VOTE", proofA, proofB, proofC, pubSignals);
        expect.fail("Should have reverted");
      } catch (err) {
        expect(err.message).to.include("must have registered policy");
      }
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      const policyHash = ethers.utils.id("agent1-policy");
      await policyRegistry.connect(agent1).registerPolicy(policyHash);
    });

    it("getAgentPolicy should return correct policy hash", async function () {
      const expectedHash = await policyRegistry.getPolicy(agent1.address);
      const actualHash = await executor.getAgentPolicy(agent1.address);
      expect(actualHash).to.equal(expectedHash);
    });

    it("isAgentCompliant should return true for registered agent", async function () {
      expect(await executor.isAgentCompliant(agent1.address)).to.be.true;
    });

    it("isAgentCompliant should return false for unregistered agent", async function () {
      expect(await executor.isAgentCompliant(agent2.address)).to.be.false;
    });
  });

  describe("Owner Functions", function () {
    it("Should allow owner to update PolicyRegistry address", async function () {
      const PolicyRegistry = await ethers.getContractFactory("PolicyRegistry");
      const newPolicyRegistry = await PolicyRegistry.deploy();
      await newPolicyRegistry.deployed();

      const tx = await executor.connect(owner).setPolicyRegistry(newPolicyRegistry.address);
      await tx.wait();

      expect(await executor.policyRegistry()).to.equal(newPolicyRegistry.address);
    });

    it("Should allow owner to update PDRLogger address", async function () {
      const PDRLogger = await ethers.getContractFactory("PDRLogger");
      const newPDRLogger = await PDRLogger.deploy();
      await newPDRLogger.deployed();

      const tx = await executor.connect(owner).setPDRLogger(newPDRLogger.address);
      await tx.wait();

      expect(await executor.pdrLogger()).to.equal(newPDRLogger.address);
    });

    it("Should prevent non-owner from updating PolicyRegistry", async function () {
      const PolicyRegistry = await ethers.getContractFactory("PolicyRegistry");
      const newPolicyRegistry = await PolicyRegistry.deploy();
      await newPolicyRegistry.deployed();

      try {
        await executor.connect(agent1).setPolicyRegistry(newPolicyRegistry.address);
        expect.fail("Should have reverted");
      } catch (err) {
        expect(err.message).to.include("Only owner");
      }
    });

    it("Should prevent non-owner from updating PDRLogger", async function () {
      const PDRLogger = await ethers.getContractFactory("PDRLogger");
      const newPDRLogger = await PDRLogger.deploy();
      await newPDRLogger.deployed();

      try {
        await executor.connect(agent1).setPDRLogger(newPDRLogger.address);
        expect.fail("Should have reverted");
      } catch (err) {
        expect(err.message).to.include("Only owner");
      }
    });
  });

  describe("Integration Tests", function () {
    it("Should handle complete policy lifecycle: register -> execute -> update -> execute again", async function () {
      const initialHash = ethers.utils.id("policy-v1");
      await policyRegistry.connect(agent1).registerPolicy(initialHash);

      // Create dummy proof data
      const proofA = [0, 0];
      const proofB = [[0, 0], [0, 0]];
      const proofC = [0, 0];
      const pubSignals = [1, 50, 10, 100]; // [isCompliant, actionValue, policyMin, policyMax]

      let tx = await executor.executeWithVerification(agent1.address, "ACTION_1", proofA, proofB, proofC, pubSignals);
      await tx.wait();

      const updatedHash = ethers.utils.id("policy-v2");
      await policyRegistry.connect(agent1).updatePolicy(updatedHash);

      tx = await executor.executeWithVerification(agent1.address, "ACTION_2", proofA, proofB, proofC, pubSignals);
      await tx.wait();

      expect(tx).to.not.be.null;
    });

    it("Should maintain separate policies for different agents", async function () {
      const policy1 = ethers.utils.id("policy-1");
      const policy2 = ethers.utils.id("policy-2");

      await policyRegistry.connect(agent1).registerPolicy(policy1);
      await policyRegistry.connect(agent2).registerPolicy(policy2);

      const hash1 = await executor.getAgentPolicy(agent1.address);
      const hash2 = await executor.getAgentPolicy(agent2.address);

      expect(hash1).to.equal(policy1);
      expect(hash2).to.equal(policy2);
    });
  });
});
