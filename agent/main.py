"""
Arvyon AI Agent - LangGraph 3-Node Autonomous Workflow

Three nodes:
1. ObserveNode - Fetch on-chain state, policy registry, market data
2. DecideNode - LLM reasoning: should we act? What action?
3. IntentNode - Generate TIS JSON + ZK proof

State flows: Observe -> Decide -> Intent -> back to Observe (loop)
"""

import json
import asyncio
from typing import Dict, Any, Optional
from enum import Enum
from dataclasses import dataclass, asdict
from datetime import datetime
from pathlib import Path


@dataclass
class AgentState:
    """State passed between LangGraph nodes"""
    agent_address: str
    policy_hash: str
    iteration: int = 0
    messages: list = None
    observed_data: Dict = None
    decision: Dict = None
    tis_json: Dict = None
    proof_generated: Dict = None

    def __post_init__(self):
        if self.messages is None:
            self.messages = []
        if self.observed_data is None:
            self.observed_data = {}
        if self.decision is None:
            self.decision = {}
        if self.tis_json is None:
            self.tis_json = {}
        if self.proof_generated is None:
            self.proof_generated = {}


class ObserveNode:
    """
    Observe Node - Perception & State Collection

    Fetches:
    - On-chain policy bounds from PolicyRegistry
    - Mock market data
    - Agent state
    """

    def __init__(self, policy_registry_address: Optional[str] = None):
        self.policy_registry_address = policy_registry_address

    def execute(self, state: AgentState) -> AgentState:
        """Execute observation phase"""
        print(f"\n[OBSERVE] Iteration {state.iteration}")

        # Mock on-chain data (in Phase 3, replace with web3.py calls)
        state.observed_data = {
            "policy_min": 10,
            "policy_max": 100,
            "current_balance": 500,
            "market_price": 42,
            "market_volatility": "LOW",
            "timestamp": datetime.now().isoformat(),
            "gas_price_wei": 20000000000
        }

        print(f"   Policy bounds: [{state.observed_data['policy_min']}, {state.observed_data['policy_max']}]")
        print(f"   Balance: {state.observed_data['current_balance']}")
        print(f"   Market price: {state.observed_data['market_price']}")

        return state


class DecideNode:
    """
    Decide Node - LLM Reasoning & Policy Evaluation

    Uses LLM to reason about:
    - Current state vs. policy
    - Valid action space
    - Whether to act
    """

    def __init__(self, model: str = "claude-3-5-sonnet-20241022"):
        self.model = model
        # Import here to make it optional
        try:
            from anthropic import Anthropic
            self.client = Anthropic()
        except ImportError:
            self.client = None
            print("[WARNING] Anthropic SDK not installed - using mock decisions")

    def execute(self, state: AgentState) -> AgentState:
        """Execute decision phase"""
        print(f"\n[DECIDE]")

        if self.client is None:
            # Mock decision (deterministic for testing)
            state.decision = {
                "should_act": True,
                "action_type": "TRADE",
                "proposed_value": 45,  # Within bounds [10, 100]
                "rationale": "Market price favorable, within policy bounds"
            }
            print(f"   [Mock] Decision: {state.decision['action_type']} value={state.decision['proposed_value']}")
            return state

        # Real LLM decision
        prompt = f"""
You are an autonomous AI agent operating on a blockchain with strict policy constraints.

Current State:
- Policy bounds: [{state.observed_data['policy_min']}, {state.observed_data['policy_max']}]
- Current balance: {state.observed_data['current_balance']}
- Market price: {state.observed_data['market_price']}
- Volatility: {state.observed_data['market_volatility']}

Decide: Should you execute a trade action? If yes, what value within your policy?

Respond as JSON only:
{{
    "should_act": boolean,
    "action_type": "TRADE" || "VOTE" || "DATA_ACCESS",
    "proposed_value": number (must be between {state.observed_data['policy_min']} and {state.observed_data['policy_max']}),
    "rationale": "explanation"
}}
"""

        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=200,
                messages=[{"role": "user", "content": prompt}]
            )

            response_text = response.content[0].text
            state.decision = json.loads(response_text)
            print(f"   LLM Decision: {state.decision['action_type']} (value={state.decision['proposed_value']})")
        except Exception as e:
            print(f"   [WARN] LLM call failed: {e}")
            state.decision = {
                "should_act": False,
                "rationale": f"LLM error: {str(e)}"
            }

        return state


