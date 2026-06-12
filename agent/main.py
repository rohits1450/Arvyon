"""
Arvyon AI Agent - LangGraph 3-Node Autonomous Workflow

Four nodes:
1. ObserveNode - Fetch on-chain state, policy registry, market data
2. DecideNode - LLM reasoning: should we act? What action?
3. IntentNode - Generate TIS JSON + ZK proof
4. SubmitNode - Record the decision on-chain (PDR / Executor)

State flows: Observe -> Decide -> Intent -> Submit -> END
"""
import json
from langgraph.graph import StateGraph, START, END

# Load agent/.env if present so config (API keys, RPC, flags) is picked up.
try:
    from dotenv import load_dotenv
    from pathlib import Path
    load_dotenv(Path(__file__).parent / ".env")
except ImportError:
    pass

from agent.state import AgentState
from agent.nodes.observe import observe_node
from agent.nodes.decide import decide_node
from agent.nodes.intent import intent_node
from agent.nodes.submit import submit_node

def create_agent_graph():
    """Builds and compiles the LangGraph state graph for the Arvyon agent."""
    workflow = StateGraph(AgentState)

    # Add nodes
    workflow.add_node("observe", observe_node)
    workflow.add_node("decide", decide_node)
    workflow.add_node("intent", intent_node)
    workflow.add_node("submit", submit_node)

    # Define edges
    workflow.add_edge(START, "observe")
    workflow.add_edge("observe", "decide")
    workflow.add_edge("decide", "intent")
    workflow.add_edge("intent", "submit")
    workflow.add_edge("submit", END)

    # Compile
    app = workflow.compile()
    return app

def run_agent(agent_address: str, policy_hash: str, iterations: int = 1):
    """Run agent graph"""
    app = create_agent_graph()
    
    print(f"\n{'='*60}")
    print(f"[START] Arvyon LangGraph Agent Starting")
    print(f"   Address: {agent_address[:10]}...")
    print(f"   Policy: {policy_hash[:10]}...")
    print(f"{'='*60}")

    for i in range(iterations):
        print(f"\n--- Iteration {i+1}/{iterations} ---")
        
        initial_state = {
            "agent_address": agent_address,
            "policy_hash": policy_hash,
            "iteration": i + 1,
            "messages": [],
            "observed_data": {},
            "decision": {},
            "tis_json": {},
            "proof_generated": {},
            "chain_result": {}
        }

        # Invoke the graph
        final_state = app.invoke(initial_state)

        if final_state.get("tis_json", {}).get("status") == "no_action":
            print("\n[INFO] No action taken")
        else:
            print(f"\n[OK] Decision ready for execution:")
            print(json.dumps(final_state.get("tis_json", {}), indent=2))
            chain_result = final_state.get("chain_result", {})
            if chain_result:
                print(f"\n[CHAIN] On-chain result:")
                print(json.dumps(chain_result, indent=2, default=str))

    print(f"\n{'='*60}")
    print(f"[DONE] Agent loop complete")
    print(f"{'='*60}\n")

if __name__ == "__main__":
    # Example usage
    run_agent(
        agent_address="0xCbA7D0b1A7d42d213f9f72F4532426dDCd247a3F", # Replaced private key with public address for safety
        policy_hash="0x3898fd5d5c5c6e56a916ef845cd8a0cf91639823ad0bf030a3f285e54052526c",
        iterations=1
    )
