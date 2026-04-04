/**
 * Fresh Phase 2 Test - Final
 * Uses BOTH fresh verifier AND fresh proof
 */

const hre = require("hardhat");
const ethers = hre.ethers;
const fs = require("fs");

async function main() {
  const [signer] = await hre.ethers.getSigners();
  console.log("\n" + "=".repeat(70));
  console.log("[TEST] Fresh Phase 2 Verifier + Fresh Proof");
  console.log("=".repeat(70) + "\n");

  // Latest deployments
  const deployments = JSON.parse(fs.readFileSync("./deployments.json"));

  // Use the brand new verifier we just deployed
  const verifierAddr = "0x175d00E6F9E0F9c0056A05B5E375f2903a74eF49";

  console.log(`Fresh Verifier: ${verifierAddr}`);
  console.log(`Fresh Proof: From zkey_final.zkey (Phase 2 complete)`);
  console.log(`Input: actionValue=50, policyMin=10, policyMax=100`);
  console.log(`Expected: isCompliant=1 (true)\n`);

  const Verifier = await hre.ethers.getContractAt("Groth16Verifier", verifierAddr);

  // Fresh proof from zkey_final.zkey
  const pA = [
    "0x1805a6e356c8034d1a0da3e775e45f4f661f740a9898b9b60a2c38eb1bd09418",
    "0x159ad00631b569a43316f5a2f99d1908f1fb58e650e68a11792d02e366cc60b6"
  ];

  const pB = [
    [
      "0x0cc0e50c89fbd8bc59bbea84f850d1a70a4e31bad408162ac263b411208c6705",
      "0x10343d3d89bdf49533f2de227519495ffb25d6b9d6677356b6bb7119b4def945"
    ],
    [
      "0x0dcda784708ccb7d772da6932db15c1dca0c529f96c47692a6ac248c16e0148f",
      "0x093f51fb2f738bd81163a3ab29125e286a433a48a3de78101d9776622c71091c"
    ]
  ];

  const pC = [
    "0x1edba1f8cf2397472cb85418e6b12c48edceaa8a87cd106bfa0f69c688ab9537",
    "0x0ba47a3a6a3bebcbb21e9782cb7b69a6893117777da396e0075e865e828dbbc4"
  ];

  const signals = ["0x0000000000000000000000000000000000000000000000000000000000000001"];

  console.log("[1] Calling verifyProof...");
  const result = await Verifier.verifyProof(pA, pB, pC, signals);
  console.log(`    Result: ${result}\n`);

  if (result) {
    console.log("    ✅ SUCCESS!");
    console.log("    Phase 2 is complete and working!");
  } else {
    console.log("    ❌ FAILED");
    console.log("    verifyProof returned false");
  }

  console.log("\n" + "=".repeat(70) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
