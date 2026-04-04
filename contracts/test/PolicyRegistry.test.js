const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PolicyRegistry", function () {
  let policyRegistry;
  let owner, user1, user2;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    const PolicyRegistry = await ethers.getContractFactory("PolicyRegistry");
    policyRegistry = await PolicyRegistry.deploy();
    await policyRegistry.deployed();
  });

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      expect(await policyRegistry.owner()).to.equal(owner.address);
    });
  });

  describe("registerPolicy", function () {
    it("Should register a policy successfully", async function () {
      const policyHash = ethers.utils.id("test-policy");
      await policyRegistry.connect(user1).registerPolicy(policyHash);

      expect(await policyRegistry.getPolicy(user1.address)).to.equal(policyHash);
      expect(await policyRegistry.hasPolicy(user1.address)).to.be.true;
    });

    it("Should reject empty policy hash", async function () {
      try {
        await policyRegistry.connect(user1).registerPolicy(ethers.constants.HashZero);
        expect.fail("Should have reverted");
      } catch (err) {
        expect(err.message).to.include("Policy hash cannot be empty");
      }
    });

    it("Should prevent duplicate registration", async function () {
      const policyHash = ethers.utils.id("test-policy");
      await policyRegistry.connect(user1).registerPolicy(policyHash);

      const newHash = ethers.utils.id("another-policy");
      try {
        await policyRegistry.connect(user1).registerPolicy(newHash);
        expect.fail("Should have reverted");
      } catch (err) {
        expect(err.message).to.include("Policy already registered");
      }
    });

    it("Should allow different users to register different policies", async function () {
      const hash1 = ethers.utils.id("policy-1");
      const hash2 = ethers.utils.id("policy-2");

      await policyRegistry.connect(user1).registerPolicy(hash1);
      await policyRegistry.connect(user2).registerPolicy(hash2);

      expect(await policyRegistry.getPolicy(user1.address)).to.equal(hash1);
      expect(await policyRegistry.getPolicy(user2.address)).to.equal(hash2);
    });

    it("Should set correct timestamp on registration", async function () {
      const policyHash = ethers.utils.id("test-policy");
      const blockBefore = await ethers.provider.getBlock("latest");
      await policyRegistry.connect(user1).registerPolicy(policyHash);
      const blockAfter = await ethers.provider.getBlock("latest");

      const timestamp = await policyRegistry.getPolicyTimestamp(user1.address);
      expect(timestamp.gte(blockBefore.timestamp)).to.be.true;
      expect(timestamp.lte(blockAfter.timestamp)).to.be.true;
    });
  });

  describe("updatePolicy", function () {
    beforeEach(async function () {
      const policyHash = ethers.utils.id("original-policy");
      await policyRegistry.connect(user1).registerPolicy(policyHash);
    });

    it("Should update a policy successfully", async function () {
      const oldHash = await policyRegistry.getPolicy(user1.address);
      const newHash = ethers.utils.id("updated-policy");

      await policyRegistry.connect(user1).updatePolicy(newHash);
      expect(await policyRegistry.getPolicy(user1.address)).to.equal(newHash);
    });

    it("Should reject empty new policy hash", async function () {
      try {
        await policyRegistry.connect(user1).updatePolicy(ethers.constants.HashZero);
        expect.fail("Should have reverted");
      } catch (err) {
        expect(err.message).to.include("New policy hash cannot be empty");
      }
    });

    it("Should reject if no policy exists", async function () {
      const newHash = ethers.utils.id("some-policy");
      try {
        await policyRegistry.connect(user2).updatePolicy(newHash);
        expect.fail("Should have reverted");
      } catch (err) {
        expect(err.message).to.include("No policy registered");
      }
    });

    it("Should reject if new hash equals old hash", async function () {
      const currentHash = await policyRegistry.getPolicy(user1.address);
      try {
        await policyRegistry.connect(user1).updatePolicy(currentHash);
        expect.fail("Should have reverted");
      } catch (err) {
        expect(err.message).to.include("must be different");
      }
    });

    it("Should update timestamp on policy update", async function () {
      const oldTimestamp = await policyRegistry.getPolicyTimestamp(user1.address);
      await ethers.provider.send("hardhat_mine", []);

      const newHash = ethers.utils.id("updated-policy");
      await policyRegistry.connect(user1).updatePolicy(newHash);
      const newTimestamp = await policyRegistry.getPolicyTimestamp(user1.address);

      expect(newTimestamp.gt(oldTimestamp)).to.be.true;
    });
  });

  describe("revokePolicy", function () {
    beforeEach(async function () {
      const policyHash = ethers.utils.id("test-policy");
      await policyRegistry.connect(user1).registerPolicy(policyHash);
    });

    it("Should revoke a policy successfully", async function () {
      await policyRegistry.connect(user1).revokePolicy();

      expect(await policyRegistry.getPolicy(user1.address)).to.equal(ethers.constants.HashZero);
      expect(await policyRegistry.hasPolicy(user1.address)).to.be.false;
    });

    it("Should reject revoke if no policy exists", async function () {
      try {
        await policyRegistry.connect(user2).revokePolicy();
        expect.fail("Should have reverted");
      } catch (err) {
        expect(err.message).to.include("No policy registered");
      }
    });

    it("Should allow re-registration after revocation", async function () {
      await policyRegistry.connect(user1).revokePolicy();

      const newHash = ethers.utils.id("new-policy");
      await policyRegistry.connect(user1).registerPolicy(newHash);

      expect(await policyRegistry.getPolicy(user1.address)).to.equal(newHash);
      expect(await policyRegistry.hasPolicy(user1.address)).to.be.true;
    });
  });

  describe("ViewFunctions", function () {
    it("getPolicy should return zero for unregistered user", async function () {
      expect(await policyRegistry.getPolicy(user1.address)).to.equal(ethers.constants.HashZero);
    });

    it("hasPolicy should return false for unregistered user", async function () {
      expect(await policyRegistry.hasPolicy(user1.address)).to.be.false;
    });

    it("getPolicyTimestamp should return zero for unregistered user", async function () {
      const timestamp = await policyRegistry.getPolicyTimestamp(user1.address);
      expect(timestamp.toNumber()).to.equal(0);
    });
  });
});
