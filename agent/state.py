from typing import TypedDict

class AgentState(TypedDict):
    """State passed between LangGraph nodes"""
    agent_address: str
    policy_hash: str
    policy: dict
    iteration: int
    messages: list
    observed_data: dict
    decision: dict
    tis_json: dict
    proof_generated: dict
    chain_result: dict
