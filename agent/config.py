"""
Agent configuration — the single, dynamic source for the agent's identity and
policy. Nothing here is hardcoded into the node logic:

- The policy (action type + bounds) is loaded from agent/policy.json (override
  with ARVYON_POLICY_FILE).
- The on-chain policy hash is derived from that file via a canonical keccak256,
  matching the frontend so the same definition produces the same hash.
- The agent address is derived from ARVYON_PRIVATE_KEY when present, otherwise
  read from ARVYON_AGENT_ADDRESS.
"""

import json
import os
from pathlib import Path
from typing import Dict, Optional

try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent / ".env")
except ImportError:  # pragma: no cover
    pass

try:
    from eth_utils import keccak
    from eth_account import Account
except ImportError:  # pragma: no cover
    keccak = None
    Account = None

DEFAULT_POLICY_FILE = Path(__file__).parent / "policy.json"
ZERO_ADDRESS = "0x" + "00" * 20


def load_policy() -> Dict:
    """Load the agent's policy definition (action type + numeric bounds)."""
    path = Path(os.environ.get("ARVYON_POLICY_FILE", DEFAULT_POLICY_FILE))
    with open(path) as f:
        return json.load(f)


def canonical_policy_json(policy: Dict) -> str:
    """Deterministic serialization used for hashing (sorted keys, no spaces).

    The frontend hashes the identical canonical form, so a policy registered in
    the dApp and the same policy used by the agent yield the same hash.
    """
    return json.dumps(policy, sort_keys=True, separators=(",", ":"))


def policy_hash(policy: Optional[Dict] = None) -> str:
    """keccak256 of the canonical policy JSON, as a 0x-prefixed bytes32 string."""
    if keccak is None:
        raise RuntimeError("eth_utils not installed; cannot hash policy")
    if policy is None:
        policy = load_policy()
    digest = keccak(text=canonical_policy_json(policy))
    return "0x" + digest.hex()


def agent_address() -> str:
    """Resolve the agent address from the private key, or ARVYON_AGENT_ADDRESS."""
    pk = os.environ.get("ARVYON_PRIVATE_KEY")
    if pk and Account is not None:
        return Account.from_key(pk).address
    return os.environ.get("ARVYON_AGENT_ADDRESS", ZERO_ADDRESS)


def get_agent_config() -> Dict:
    """Assemble the full runtime config the graph is seeded with."""
    policy = load_policy()
    return {
        "policy": policy,
        "policy_hash": policy_hash(policy),
        "agent_address": agent_address(),
    }


if __name__ == "__main__":
    cfg = get_agent_config()
    print("Agent address:", cfg["agent_address"])
    print("Policy:", cfg["policy"])
    print("Policy hash:", cfg["policy_hash"])
