const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log(`🔑 Deployer: ${deployer.address}\n`);

  const deploymentPath = path.join(__dirname, "..", "deployments.json");
  let deployments = {};

  if (fs.existsSync(deploymentPath)) {
    deployments = JSON.parse(fs.readFileSync(deploymentPath, "utf-8"));
  }

  // Step 1: Deploy PolicyRegistry
  console.log("📋 Step 1: Deploying PolicyRegistry...");
  const PolicyRegistry = await hre.ethers.getContractFactory("PolicyRegistry");
  const policyRegistry = await PolicyRegistry.deploy();
  await policyRegistry.deployed();
  console.log(`✅ PolicyRegistry deployed to: ${policyRegistry.address}\n`);

  // Step 2: Deploy PDRLogger
  console.log("📝 Step 2: Deploying PDRLogger...");
  const PDRLogger = await hre.ethers.getContractFactory("PDRLogger");
  const pdrLogger = await PDRLogger.deploy();
  await pdrLogger.deployed();
  console.log(`✅ PDRLogger deployed to: ${pdrLogger.address}\n`);

  // Step 3: Deploy PolicyCheckVerifier (ZK proof verifier)
  console.log("🔐 Step 3: Deploying PolicyCheckVerifier...");
  const PolicyCheckVerifier = await hre.ethers.getContractFactory("Groth16Verifier");
  const verifier = await PolicyCheckVerifier.deploy();
  await verifier.deployed();
  console.log(`✅ PolicyCheckVerifier deployed to: ${verifier.address}\n`);

  // Step 4: Deploy Executor with references to the other contracts
  console.log("⚙️  Step 4: Deploying Executor...");
  const Executor = await hre.ethers.getContractFactory("Executor");
  const executor = await Executor.deploy(policyRegistry.address, pdrLogger.address, verifier.address);
  await executor.deployed();
  console.log(`✅ Executor deployed to: ${executor.address}\n`);

  // Save all deployment addresses
  deployments["PolicyRegistry"] = policyRegistry.address;
  deployments["PDRLogger"] = pdrLogger.address;
  deployments["PolicyCheckVerifier"] = verifier.address;
  deployments["Executor"] = executor.address;
  deployments["deployer"] = deployer.address;
  deployments["timestamp"] = new Date().toISOString();

  fs.writeFileSync(deploymentPath, JSON.stringify(deployments, null, 2));

  console.log("📦 All deployments saved to deployments.json:");
  console.log(JSON.stringify(deployments, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});