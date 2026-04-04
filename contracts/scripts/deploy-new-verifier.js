/**
 * Deploy new 1-signal Verifier and update Executor
 */

const hre = require("hardhat");
const ethers = hre.ethers;
const fs = require("fs");

async function main() {
  const [signer] = await hre.ethers.getSigners();
  console.log("\n" + "=".repeat(70));
  console.log("[DEPLOY] Step 1: Deploy New PolicyCheckVerifier (1-signal)");
  console.log("=".repeat(70));

  // Deploy the new verifier
  const PolicyCheckVerifier = await hre.ethers.getContractFactory("Groth16Verifier");
  const verifier = await PolicyCheckVerifier.deploy();
  await verifier.deployed();

  console.log(`✓ New Verifier deployed: ${verifier.address}`);
  console.log(`  Etherscan: https://sepolia.etherscan.io/address/${verifier.address}\n`);

  // Load deployments and get Executor address
  const deployments = JSON.parse(fs.readFileSync("./deployments.json"));
  const executorAddr = deployments.Executor || deployments["0x2131aB1c9F3F9E7155FF2f29C62cac31564D0114"];

  console.log("[DEPLOY] Step 2: Update Executor with new Verifier address");
  console.log("-".repeat(70));

  const Executor = await hre.ethers.getContractAt("Executor", executorAddr);
  console.log(`Executor: ${executorAddr}`);

  const tx = await Executor.setPolicyCheckVerifier(verifier.address);
  const receipt = await tx.wait();

  console.log(`✓ Executor now uses new Verifier`);
  console.log(`  Tx: https://sepolia.etherscan.io/tx/${tx.hash}`);
  console.log(`  Block: ${receipt.blockNumber}\n`);

  // Update deployments.json
  deployments.PolicyCheckVerifier = verifier.address;
  deployments.VerifierDeploymentNote =  "1-signal circuit verifier (from policy_check_final_new.zkey)";
  deployments.VerifierDeploymentTimestamp = new Date().toISOString();

  fs.writeFileSync("./deployments.json", JSON.stringify(deployments, null, 2));

  console.log("[SUMMARY]");
  console.log("=".repeat(70));
  console.log(`✓ New verifier deployed: ${verifier.address}`);
  console.log(`✓ Executor updated with new verifier`);
  console.log(`✓ Deployments.json updated\n`);
  console.log("Ready for corrected proof test!");
  console.log("=".repeat(70) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
