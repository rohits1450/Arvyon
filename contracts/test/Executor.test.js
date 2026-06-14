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
        const pubSignals = [1]; // [isCompliant]

        await executor.executeWithVerification(agent2.address, "VOTE", ethers.constants.AddressZero, "0x", proofA, proofB, proofC, pubSignals);
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
      const pubSignals = [1]; // [isCompliant]
      const ZERO = ethers.constants.AddressZero;

      let tx = await executor.executeWithVerification(agent1.address, "ACTION_1", ZERO, "0x", proofA, proofB, proofC, pubSignals);
      await tx.wait();

      const updatedHash = ethers.utils.id("policy-v2");
      await policyRegistry.connect(agent1).updatePolicy(updatedHash);

      tx = await executor.executeWithVerification(agent1.address, "ACTION_2", ZERO, "0x", proofA, proofB, proofC, pubSignals);
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

  describe("Real Execution (authorized action dispatch)", function () {
    // These tests use a MockVerifier so verifyProof() can be forced true/false,
    // exercising the Executor's real-action dispatch path without a SnarkJS proof.
    let mockExecutor, mockVerifier, mockTarget;
    const proofA = [0, 0];
    const proofB = [[0, 0], [0, 0]];
    const proofC = [0, 0];
    const compliant = [1]; // pubSignals[0] = isCompliant

    beforeEach(async function () {
      await policyRegistry.connect(agent1).registerPolicy(ethers.utils.id("exec-policy"));

      const MockVerifier = await ethers.getContractFactory("MockVerifier");
      mockVerifier = await MockVerifier.deploy(true);
      await mockVerifier.deployed();

      const MockTarget = await ethers.getContractFactory("MockTarget");
      mockTarget = await MockTarget.deploy();
      await mockTarget.deployed();

      const Executor = await ethers.getContractFactory("Executor");
      mockExecutor = await Executor.deploy(policyRegistry.address, pdrLogger.address, mockVerifier.address);
      await mockExecutor.deployed();
    });

    it("dispatches the action to the target when authorized", async function () {
      const payload = mockTarget.interface.encodeFunctionData("ping", [42]);

      const tx = await mockExecutor.executeWithVerification(
        agent1.address, "TRADE", mockTarget.address, payload,
        proofA, proofB, proofC, compliant,
      );
      await tx.wait();

      expect((await mockTarget.callCount()).toNumber()).to.equal(1);
      expect((await mockTarget.lastArg()).toNumber()).to.equal(42);
      expect(await mockTarget.lastCaller()).to.equal(mockExecutor.address);
    });

    it("forwards ETH value to the target on an authorized action", async function () {
      const payload = mockTarget.interface.encodeFunctionData("ping", [7]);
      const value = ethers.utils.parseEther("0.01");

      await mockExecutor.executeWithVerification(
        agent1.address, "TRADE", mockTarget.address, payload,
        proofA, proofB, proofC, compliant, { value },
      );

      expect((await mockTarget.lastValue()).toString()).to.equal(value.toString());
      expect((await ethers.provider.getBalance(mockTarget.address)).toString()).to.equal(value.toString());
    });

    it("emits ActionExecuted for an authorized action", async function () {
      const payload = mockTarget.interface.encodeFunctionData("ping", [1]);
      const tx = await mockExecutor.executeWithVerification(
        agent1.address, "TRADE", mockTarget.address, payload,
        proofA, proofB, proofC, compliant,
      );
      const receipt = await tx.wait();
      const event = receipt.events.find((e) => e.event === "ActionExecuted");
      expect(event, "ActionExecuted not emitted").to.not.be.undefined;
      expect(event.args.target).to.equal(mockTarget.address);
      expect(event.args.success).to.be.true;
    });

    it("does NOT dispatch when the proof is invalid (unauthorized)", async function () {
      await mockVerifier.setResult(false);
      const payload = mockTarget.interface.encodeFunctionData("ping", [99]);

      const tx = await mockExecutor.executeWithVerification(
        agent1.address, "TRADE", mockTarget.address, payload,
        proofA, proofB, proofC, compliant,
      );
      await tx.wait();

      expect((await mockTarget.callCount()).toNumber()).to.equal(0);
    });

    it("does NOT dispatch when compliance flag is 0", async function () {
      const payload = mockTarget.interface.encodeFunctionData("ping", [99]);

      const tx = await mockExecutor.executeWithVerification(
        agent1.address, "TRADE", mockTarget.address, payload,
        proofA, proofB, proofC, [0],
      );
      await tx.wait();

      expect((await mockTarget.callCount()).toNumber()).to.equal(0);
    });

    it("refunds forwarded value when no action is dispatched", async function () {
      await mockVerifier.setResult(false);
      const value = ethers.utils.parseEther("0.05");

      // Unauthorized + value sent: value must not be trapped in the Executor.
      await mockExecutor.connect(agent1).executeWithVerification(
        agent1.address, "TRADE", mockTarget.address, "0x",
        proofA, proofB, proofC, compliant, { value },
      );

      expect((await ethers.provider.getBalance(mockExecutor.address)).toString()).to.equal("0");
    });

    it("verifies and logs without dispatching when target is address(0)", async function () {
      const tx = await mockExecutor.executeWithVerification(
        agent1.address, "TRADE", ethers.constants.AddressZero, "0x",
        proofA, proofB, proofC, compliant,
      );
      await tx.wait();

      expect((await mockTarget.callCount()).toNumber()).to.equal(0);
    });

    it("reverts the whole tx when the dispatched action reverts", async function () {
      // Encode a call to a non-existent selector on MockTarget; the low-level
      // call returns success=false for a revert, which the Executor surfaces.
      const badPayload = "0xdeadbeef";
      let reverted = false;
      try {
        await mockExecutor.executeWithVerification(
          agent1.address, "TRADE", mockTarget.address, badPayload,
          proofA, proofB, proofC, compliant,
        );
      } catch (err) {
        reverted = true;
        expect(err.message).to.include("action call reverted");
      }
      expect(reverted).to.be.true;
    });
  });
});
