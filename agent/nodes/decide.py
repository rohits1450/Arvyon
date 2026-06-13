"""
Decide Node - Reasoning & Policy Evaluation

Picks an action given the observed state. Uses a real LLM when one is
configured (any provider — see agent/llm.py), otherwise falls back to a
deterministic, rule-based stub. The stub is NOT AI; it just maps the market
price into the policy bounds so the pipeline still runs end-to-end offline.
"""
from agent.state import AgentState
from agent.llm import llm_decide


def decide_node(state: AgentState) -> dict:
    """Execute decision phase."""
    print(f"\n[DECIDE]")

    observed_data = state.get("observed_data", {})
    p_min = observed_data.get("policy_min", 0)
    p_max = observed_data.get("policy_max", 0)
    market_price = observed_data.get("market_price", 0)

    # 1) Real LLM decision when a provider is configured.
    decision = llm_decide(observed_data)
    if decision is not None:
        print(f"   [LLM] Decision: {decision['action_type']} value={decision['proposed_value']}")
        print(f"         Rationale: {decision['rationale']}")
        return {"decision": decision}

    # 2) Rule-based fallback (no LLM configured) — clearly not AI.
    proposed = min(max(market_price, p_min), p_max)
    decision = {
        "should_act": True,
        "action_type": "TRADE",
        "proposed_value": proposed,
        "rationale": (
            f"[rule-based fallback, no LLM] market price {market_price} "
            f"clamped into [{p_min}, {p_max}] -> {proposed}"
        ),
        "engine": "rule-based",
    }
    print(f"   [Rule-based fallback] No LLM configured -> value={proposed}")
    return {"decision": decision}
