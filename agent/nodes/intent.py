"""
Intent Node - Transaction Intent Schema (TIS) Generation & ZK Proof

Generates:
- TIS: Structured JSON declaration of what agent intends to do
- ZK Proof: Zero-knowledge proof of policy compliance
- PDR: Policy Decision Record for audit trail
"""
import os
from datetime import datetime
from agent.state import AgentState

# Attempt to load zk bridge
use_real_zk = False
generate_policy_proof = None
try:
    from agent.zk_bridge import generate_policy_proof
    use_real_zk = True
except ImportError:
    pass

def intent_node(state: AgentState) -> dict:
    """Execute intent generation phase"""
    print(f"\n[INTENT]")
    
    decision = state.get("decision", {})
    observed_data = state.get("observed_data", {})
    
    if not decision.get("should_act"):
        print(f"   Skipping - agent decided not to act")
        return {"tis_json": {"status": "no_action"}, "proof_generated": {}}

    # Generate Transaction Intent Schema (TIS)
    tis_json = {
        "agentAddress": state.get("agent_address"),
        "actionType": decision.get("action_type"),
        "actionValue": decision.get("proposed_value"),
        "policyRef": state.get("policy_hash"),
        "policyMin": observed_data.get("policy_min"),
        "policyMax": observed_data.get("policy_max"),
        "timestamp": int(datetime.now().timestamp()),
        "rationale": decision.get("rationale", "")
    }

    print(f"   TIS generated:")
    print(f"      Action: {tis_json['actionType']}")
    print(f"      Value: {tis_json['actionValue']}")
    print(f"      Bounds: [{tis_json['policyMin']}, {tis_json['policyMax']}]")

    proof_generated = {}

    # Real ZK proof generation is gated behind an env flag so the pipeline
    # can run in a fast mock mode (CI, demos) or with genuine Groth16 proofs.
    # Set ARVYON_REAL_ZK=1 to generate real proofs via the snarkjs bridge.
    enable_real_zk = os.environ.get("ARVYON_REAL_ZK", "0") == "1"

    # Generate ZK proof if circuit is available
    if use_real_zk and enable_real_zk:
        try:
            print(f"   [ZK] Generating proof...")
            proof_result = generate_policy_proof(
                tis_json["actionValue"],
                tis_json["policyMin"],
                tis_json["policyMax"]
            )
            proof_generated = proof_result
            print(f"   [OK] Proof generated | Compliant: {proof_result['isCompliant']}")
        except Exception as e:
            print(f"   [WARN] ZK proof generation failed: {e}")
            proof_generated = {"status": "error", "error": str(e)}
    else:
        # Mock proof for testing
        action_val = tis_json.get("actionValue", 0)
        p_min = tis_json.get("policyMin", 0)
        p_max = tis_json.get("policyMax", 0)
        is_compliant = (p_min <= action_val <= p_max)
        
        proof_generated = {
            "isCompliant": is_compliant,
            "status": "mock"
        }
        print(f"   [Mock] Compliance: {proof_generated['isCompliant']}")

    return {"tis_json": tis_json, "proof_generated": proof_generated}
