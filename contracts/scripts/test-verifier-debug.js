/**
 * Test: Debug Solidity Verifier Proof Extraction
 * Tests different ways of formatting the proof
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
  console.log("[TEST] Debug Proof Extraction Formats");
  console.log("=".repeat(70));

  console.log("\nProof JSON structure:");
  console.log(JSON.stringify(proofData, null, 2).substring(0, 400));

  // Try different extraction formats
  console.log("\n--- Format 1: Remove Z coordinate ---");
  const fmt1_proofA = [proofData.pi_a[0], proofData.pi_a[1]];
  const fmt1_proofB = [
    [proofData.pi_b[0][0], proofData.pi_b[0][1]],
    [proofData.pi_b[1][0], proofData.pi_b[1][1]]
  ];
  const fmt1_proofC = [proofData.pi_c[0], proofData.pi_c[1]];

  console.log(`pi_a: [${fmt1_proofA[0].toString().slice(0,15)}..., ${fmt1_proofA[1].toString().slice(0,15)}...]`);
  console.log(`Testing...`);
  try {
    const result = await Verifier.verifyProof(fmt1_proofA, fmt1_proofB, fmt1_proofC, pubSignals.map(s => BigInt(s)));
    console.log(`Result: ${result}`);
  } catch(e) {
    console.log(`Error: ${e.message.substring(0, 100)}`);
  }

  console.log("\n--- Format 2: Include Z coordinate (affine assumption) ---");
  try {
    const fmt2_proofA = [proofData.pi_a[0], proofData.pi_a[1], proofData.pi_a[2]];
    const fmt2_proofB = [
      [proofData.pi_b[0][0], proofData.pi_b[0][1], proofData.pi_b[0][2] || "1"],
      [proofData.pi_b[1][0], proofData.pi_b[1][1], proofData.pi_b[1][2] || "1"]
    ];
    const fmt2_proofC = [proofData.pi_c[0], proofData.pi_c[1], proofData.pi_c[2]];

    // Can only call with uint[2], not uint[3]
    console.log(`Can't test with Z - contract expects uint[2]`);
  } catch(e) {
    console.log(`Error: ${e.message}`);
  }

 console.log("\n--- Checking proof component types ---");
  console.log(`pi_a[0] type: ${typeof proofData.pi_a[0]}`);
  console.log(`pi_a[0] value: ${proofData.pi_a[0]}`);
  console.log(`As BigInt: ${BigInt(proofData.pi_a[0])}`);

  // Try with string hex values
  console.log("\n--- Format 3: Try with hex strings (unlikely) ---");
  // Most Solidity test contracts expect plain numbers
  // Skip this as it's unlikely to work

  // Let's check what the test expects
  console.log("\n--- Verifier function signature ---");
  console.log(`Verifier address: ${verifierAddr}`);
  const code = await ethers.provider.getCode(verifierAddr);
  console.log(`Contract code length: ${code.length}`);
  console.log(`Contract deployed: ${code.length > 2 ? 'YES' : 'NO'}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
