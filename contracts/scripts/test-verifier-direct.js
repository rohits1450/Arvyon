/**
 * Test: Solidity Verifier Direct Test
 * Tests if the Solidity verifier can validate the real proof
 */

const hre = require("hardhat");
const ethers = hre.ethers;
const fs = require("fs");

async function main() {
  const [signer] = await hre.ethers.getSigners();

  const deployments = JSON.parse(fs.readFileSync("./deployments.json"));
  const verifierAddr = deployments.PolicyCheckVerifier;

  const proofData = JSON.parse(fs.readFileSync("../agent/circuits/proof_new.json"));
  const pubSignals = JSON.parse(fs.readFileSync("../agent/circuits/public_new.json"));

  const Verifier = await hre.ethers.getContractAt("Groth16Verifier", verifierAddr);

  console.log("=".repeat(70));
  console.log("[TEST] Solidity Verifier Direct Verification");
  console.log("=".repeat(70));

  // Extract proof components
  const proofA = [proofData.pi_a[0], proofData.pi_a[1]];
  const proofB = [
    [proofData.pi_b[0][0], proofData.pi_b[0][1]],
    [proofData.pi_b[1][0], proofData.pi_b[1][1]]
  ];
  const proofC = [proofData.pi_c[0], proofData.pi_c[1]];
  const signals = pubSignals.map(s => BigInt(s));

  console.log("\nProof Components:");
  console.log(`  pi_a[0]: ${proofA[0].toString().slice(0, 20)}...`);
  console.log(`  pi_b[0][0]: ${proofB[0][0].toString().slice(0, 20)}...`);
  console.log(`  pi_c[0]: ${proofC[0].toString().slice(0, 20)}...`);
  console.log(`  pubSignals: [${signals}]`);

  // Call verifier as view function
  console.log("\nCalling verifyProof (view function)...");
  try {
    const isValid = await Verifier.verifyProof(proofA, proofB, proofC, signals);
    console.log(`Result: ${isValid}\n`);

    if (isValid) {
      console.log("✓ PROOF VERIFIED SUCCESSFULLY!");
    } else {
      console.log("✗ PROOF FAILED VERIFICATION!");
      console.log("\nDiagnostics:");
      console.log("- The proof failed verification in Solidity");
      console.log("- But it passed in SnarkJS - this suggests a mismatch");
      console.log("- Check field element conversions/endianness");
    }
  } catch (e) {
    console.log(`Error calling verifier: ${e.message}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
