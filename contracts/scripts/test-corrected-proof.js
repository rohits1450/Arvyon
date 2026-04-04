/**
 * Test with Corrected G2 Coordinates from SnarkJS Export
 *
 * Uses proof formatted with: snarkjs zkey export soliditycalldata
 * which handles the G2 coordinate swap for EVM pairing precompile
 */

const hre = require("hardhat");
const ethers = hre.ethers;
const fs = require("fs");

async function main() {
  const [signer] = await hre.ethers.getSigners();
  console.log("\n" + "=".repeat(70));
  console.log("[TEST] ZK Proof Verification with Corrected G2 Coordinates");
  console.log("=".repeat(70));
  console.log(`Signer: ${signer.address}\n`);

  // Load deployments
  const deployments = JSON.parse(fs.readFileSync("./deployments.json"));
  const policyRegistryAddr = deployments.PolicyRegistry;
  const executorAddr = deployments.Executor;
  const pdrLoggerAddr = deployments.PDRLogger;

  // Load contract instances
  const PolicyRegistry = await hre.ethers.getContractAt("PolicyRegistry", policyRegistryAddr);
  const Executor = await hre.ethers.getContractAt("Executor", executorAddr);
  const PDRLogger = await hre.ethers.getContractAt("PDRLogger", pdrLoggerAddr);

  console.log("[1] Register Policy");
  console.log("-".repeat(70));

  let policyHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("corrected-proof-test-" + Date.now()));
  console.log(`Policy hash: ${policyHash}\n`);

  const alreadyHasPolicy = await PolicyRegistry.hasPolicy(signer.address);
  if (alreadyHasPolicy) {
    const tx = await PolicyRegistry.updatePolicy(policyHash);
    const receipt = await tx.wait();
    console.log(`✓ Policy updated in block ${receipt.blockNumber}\n`);
  } else {
    const tx = await PolicyRegistry.registerPolicy(policyHash);
    const receipt = await tx.wait();
    console.log(`✓ Policy registered in block ${receipt.blockNumber}\n`);
  }

  console.log("[2] Proof Data (from snarkjs zkey export soliditycalldata)");
  console.log("-".repeat(70));

  // Proof from completed Phase 2 zkey (policy_check_final.zkey)
  // Verified with SnarkJS + fresh verification key
  const proofA = [
    "0x13c635142f7a079371d7ac5989f321088901047d049476d962bb23861e4afa6d",
    "0x096817abc085d843d29a5dc7a5823ea2109042043190030c1d5c9b194653c917"
  ];

  const proofB = [
    [
      "0x2cd233931853714a3ea7fa860dc8573f787af8d69c5d6d3f24d4b673ce19dc07",
      "0x1da555569d16c2a2e0030161fd557076a96e9e1e3e6b4b40bf11dc7228ffa6d9"
    ],
    [
      "0x0ca57057c71ef5ccb6d05e02f8b6aa9c4958d8d08f1084a9fa082617dcb75c36",
      "0x2aa54cf5616286a0dd2607a29b1c0a67e6164d2b2b825041bc8c744e6f49622f"
    ]
  ];

  const proofC = [
    "0x1a2d7a5d34c25d84c90fad802d2b8adc2089ad94c94ecd7a7943014f69e4cb1e",
    "0x00637f5f403c7059652149f913447dac6356c3d92f0c07bb89cc91f02ea005aa"
  ];

  const pubSignals = ["0x0000000000000000000000000000000000000000000000000000000000000001"];

  console.log("pi_a:", proofA[0].substring(0, 16) + "..." + proofA[0].substring(62));
  console.log("pi_b[0][0]:", proofB[0][0].substring(0, 16) + "..." + proofB[0][0].substring(62));
  console.log("pi_b[0][1]:", proofB[0][1].substring(0, 16) + "..." + proofB[0][1].substring(62));
  console.log("pi_b[1][0]:", proofB[1][0].substring(0, 16) + "..." + proofB[1][0].substring(62));
  console.log("pi_b[1][1]:", proofB[1][1].substring(0, 16) + "..." + proofB[1][1].substring(62));
  console.log("pi_c[0]:", proofC[0].substring(0, 16) + "..." + proofC[0].substring(62));
  console.log("Public signals:", pubSignals);
  console.log("  → isCompliant = 1 (true)\n");

  console.log("[3] Call Executor.executeWithVerification()");
  console.log("-".repeat(70));
  console.log("Submitting proof to contract...\n");

  try {
    const tx = await Executor.executeWithVerification(
      signer.address,
      "TRADE",
      proofA,
      proofB,
      proofC,
      pubSignals
    );

    console.log(`✓ Transaction submitted: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`✓ Confirmed in block ${receipt.blockNumber}`);

    const gasUsedNum = parseInt(receipt.gasUsed.toString());
    console.log(`✓ Gas used: ${gasUsedNum} (${gasUsedNum < 600000 ? "✅ NORMAL" : "⚠️ HIGH"})`);
    console.log(`  Sepolia: https://sepolia.etherscan.io/tx/${tx.hash}\n`);

    console.log("[RESULT] ✅ PROOF VERIFICATION PASSED");
    console.log("The G2 coordinate swap fixed the issue!");

  } catch (error) {
    console.log(`❌ PROOF VERIFICATION FAILED\n`);
    console.log(`Error: ${error.message}\n`);

    if (error.message.includes("verifyProof failed") || error.message.includes("pairing")) {
      console.log("⚠️  Pairing check still failing.");
      console.log("\nDiagnostics:");
      console.log("1. Verify Verifier.sol was exported from policy_check_final_new.zkey");
      console.log("2. Verify proof_new.json and Verifier.sol are from the SAME zkey");
      console.log("3. Check that circuit has exactly 1 public signal (isCompliant)");
    }

    process.exit(1);
  }

  console.log("=".repeat(70) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
