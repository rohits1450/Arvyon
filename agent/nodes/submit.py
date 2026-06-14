"""
Submit Node - On-chain Settlement

Takes the Transaction Intent Schema (TIS) + ZK proof produced by the Intent
node and records it on-chain:

- PDRLogger.logDecision()         -> immutable Policy Decision Record (PDR)
- Executor.executeWithVerification() -> on-chain ZK proof verification + log

Behaviour is fully config-driven (see agent/chain.py). With no RPC/key
configured, this node is a no-op and the agent runs entirely off-chain.

    ARVYON_RPC_URL        enable on-chain reads/writes
    ARVYON_PRIVATE_KEY    enable broadcasting transactions
    ARVYON_DRY_RUN=1      build/estimate but do not broadcast
    ARVYON_SUBMIT_MODE    "pdr" (default) | "executor" | "both"

Real-action dispatch (executor mode only; all optional):
    ARVYON_EXEC_TARGET     address the Executor forwards an authorized action to
    ARVYON_EXEC_PAYLOAD    hex calldata for that action (default "0x")
    ARVYON_EXEC_VALUE_WEI  wei to forward with the action (default 0)
"""
import os
from agent.state import AgentState

try:
    from agent.chain import get_chain_client
except ImportError:  # pragma: no cover
    get_chain_client = None


def submit_node(state: AgentState) -> dict:
    """Execute on-chain submission phase."""
    print(f"\n[SUBMIT]")

    tis_json = state.get("tis_json", {})
    proof_generated = state.get("proof_generated", {})

    # Nothing to submit if the agent decided not to act.
    if tis_json.get("status") == "no_action" or not tis_json.get("actionType"):
        print(f"   Skipping - no action to submit")
        return {"chain_result": {"status": "skipped", "reason": "no_action"}}

    if get_chain_client is None:
        print(f"   [INFO] chain module unavailable - skipping on-chain submission")
        return {"chain_result": {"status": "skipped", "reason": "no chain module"}}

    client = get_chain_client()
    if client is None:
        print(f"   [INFO] No ARVYON_RPC_URL configured - skipping on-chain submission")
        return {"chain_result": {"status": "skipped", "reason": "no RPC configured"}}

    agent = tis_json.get("agentAddress")
    action_type = tis_json.get("actionType")
    policy_hash = tis_json.get("policyRef")
    is_compliant = bool(proof_generated.get("isCompliant", False))
    mode = os.environ.get("ARVYON_SUBMIT_MODE", "pdr").lower()

    if not client.is_connected():
        print(f"   [WARN] RPC endpoint not reachable - skipping")
        return {"chain_result": {"status": "error", "reason": "rpc unreachable"}}

    result = {"mode": mode}

    # Prefer the agent account's own address when a key is configured, since
    # Executor/PDRLogger use msg.sender semantics and on-chain policy lookups.
    if client.agent_address:
        agent = client.agent_address
        result["resolvedAgent"] = agent

    if mode in ("pdr", "both"):
        print(f"   [PDR] Logging decision (compliant={is_compliant})...")
        result["pdr"] = client.log_decision(agent, action_type, policy_hash, is_compliant)
        print(f"   [PDR] {result['pdr']}")

    if mode in ("executor", "both"):
        # Optional real-action dispatch: when ARVYON_EXEC_TARGET is set, an
        # authorized decision makes the Executor forward value + calldata to
        # that target. Unset -> verify-and-log only (default, off-chain-safe).
        target = os.environ.get("ARVYON_EXEC_TARGET") or None
        payload = os.environ.get("ARVYON_EXEC_PAYLOAD") or "0x"
        value_wei = int(os.environ.get("ARVYON_EXEC_VALUE_WEI", "0"))
        print(f"   [EXEC] Submitting ZK proof to Executor (target={target or 'log-only'})...")
        result["executor"] = client.submit_execution(
            agent, action_type, proof_generated,
            target=target, payload=payload, value_wei=value_wei,
        )
        print(f"   [EXEC] {result['executor']}")

    return {"chain_result": result}
