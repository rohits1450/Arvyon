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
from agent.config import get_agent_config
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

def run_agent(agent_address: str, policy_hash: str, policy: dict | None = None, iterations: int = 1):
    """Run agent graph"""
    app = create_agent_graph()
    policy = policy or {}

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
            "policy": policy,
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
    import os
    import sys

    class TeeLogger:
        def __init__(self, filename):
            self.terminal = sys.stdout
            self.log_file = open(filename, "w", buffering=1)

        def write(self, message):
            self.terminal.write(message)
            self.log_file.write(message)

        def flush(self):
            self.terminal.flush()
            self.log_file.flush()

    # Intercept all prints and write to the frontend's readable log file
    log_path = os.path.join(os.path.dirname(__file__), "..", "agent_logs.txt")
    sys.stdout = TeeLogger(log_path)

    # Everything is derived from config (agent/policy.json + env), nothing is
    # hardcoded: the address comes from ARVYON_PRIVATE_KEY (or ARVYON_AGENT_ADDRESS),
    # and the policy + on-chain hash come from the policy file.
    cfg = get_agent_config()
    run_agent(
        agent_address=cfg["agent_address"],
        policy_hash=cfg["policy_hash"],
        policy=cfg["policy"],
        iterations=int(os.environ.get("ARVYON_ITERATIONS", "1")),
    )
