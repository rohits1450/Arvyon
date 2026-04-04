/**
 * Test: Direct ZK Verifier Gas Analysis
 * This test isolates just the verifier.verifyProof() call to measure gas consumption
 */

const hre = require("hardhat");
const ethers = hre.ethers;
const fs = require("fs");

async function main() {
  const [signer] = await hre.ethers.getSigners();

  // Decode the proofs
  const deployments = JSON.parse(fs.readFileSync("./deployments.json"));
  const verifierAddr = deployments.PolicyCheckVerifier;
  const proofData = JSON.parse(fs.readFileSync("../agent/circuits/proof_real.json"));

  // Load verifier
  const Verifier = await hre.ethers.getContractAt("Groth16Verifier", verifierAddr);

  console.log("=".repeat(70));
  console.log("[TEST] Direct Verifier Gas Analysis");
  console.log("=".repeat(70));
  console.log(`Verifier: ${verifierAddr}\n`);

  // Extract proof components
  const proofA = [proofData.proof.pi_a[0], proofData.proof.pi_a[1]];
  const proofB = [
    [proofData.proof.pi_b[0][0], proofData.proof.pi_b[0][1]],
    [proofData.proof.pi_b[1][0], proofData.proof.pi_b[1][1]]
  ];
  const proofC = [proofData.proof.pi_c[0], proofData.proof.pi_c[1]];
  const pubSignals = proofData.publicSignals.map(s => BigInt(s));

  console.log("Calling verifier.verifyProof() directly...\n");

  // Call verifier directly (view call, so no gas estimate provided)
  const isValid = await Verifier.verifyProof(proofA, proofB, proofC, pubSignals);
  console.log(`Verification result: ${isValid}`);
  console.log(`(Note: view functions don't report gas in ethers.js, but transaction would show it)\n`);

  // Now test via a transaction to get gas
  console.log("Testing via transaction (state mutation):\n");

  // Deploy debug contract
  const DebugFactory = await hre.ethers.getContractFactory("VerifierDebug");
  const debug = await DebugFactory.deploy(verifierAddr);
  await debug.deployed();
  console.log(`DebugContract deployed: ${debug.address}`);

  const tx = await debug.testVerifyProof(proofA, proofB, proofC, pubSignals);
  const receipt = await tx.wait();

  console.log(`Gas used: ${receipt.gasUsed.toString()}`);
  console.log(`Block: ${receipt.blockNumber}`);
  console.log(`Tx: ${tx.hash}\n`);

  if (receipt.gasUsed > 1000000n) {
    console.log("⚠️ WARNING: Verifier used > 1M gas!");
    console.log("This indicates the verification is failing and looping.");
  } else {
    console.log("✓ Normal gas usage for verifier");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
