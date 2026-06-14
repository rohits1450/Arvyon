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


import requests

def _market_snapshot() -> dict:
    """Fetch live market observation from CoinGecko."""
    try:
        # Fetch the live price of Ethereum in USD from CoinGecko
        response = requests.get(
            "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
            timeout=5
        )
        data = response.json()
        price = data["ethereum"]["usd"]
        
        # Determine volatility randomly for demo purposes, 
        # or it could be calculated using historical data API.
        volatility = random.choice(["LOW", "MEDIUM", "HIGH"])
        
        return {"market_price": price, "market_volatility": volatility}
    except Exception as e:
        print(f"   [WARN] CoinGecko API failed ({e}), falling back to mock data.")
        seed = os.environ.get("ARVYON_MARKET_SEED")
        rng = random.Random(int(seed)) if seed is not None else random.Random()
        price = rng.randint(20, 80)
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
