/**
 * Test: Solidity Verifier with Explicit BigInt Conversion
 * Tests if the issue is type conversion related
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
  console.log("[TEST] Solidity Verifier with Explicit Type Conversion");
  console.log("=".repeat(70));

  // Extract and convert all elements
  const proofA = [BigInt(proofData.pi_a[0]), BigInt(proofData.pi_a[1])];
  const proofB = [
    [BigInt(proofData.pi_b[0][0]), BigInt(proofData.pi_b[0][1])],
    [BigInt(proofData.pi_b[1][0]), BigInt(proofData.pi_b[1][1])]
  ];
  const proofC = [BigInt(proofData.pi_c[0]), BigInt(proofData.pi_c[1])];
  const signals = pubSignals.map(s => BigInt(s));

  console.log("\nProof Components (as BigInt):");
 console.log(`pi_a[0]: ${proofA[0]}`);
  console.log(`pi_b[0][0]: ${proofB[0][0]}`);
  console.log(`pi_c[0]: ${proofC[0]}`);
  console.log(`pubSignals[0]: ${signals[0]}`);

  console.log("\nCalling verifyProof...");
  try {
    const result = await Verifier.verifyProof(proofA, proofB, proofC, signals);
    console.log(`Result: ${result}`);

    if (!result) {
      console.log("\n✗ Proof verification FAILED in Solidity (result = false)");
      console.log("\nDebugInfo:");
      console.log("- Proof structure: pi_a[2], pi_b[2][2], pi_c[2]");
      console.log("- Public signals: [1] (1 signal)");
      console.log("- SnarkJS verification: PASS");
      console.log("- Solidity verification: FAIL");
      console.log("\nPossible causes:");
      console.log("1. Pairing check in assembly is returning false");
      console.log("2. Field arithmetic mismatch (Solidity vs SnarkJS)");
      console.log("3. VK constants are incorrect");
      console.log("4. Proof format/coordinate order is wrong");
    } else {
      console.log("\n✓ Proof verification PASSED in Solidity!");
    }
  } catch (e) {
    console.log(`Error: ${e.message}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
