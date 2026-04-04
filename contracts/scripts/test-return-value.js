/**
 * Check return value of executeWithVerification
 */

const hre = require("hardhat");
const ethers = hre.ethers;
const fs = require("fs");

async function main() {
  const [signer] = await hre.ethers.getSigners();
  console.log("\n[TEST] Check executeWithVerification return value\n");

  const deployments = JSON.parse(fs.readFileSync("./deployments.json"));
  const executorAddr = deployments.Executor || deployments["0x2131aB1c9F3F9E7155FF2f29C62cac31564D0114"];
  const policyRegistryAddr = deployments.PolicyRegistry;

  const PolicyRegistry = await hre.ethers.getContractAt("PolicyRegistry", policyRegistryAddr);
  const Executor = await hre.ethers.getContractAt("Executor", executorAddr);

  // Ensure policy exists
  const hasPolicy = await PolicyRegistry.hasPolicy(signer.address);
  if (!hasPolicy) {
    const policyHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test-policy-" + Date.now()));
    const tx = await PolicyRegistry.registerPolicy(policyHash);
    await tx.wait();
    console.log("Policy registered\n");
  }

  // Fresh proof
  const proofA = [
    "0x29496a67ca92f2657c32fa3ea54f2c981d33b5d9157b4e34ee1183fb147d23d9",
    "0x2bfc82cdeff74b59d087971ca4759b4fb102f12c41c7abeec2fa0b09beea761d"
  ];

  const proofB = [
    [
      "0x0e3eaf9be55c08e3144abbcc3ef1ad8898542b36951016b7e9f78020805a38a4",
      "0x1c5ad46b4ddb1166fa70ca87dbaa7e6dd0c0f7fb7452dc27734b937fcf0f5504"
    ],
    [
      "0x222bf613a5036911c918c2acfa56dd42aebf8ae21f2137735ae58a5076c2f2dc",
      "0x03a7c03c0749727cd53b7a37551b8097667583f088d18ca37c6a35d162a0fc47"
    ]
  ];

  const proofC = [
    "0x1ee8d4a223517e62fe5a0f95344a67f078eea869e93b9e6f524e2a7161773ec2",
    "0x0f6a910702af7d162b9ef262255ef8e0a1b50183d1fc5d4ff04110b49d1e1b59"
  ];

  const pubSignals = ["0x0000000000000000000000000000000000000000000000000000000000000001"];

  console.log("Calling executeWithVerification...");
  const result = await Executor.executeWithVerification.staticCall(
    signer.address,
    "TRADE",
    proofA,
    proofB,
    proofC,
    pubSignals
  );

  // Check return value
  console.log(`Return value: ${result}`);

  if (result) {
    console.log("✅ VERIFIED AND AUTHORIZED");
  } else {
    console.log("❌ VERIFICATION FAILED OR NOT AUTHORIZED");
  }

  console.log();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
