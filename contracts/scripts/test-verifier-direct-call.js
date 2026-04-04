/**
 * Direct Verifier Test - Bypass Executor
 * Test the verifier contract directly to isolate the gas issue
 */

const hre = require("hardhat");
const ethers = hre.ethers;

async function main() {
  const [signer] = await hre.ethers.getSigners();
  console.log("\n" + "=".repeat(70));
  console.log("[TEST] Direct Verifier Call (Bypass Executor)");
  console.log("=".repeat(70) + "\n");

  // Load latest verifier from deployments
  const fs = require("fs");
  const deployments = JSON.parse(fs.readFileSync("./deployments.json"));
  const verifierAddr = deployments.PolicyCheckVerifier;
  const Verifier = await hre.ethers.getContractAt("Groth16Verifier", verifierAddr);

  // Proof from Phase 2 completed zkey
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

  const pubSignals = [
    "0x0000000000000000000000000000000000000000000000000000000000000001"
  ];

  console.log("Verifier address:", verifierAddr);
  console.log("Calling verifyProof() directly...\n");

  // Call verifier directly as a static call to estimate gas
  const tx = await Verifier.verifyProof(proofA, proofB, proofC, pubSignals);

  console.log(`Result: ${tx}`);
  if (tx === true) {
    console.log("✅ VERIFICATION PASSED");
  } else {
    console.log("❌ VERIFICATION FAILED");
  }

  // Now try as a transaction to see gas
  console.log("\nCalling as transaction to measure gas...\n");
  const txResp = await signer.sendTransaction({
    to: verifierAddr,
    data: Verifier.interface.encodeFunctionData('verifyProof', [proofA, proofB, proofC, pubSignals])
  });

  const receipt = await txResp.wait();
  console.log(`Gas used: ${receipt.gasUsed.toString()}`);
  console.log(`Tx: https://sepolia.etherscan.io/tx/${txResp.hash}`);

  if (receipt.gasUsed.toNumber() < 600000) {
    console.log("✅ GAS IS NORMAL");
  } else {
    console.log("⚠️  GAS IS HIGH - verifier likely still has issues");
  }

  console.log("\n" + "=".repeat(70) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
