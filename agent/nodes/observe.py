"""
Observe Node - Perception & State Collection

Fetches current state from:
- The agent's policy (bounds the action must satisfy)
- Market data (simulated here; swap for a real feed/oracle)
- Agent state: balance, gas, timestamp

Policy bounds come from the loaded policy (state["policy"]), not hardcoded
constants, so changing agent/policy.json changes the agent's behaviour.
"""
import os
import random
from datetime import datetime
from agent.state import AgentState


def _market_snapshot() -> dict:
    """Simulate a market observation.

    Deterministic when ARVYON_MARKET_SEED is set (useful for tests/demos),
    otherwise a fresh random snapshot each iteration. Replace this with a real
    price oracle / API call for production.
    """
    seed = os.environ.get("ARVYON_MARKET_SEED")
    rng = random.Random(int(seed)) if seed is not None else random.Random()
    price = rng.randint(20, 80)
    # Volatility derived from how far the price sits from the mid-range.
    spread = abs(price - 50)
    volatility = "HIGH" if spread > 25 else "MEDIUM" if spread > 12 else "LOW"
    return {"market_price": price, "market_volatility": volatility}


def observe_node(state: AgentState) -> dict:
    """Execute observation phase."""
    iteration = state.get("iteration", 0)
    print(f"\n[OBSERVE] Iteration {iteration}")

    policy = state.get("policy") or {}
    policy_min = policy.get("policyMin", 0)
    policy_max = policy.get("policyMax", 0)

    market = _market_snapshot()
    observed_data = {
        "policy_min": policy_min,
        "policy_max": policy_max,
        "current_balance": int(os.environ.get("ARVYON_BALANCE", "500")),
        "timestamp": datetime.now().isoformat(),
        "gas_price_wei": 20000000000,
        **market,
    }

    print(f"   Policy bounds: [{policy_min}, {policy_max}]")
    print(f"   Market price: {observed_data['market_price']} "
          f"(volatility {observed_data['market_volatility']})")

    return {"observed_data": observed_data}
