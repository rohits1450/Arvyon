"""
ZK Bridge - Convert Transaction Intent Schema (TIS) to ZK proofs

This module bridges the agent's decision output (TIS JSON) with the SnarkJS proof generation pipeline.
- Takes: TIS JSON (actionValue, policyMin, policyMax)
- Calls: SnarkJS via subprocess
- Returns: Proof object ready for on-chain verification
"""

import json
import subprocess
import os
from pathlib import Path
from typing import Dict, Optional, Tuple
import tempfile

# Path to circuit files
CIRCUITS_DIR = Path(__file__).parent / "circuits"
POLICY_CHECK_WASM = CIRCUITS_DIR / "policy_check.wasm"
POLICY_CHECK_ZKEY = CIRCUITS_DIR / "policy_check_final.zkey"


class ZKProofGenerationError(Exception):
    """Raised when ZK proof generation fails"""
    pass


def generate_policy_proof(
    action_value: int,
    policy_min: int,
    policy_max: int,
    temp_dir: Optional[str] = None
) -> Dict:
    """
    Generate a ZK proof that action_value complies with policy bounds.

    Args:
        action_value: The proposed action value
        policy_min: Lower bound from agent's policy
        policy_max: Upper bound from agent's policy
        temp_dir: Temporary directory for proof files (auto-cleanup)

    Returns:
        {
            "proof": {"pi_a": [...], "pi_b": [...], "pi_c": [...]},
            "publicSignals": [isCompliant],
            "isCompliant": bool
        }

    Raises:
        ZKProofGenerationError: If proof generation or verification fails
    """

    if not POLICY_CHECK_WASM.exists():
        raise ZKProofGenerationError(f"Circuit WASM not found: {POLICY_CHECK_WASM}")
    if not POLICY_CHECK_ZKEY.exists():
        raise ZKProofGenerationError(f"Circuit ZKEY not found: {POLICY_CHECK_ZKEY}")

    # Use provided temp dir or create one
    should_cleanup = False
    if temp_dir is None:
        temp_dir = tempfile.mkdtemp(prefix="arvyon_proof_")
        should_cleanup = True

    try:
        # Prepare input file
        input_file = os.path.join(temp_dir, "input.json")
        proof_file = os.path.join(temp_dir, "proof.json")
        public_file = os.path.join(temp_dir, "public.json")

        # Write circuit inputs
        circuit_input = {
            "actionValue": action_value,
            "policyMin": policy_min,
            "policyMax": policy_max
        }
        with open(input_file, "w") as f:
            json.dump(circuit_input, f)

        # Use Node.js to call snarkjs API directly
        print(f"Generating proof (witness + proof)...")

        # Escape paths for safe passing to Node.js - use forward slashes
        agent_dir = os.path.dirname(os.path.abspath(__file__)).replace("\\", "/")
        wasm_path = os.path.abspath(POLICY_CHECK_WASM).replace("\\", "/")
        zkey_path = os.path.abspath(POLICY_CHECK_ZKEY).replace("\\", "/")
        input_path = os.path.abspath(input_file).replace("\\", "/")
        proof_path = os.path.abspath(proof_file).replace("\\", "/")
        public_path = os.path.abspath(public_file).replace("\\", "/")

        node_script = f"""
const snarkjs = require('{agent_dir}/node_modules/snarkjs');
const fs = require('fs');

(async () => {{
    try {{
        const input = JSON.parse(fs.readFileSync('{input_path}'));
        const {{ proof, publicSignals }} = await snarkjs.groth16.fullProve(
            input,
            '{wasm_path}',
            '{zkey_path}'
        );
        fs.writeFileSync('{proof_path}', JSON.stringify(proof));
        fs.writeFileSync('{public_path}', JSON.stringify(publicSignals));
        console.log('SUCCESS');
    }} catch (e) {{
        console.error('FAILED: ' + e.message);
        process.exit(1);
    }}
}})();
"""

        result = subprocess.run(
            ["node", "-e", node_script],
            capture_output=True,
            text=True,
            timeout=600  # Groth16 proof generation can take 5-10 minutes on Windows
        )

        if result.returncode != 0 or "FAILED" in result.stderr:
            raise ZKProofGenerationError(f"Proof generation failed: {result.stderr}")

        # Read proof and public signals
        with open(proof_file) as f:
            proof = json.load(f)
        with open(public_file) as f:
            public_signals = json.load(f)

        # Extract compliance result (last element of public signals)
        is_compliant = int(public_signals[-1]) == 1

        print(f"Proof generated | Compliant: {is_compliant}")

        return {
            "proof": proof,
            "publicSignals": public_signals,
            "isCompliant": is_compliant
        }

    finally:
        # Cleanup temp directory if we created it
        if should_cleanup:
            import shutil
            shutil.rmtree(temp_dir, ignore_errors=True)


def parse_tis_to_proof_inputs(tis: Dict) -> Tuple[int, int, int]:
    """
    Extract circuit inputs from Transaction Intent Schema (TIS) JSON.

    TIS structure:
    {
        "agentAddress": "0x...",
        "actionType": "TRADE",
        "actionValue": 50,
        "policyRef": bytes32 hash,
        "timestamp": timestamp
    }

    Returns:
        (actionValue, policyMin, policyMax)

    For now, policyMin/Max are mocked from the TIS.
    In Phase 3, these will come from on-chain policy registry.
    """
    action_value = tis.get("actionValue", 0)
    policy_min = tis.get("policyMin", 0)
    policy_max = tis.get("policyMax", 1000)

    return action_value, policy_min, policy_max


if __name__ == "__main__":
    # Test the bridge with sample data
    print("Testing ZK Bridge with sample TIS\n")

    sample_tis = {
        "agentAddress": "0x1234567890123456789012345678901234567890",
        "actionType": "TRADE",
        "actionValue": 50,
        "policyMin": 10,
        "policyMax": 100,
        "policyRef": "0x" + "aa" * 32,
        "timestamp": 1234567890
    }

    try:
        action_val, policy_min, policy_max = parse_tis_to_proof_inputs(sample_tis)
        print(f"Action: {action_val}, Bounds: [{policy_min}, {policy_max}]\n")

        proof_result = generate_policy_proof(action_val, policy_min, policy_max)
        print(f"Result: {json.dumps(proof_result, indent=2)[:200]}...")
    except Exception as e:
        print(f"Error: {e}")
