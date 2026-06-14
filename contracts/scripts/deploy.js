/**
 * Deploy the full Arvyon contract suite and write contracts/deployments.json,
 * then sync addresses into the frontend. The Groth16Verifier is generated from
 * agent/circuits/zkey_final.zkey, so proofs produced by the agent verify on-chain.
 *
 * Local:   npx hardhat run scripts/deploy.js
 * Sepolia: npx hardhat run scripts/deploy.js --network sepolia   (needs .env)
 */
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");
const { sync } = require("./sync-config");
const { exportVerifier } = require("./export-verifier");

async function main() {
  // Re-derive the on-chain verifier from the agent's canonical proving key
  // BEFORE compiling, so the deployed Groth16Verifier always matches the zkey
  // the agent generates proofs with — they can never silently drift apart.
  exportVerifier();
  await hre.run("compile");

  const [deployer] = await hre.ethers.getSigners();
  const network = hre.network.name;
  const chainId = (await hre.ethers.provider.getNetwork()).chainId;
  console.log(`Network: ${network} (chainId ${chainId})`);
  console.log(`Deployer: ${deployer.address}\n`);

  const deploymentPath = path.join(__dirname, "..", "deployments.json");

  console.log("Deploying PolicyRegistry...");
  const PolicyRegistry = await hre.ethers.getContractFactory("PolicyRegistry");
  const policyRegistry = await PolicyRegistry.deploy();
  await policyRegistry.deployed();

  console.log("Deploying PDRLogger...");
  const PDRLogger = await hre.ethers.getContractFactory("PDRLogger");
  const pdrLogger = await PDRLogger.deploy();
  await pdrLogger.deployed();

  console.log("Deploying PolicyCheckVerifier (Groth16Verifier)...");
  const Verifier = await hre.ethers.getContractFactory("Groth16Verifier");
  const verifier = await Verifier.deploy();
  await verifier.deployed();

  console.log("Deploying Executor...");
  const Executor = await hre.ethers.getContractFactory("Executor");
  const executor = await Executor.deploy(
    policyRegistry.address,
    pdrLogger.address,
    verifier.address,
  );
  await executor.deployed();

  const deployments = {
    network,
    chainId: Number(chainId),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    note: "Single source of truth for Arvyon contract addresses. Verifier generated from agent/circuits/zkey_final.zkey.",
    contracts: {
      PolicyRegistry: { address: policyRegistry.address },
      PDRLogger: { address: pdrLogger.address },
      PolicyCheckVerifier: { address: verifier.address },
      Executor: { address: executor.address },
    },
    // Flat aliases kept for the Python agent (agent/chain.py) and tooling.
    PolicyRegistry: policyRegistry.address,
    PDRLogger: pdrLogger.address,
    PolicyCheckVerifier: verifier.address,
    Executor: executor.address,
  };

  fs.writeFileSync(deploymentPath, JSON.stringify(deployments, null, 2) + "\n");
  console.log("\nSaved deployments.json:");
  console.log(JSON.stringify(deployments.contracts, null, 2));

  // Propagate addresses into the frontend so nothing is hardcoded.
  sync();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
