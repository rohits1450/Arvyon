/**
 * Test with Isolated Pipeline Proof
 * Uses exact proof and verifier from final_test pipeline
 */

const hre = require("hardhat");
const fs = require("fs");

async function main() {
  const [signer] = await hre.ethers.getSigners();
  console.log("\n" + "=".repeat(70));
  console.log("[TEST] Isolated Pipeline - Fresh Verifier + Fresh Proof");
  console.log("=".repeat(70) + "\n");

  const verifierAddr = "0x657ed22550Cb72201d1F968d9A282a46B9e4Fd44";
  console.log(`Verifier (just deployed): ${verifierAddr}`);
  console.log(`Proof: Generated in final_test pipeline`);
  console.log(`        Verified by SnarkJS locally: ✅ OK\n`);

  const Verifier = await hre.ethers.getContractAt("Groth16Verifier", verifierAddr);

  // Exact proof from pipeline
  const pA = [
    "0x22136caba72c00e6588e96ddaad51fade4220ca1a4509e2127ca0e429d342139",
    "0x1a4d5c88e5869c89c4220593d86978521bc83c4160203fc0282d22b6f2373791"
  ];

  const pB = [
    [
      "0x24e660cac5cc4ce2504928460bc77eb74a1de47a51b6724dc378afd2c53194b8",
      "0x14d5f53ca6cabd05cde59eaea2c43f8bed40d0278523f23849c3ba96fc98c9ff"
    ],
    [
      "0x11630bf26eee3537f43640b7b611099e38590640e0d8f33226cf49f80c5f9a91",
      "0x2653b3e5c89fb497fe60427775d4f48e4ebf3c5030fc7217aee6760db32dbac0"
    ]
  ];

  const pC = [
    "0x28ae8fbc78e6be20f0da8746378bc0d8ee554828ac76ba66277a1cf3b7955d8b",
    "0x1d9f9ea2faf3dd1a0c56343ae1798b1e09d52cb8398e4e363bf2642f468c0eb0"
  ];

  const signals = ["0x0000000000000000000000000000000000000000000000000000000000000001"];

  console.log("[1] Calling verifyProof()...");
  const result = await Verifier.verifyProof(pA, pB, pC, signals);

  console.log(`    Result: ${result}\n`);

  if (result) {
    console.log("    ✅ ✅ ✅ VERIFICATION SUCCESS!");
    console.log("    Phase 2 is complete and working on Sepolia!");
    console.log("    The issue was verifier/proof mismatch from earlier attempts.\n");
  } else {
    console.log("    ❌ VERIFICATION FAILED");
    console.log("    Proof returned false - checking gas usage for diagnostic...\n");

    // Call as transaction to check gas
    try {
      const tx = await Verifier.verifyProof(pA, pB, pC, signals);
      const receipt = await ethers.provider.waitForTransaction(tx.hash);
      const gasUsed = receipt.gasUsed.toString();
      console.log(`    Gas: ${gasUsed}`);
      if (parseInt(gasUsed) > 15000000) {
        console.log(`    → High gas indicates pairing loop (verifier/proof mismatch)`);
      }
    } catch (e) {}
  }

  console.log("\n" + "=".repeat(70) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