class IntentNode:
    """
    Intent Node - Transaction Intent Schema (TIS) + ZK Proof

    Generates:
    - TIS JSON: Structured declaration of intent
    - ZK Proof: Privacy-preserving compliance proof
    """

    def __init__(self, use_real_zk: bool = False):
        self.use_real_zk = use_real_zk
        if use_real_zk:
            try:
                from agent.zk_bridge import generate_policy_proof, parse_tis_to_proof_inputs
                self.zk_bridge = True
                self.generate_policy_proof = generate_policy_proof
                self.parse_tis_to_proof_inputs = parse_tis_to_proof_inputs
            except ImportError:
                self.zk_bridge = False
                print("[WARN] ZK bridge not available")
        else:
            self.zk_bridge = False

    def execute(self, state: AgentState) -> AgentState:
        """Execute intent generation phase"""
        print(f"\n[INTENT]")

        if not state.decision.get("should_act"):
            print(f"   Skipping - agent decided not to act")
            state.tis_json = {"status": "no_action"}
            return state

        # Generate Transaction Intent Schema (TIS)
        state.tis_json = {
            "agentAddress": state.agent_address,
            "actionType": state.decision["action_type"],
            "actionValue": state.decision["proposed_value"],
            "policyRef": state.policy_hash,
            "policyMin": state.observed_data["policy_min"],
            "policyMax": state.observed_data["policy_max"],
            "timestamp": int(datetime.now().timestamp()),
            "rationale": state.decision.get("rationale", "")
        }

        print(f"   TIS generated:")
        print(f"      Action: {state.tis_json['actionType']}")
        print(f"      Value: {state.tis_json['actionValue']}")
        print(f"      Bounds: [{state.tis_json['policyMin']}, {state.tis_json['policyMax']}]")

        # Generate ZK proof if circuit is available
        if self.zk_bridge and self.use_real_zk:
            try:
                print(f"   [ZK] Generating proof...")
                proof_result = self.generate_policy_proof(
                    state.tis_json["actionValue"],
                    state.tis_json["policyMin"],
                    state.tis_json["policyMax"]
                )
                state.proof_generated = proof_result
                print(f"   [OK] Proof generated | Compliant: {proof_result['isCompliant']}")
            except Exception as e:
                print(f"   [WARN] ZK proof generation failed: {e}")
        else:
            # Mock proof for testing
            state.proof_generated = {
                "isCompliant": (state.tis_json["actionValue"] >= state.tis_json["policyMin"] and
                               state.tis_json["actionValue"] <= state.tis_json["policyMax"]),
                "status": "mock"
            }
            print(f"   [Mock] Compliance: {state.proof_generated['isCompliant']}")

        return state


class ArvyonAgent:
    """Main agent orchestrator"""

    def __init__(self, agent_address: str, policy_hash: str):
        self.agent_address = agent_address
        self.policy_hash = policy_hash
        self.observe = ObserveNode()
        self.decide = DecideNode()
        self.intent = IntentNode(use_real_zk=False)  # Set to True when ready with proofs

    def step(self) -> AgentState:
        """Execute one iteration of the agent loop"""
        state = AgentState(
            agent_address=self.agent_address,
            policy_hash=self.policy_hash
        )

        state = self.observe.execute(state)
        state = self.decide.execute(state)
        state = self.intent.execute(state)

        return state

    def run_loop(self, iterations: int = 1):
        """Run agent for N iterations"""
        print(f"\n{'='*60}")
        print(f"[START] Arvyon Agent Starting")
        print(f"   Address: {self.agent_address[:10]}...")
        print(f"   Policy: {self.policy_hash[:10]}...")
        print(f"{'='*60}")

        for i in range(iterations):
            print(f"\n--- Iteration {i+1}/{iterations} ---")
            state = self.step()
            state.iteration = i + 1

            if state.tis_json.get("status") == "no_action":
                print("\n[INFO] No action taken")
            else:
                print(f"\n[OK] Decision ready for execution:")
                print(json.dumps(state.tis_json, indent=2))

        print(f"\n{'='*60}")
        print(f"[DONE] Agent loop complete")
        print(f"{'='*60}\n")


if __name__ == "__main__":
    # Example usage
    agent = ArvyonAgent(
        agent_address="0x1234567890123456789012345678901234567890",
        policy_hash="0x" + "aa" * 32
    )

    agent.run_loop(iterations=1)
