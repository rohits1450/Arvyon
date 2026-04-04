/**
 * Final Test - Phase 2 Completed Proof
 * Direct verifier testing
 */

const hre = require("hardhat");
const ethers = hre.ethers;
const fs = require("fs");

async function main() {
  const [signer] = await hre.ethers.getSigners();
  console.log("\n" + "=".repeat(70));
  console.log("[FINAL TEST] Phase 2 Completed Verifier");
  console.log("=".repeat(70) + "\n");

  const deployments = JSON.parse(fs.readFileSync("./deployments.json"));
  const verifierAddr = deployments.PolicyCheckVerifier;

  console.log(`Verifier: ${verifierAddr}`);
  console.log(`Circuit: 1-signal (isCompliant only)`);
  console.log(`ZKey: policy_check_final.zkey (Phase 2 completed)\n`);

  const Verifier = await hre.ethers.getContractAt("Groth16Verifier", verifierAddr);

  // Proof: generated and verified locally with SnarkJS before export
  const pA = [
    "0x2ba210c1d64075e8dff1138453264aaf18afdba2c2fe31fb8a83cb843b10ec9a",
    "0x0a05a5bc0ae56baea0f64ae7a07d32a01cab67339c7672ad60b069d7bd3c2a98"
  ];

  const pB = [
    [
      "0x26d3ffaa955806af40b5ee995d483f00409043b896063e8ea8a56bbaa3209940",
      "0x282794e2c607a8bf203e8fa13a62d2cff50ac6420d494241cfb33f6f978af9c1"
    ],
    [
      "0x1d6f122d7ff5fbe40c75c8d09ca2e3907907eef0a8f1a777fa3edd23b87ddcdf",
      "0x00e2efaaaa3cfa06d253bdb9b92e12a109f1eac85dfc17c25eeda9619b3ec1dd"
    ]
  ];

  const pC = [
    "0x2cc7b6c2cbc943f88d3b5b1f4330c2531587280170770ee524ab20bb0d70c626",
    "0x1082b67b1b2e95512819d06e4a4a7113af1bee0ccd81528b0ecb02b77a484c66"
  ];

  const signals = ["0x0000000000000000000000000000000000000000000000000000000000000001"];

  console.log("[1] Calling verifyProof as view function...\n");

  try {
    const verified = await Verifier.verifyProof(pA, pB, pC, signals);
    console.log(`    Result: ${verified}`);

    if (verified) {
      console.log("\n    ✅ VERIFICATION PASSED!\n");
      console.log("    Phase 2 is complete and working!");
    } else {
      console.log("\n    ❌ VERIFICATION FAILED\n");
      console.log("    verifyProof() returned false");
      console.log("    This indicates a mismatch between verifier and proof");
    }
  } catch (err) {
    console.log(`    ❌ Error calling verifyProof: ${err.message}\n`);
  }

  console.log("[2] Measuring gas with transaction simulation...\n");

  try {
    // Call as transaction to measure gas
    const tx = await Verifier.verifyProof(pA, pB, pC, signals);
    console.log(`    Tx hash: ${tx.hash}`);

    const receipt = await ethers.provider.waitForTransaction(tx.hash);
    const gasUsed = receipt.gasUsed.toString();
    console.log(`    Gas used: ${gasUsed}`);

    if (parseInt(gasUsed) < 600000) {
      console.log(`    ✅ Normal (< 600k)\n`);
    } else {
      console.log(`    ⚠️  High (> 600k, pairing loop)\n`);
    }
  } catch (err) {
    console.log(`    (skipped: ${err.message})\n`);
  }

  console.log("=".repeat(70) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
