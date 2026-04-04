#!/usr/bin/env python3
"""
Test proof generation fresh and verify both ways
"""

import json
import subprocess
import tempfile
import os
from pathlib import Path

CIRCUITS_DIR = Path("d:/Arvyon/agent/circuits")
AGENT_DIR = Path("d:/Arvyon/agent")

def main():
    print("=" * 70)
    print("[TEST] Fresh Proof Generation and Verification")
    print("=" * 70)

    # Create temp dir for this test
    with tempfile.TemporaryDirectory(prefix="arvyon_test_", dir=Path.home() / "AppData" / "Local" / "Temp") as tmpdir:
        print(f"\nWorking in: {tmpdir}\n")

        # Input
        input_data = {
            "actionValue": 50,
            "policyMin": 10,
            "policyMax": 100
        }
        input_file = Path(tmpdir) / "input.json"
        proof_file = Path(tmpdir) / "proof.json"
        public_file = Path(tmpdir) / "public.json"

        with open(input_file, "w") as f:
            json.dump(input_data, f)

        print(f"1. Input: {input_data}")

        # Generate proof using snarkjs
        print("\n2. Generating proof using SnarkJS...")
        wasm_path = CIRCUITS_DIR / "policy_check.wasm"
        zkey_path = CIRCUITS_DIR / "policy_check_final_new.zkey"

        node_script = f"""
const snarkjs = require('{AGENT_DIR}/node_modules/snarkjs');
const fs = require('fs');

(async () => {{
    try {{
        const input = JSON.parse(fs.readFileSync('{input_file}'));
        const {{ proof, publicSignals }} = await snarkjs.groth16.fullProve(
            input,
            '{wasm_path}',
            '{zkey_path}'
        );
        fs.writeFileSync('{proof_file}', JSON.stringify(proof));
        fs.writeFileSync('{public_file}', JSON.stringify(publicSignals));
        console.log('SUCCESS');
    }} catch (e) {{
        console.error('FAILED: ' + e.message);
        process.exit(1);
    }}
}})();
"""

        result = subprocess.run(["node", "-e", node_script], capture_output=True, text=True, timeout=600)
        if result.returncode != 0:
            print(f"Error: {result.stderr}")
            return
        print("✓ Proof generated")

        # Load proof
        with open(proof_file) as f:
            proof = json.load(f)
        with open(public_file) as f:
            pub_signals = json.load(f)

        print(f"   pi_a[0]: {proof['pi_a'][0]}")
        print(f"   publicSignals: {pub_signals}")

        # Verify with SnarkJS
        print("\n3. Verifying with SnarkJS...")
        vk_file = CIRCUITS_DIR / "verification_key_new.json"

        node_verify = f"""
const snarkjs = require('{AGENT_DIR}/node_modules/snarkjs');
const fs = require('fs');

(async () => {{
    const vk = JSON.parse(fs.readFileSync('{vk_file}'));
    const proof = JSON.parse(fs.readFileSync('{proof_file}'));
    const pubSignals = JSON.parse(fs.readFileSync('{public_file}')).map(s => BigInt(s));

    const result = await snarkjs.groth16.verify(vk, pubSignals, proof);
    console.log(result ? 'VALID' : 'INVALID');
}})();
"""

        result = subprocess.run(["node", "-e", node_verify], capture_output=True, text=True, timeout=30)
        snarkjs_result = result.stdout.strip()
        print(f"   Result: {snarkjs_result}")

        if snarkjs_result == "VALID":
            print("✓ SnarkJS verification PASSED")

            # Save this proof for Solidity testing
            print("\n4. Saving proof for Solidity test...")
            final_proof = {
                **proof,
                "publicSignals": pub_signals
            }

            with open(CIRCUITS_DIR / "proof_fresh.json", "w") as f:
                json.dump(final_proof, f, indent=2)
            print(f"   Saved to: {CIRCUITS_DIR / 'proof_fresh.json'}")
            print("\n✓ Ready for Solidity verification test")
        else:
            print("✗ SnarkJS verification FAILED")

if __name__ == "__main__":
    main()
