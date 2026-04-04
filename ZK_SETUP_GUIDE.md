# ZK Setup Completion Guide

## Current Status
- ✅ Circuit fixed (1-signal: inputs private, output public)
- ✅ G2 coordinate fix applied (snarkjs export soliditycalldata)
- ✅ New 1-signal Solidity verifier deployed
- ❌ **BLOCKER**: zkey files incomplete (4-5KB instead of ~300KB)

## The Problem
The proof verification fails because our zkey files are only phase 1 public keys. A complete Groth16 zkey requires:
1. Phase 1: Powers of Tau ceremony (we have: pot12_final.ptau)
2. Phase 2: Circuit-specific zkey ceremony (INCOMPLETE)

## Solution: Complete the Trusted Setup

### Step 1: Create R1CS from Circuit
```bash
cd d:/Arvyon/agent/circuits
circom policy_check.circom --r1cs --wasm
```

### Step 2: Contribute to Phase 2
```bash
# Start contribution
snarkjs zkey new policy_check.r1cs pot12_final.ptau policy_check_0.zkey

# You'll be prompted to enter randomness (keep it secret!)
# This creates a zkey with your contribution

# Verify the zkey is properly formatted
snarkjs zkey verify policy_check.r1cs pot12_final.ptau policy_check_0.zkey
```

### Step 3: Apply Beacon (finalize the zkey)
```bash
# Generate final zkey with beacon value
snarkjs zkey beacon policy_check_0.zkey policy_check_final.zkey 0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20 10 --name="Arvyon"
```

### Step 4: Export Verifier and Test
```bash
# Export Solidity verifier
snarkjs zkey export solidityverifier policy_check_final.zkey Verifier.sol

# Export verification key for reference
snarkjs zkey export verificationkey policy_check_final.zkey verification_key.json

# Generate and verify a test proof
snarkjs wtns calculate policy_check.wasm input_test.json witness.wtns
snarkjs groth16 prove policy_check_final.zkey witness.wtns proof_test.json public_test.json
snarkjs groth16 verify verification_key.json public_test.json proof_test.json
```

## Files That Will Be Generated
- `policy_check.r1cs` - Circuit constraints
- `policy_check_0.zkey` - Zkey with your contribution
- `policy_check_final.zkey` - Final, usable zkey (~300KB)
- `Verifier.sol` - New Solidity verifier (1-signal format)
- Proofs will now verify correctly in Solidity

## After Completion
1. Copy `Verifier.sol` to `contracts/contracts/zk/PolicyCheckVerifier.sol`
2. Redeploy verifier to Sepolia
3. Run proof tests - gas should drop from 15.9M to 300k-600k range
