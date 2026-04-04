#!/bin/bash
set -e

echo "=== FINAL TEST PIPELINE ===\n"

# Step 1: Phase  1 setup
echo "[1] Phase 1: Create initial zkey from verified r1cs"
npx snarkjs zkey new ../policy_check.r1cs ../pot12_final.ptau phase1.zkey
ls -lh phase1.zkey
echo ""

# Step 2: Phase 2 contribute
echo "[2] Phase 2: Run contribution ceremony"
npx snarkjs zkey contribute phase1.zkey phase2_contrib.zkey --name="Test" --entropy="$(date +%s%N | md5sum | cut -c1-32)"
ls -lh phase2_contrib.zkey
echo ""

# Step 3: Phase 2 beacon
echo "[3] Phase 2: Apply beacon"
npx snarkjs zkey beacon phase2_contrib.zkey final.zkey 0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20 10
ls -lh final.zkey
echo ""

# Step 4: Verify
echo "[4] Verify final zkey"
npx snarkjs zkey verify ../policy_check.r1cs ../pot12_final.ptau final.zkey | grep "ZKey Ok"
echo ""

# Step 5: Export verifier from THIS zkey
echo "[5] Export verifier.sol from final.zkey"
npx snarkjs zkey export solidityverifier final.zkey verifier_from_final.sol
echo "Verifier exported"
echo ""

# Step 6: Generate witness
echo "[6] Generate witness"
npx snarkjs wtns calculate ../policy_check.wasm ../input_new.json witness.wtns
echo "Witness generated"
echo ""

# Step 7: Generate proof using THIS zkey
echo "[7] Generate proof with final.zkey"
npx snarkjs groth16 prove final.zkey witness.wtns proof.json signals.json
cat signals.json
echo ""

# Step 8: Verify proof with SnarkJS
echo "[8] Verify proof locally with SnarkJS"
npx snarkjs zkey export verificationkey final.zkey vk.json >/dev/null 2>&1
npx snarkjs groth16 verify vk.json signals.json proof.json
echo ""

# Step 9: Export for Solidity
echo "[9] Export for Solidity"
npx snarkjs zkey export soliditycalldata signals.json proof.json > calldata.json
echo "Proof exported to calldata.json"
echo ""

echo "=== PIPELINE COMPLETE ==="
echo "Use verifier_from_final.sol and calldata.json for Solidity test"
