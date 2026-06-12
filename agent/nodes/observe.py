"""
Observe Node - Perception & State Collection

Fetches current state from:
- On-chain: Policy registry, contract state
- Off-chain: Market data, external APIs
- Agent state: Current policy hash, gas budget
"""
from datetime import datetime
from agent.state import AgentState

def observe_node(state: AgentState) -> dict:
    """Execute observation phase"""
    iteration = state.get("iteration", 0)
    print(f"\n[OBSERVE] Iteration {iteration}")

    # Mock on-chain data (in Phase 3, replace with web3.py calls)
    observed_data = {
        "policy_min": 10,
        "policy_max": 100,
        "current_balance": 500,
        "market_price": 42,
        "market_volatility": "LOW",
        "timestamp": datetime.now().isoformat(),
        "gas_price_wei": 20000000000
    }

    print(f"   Policy bounds: [{observed_data['policy_min']}, {observed_data['policy_max']}]")
    print(f"   Balance: {observed_data['current_balance']}")
    print(f"   Market price: {observed_data['market_price']}")

    return {"observed_data": observed_data}
