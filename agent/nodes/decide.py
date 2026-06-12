"""
Decide Node - LLM Reasoning & Policy Evaluation

Uses LLM to:
- Evaluate current state against policy constraints
- Reason through valid action space
- Generate candidate transactions
- Assess compliance before commitment
"""
import json
import os
from agent.state import AgentState

def decide_node(state: AgentState) -> dict:
    """Execute decision phase"""
    print(f"\n[DECIDE]")
    
    observed_data = state.get("observed_data", {})
    
    # Try importing anthropic
    client = None
    try:
        from anthropic import Anthropic
        if os.environ.get("ANTHROPIC_API_KEY"):
            client = Anthropic()
    except ImportError:
        print("[WARNING] Anthropic SDK not installed - using mock decisions")

    if client is None:
        # Mock decision (deterministic for testing)
        decision = {
            "should_act": True,
            "action_type": "TRADE",
            "proposed_value": 45,  # Within bounds [10, 100]
            "rationale": "Market price favorable, within policy bounds"
        }
        print(f"   [Mock] Decision: {decision['action_type']} value={decision['proposed_value']}")
        return {"decision": decision}

    # Real LLM decision
    prompt = f"""
You are an autonomous AI agent operating on a blockchain with strict policy constraints.

Current State:
- Policy bounds: [{observed_data.get('policy_min')}, {observed_data.get('policy_max')}]
- Current balance: {observed_data.get('current_balance')}
- Market price: {observed_data.get('market_price')}
- Volatility: {observed_data.get('market_volatility')}

Decide: Should you execute a trade action? If yes, what value within your policy?
The proposed_value must be an integer between {observed_data.get('policy_min')} and {observed_data.get('policy_max')}.
"""

    # Constrain the response to a strict JSON schema so the output is always
    # valid, parseable JSON (no prompt-format drift).
    decision_schema = {
        "type": "object",
        "properties": {
            "should_act": {"type": "boolean"},
            "action_type": {"type": "string", "enum": ["TRADE", "VOTE", "DATA_ACCESS"]},
            "proposed_value": {"type": "integer"},
            "rationale": {"type": "string"},
        },
        "required": ["should_act", "action_type", "proposed_value", "rationale"],
        "additionalProperties": False,
    }

    try:
        response = client.messages.create(
            model="claude-opus-4-8",
            max_tokens=1024,
            output_config={"format": {"type": "json_schema", "schema": decision_schema}},
            messages=[{"role": "user", "content": prompt}]
        )

        response_text = next(b.text for b in response.content if b.type == "text")
        decision = json.loads(response_text)
        print(f"   LLM Decision: {decision['action_type']} (value={decision['proposed_value']})")
    except Exception as e:
        print(f"   [WARN] LLM call failed: {e}")
        decision = {
            "should_act": False,
            "rationale": f"LLM error: {str(e)}"
        }

    return {"decision": decision}
