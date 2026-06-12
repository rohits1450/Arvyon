"""
Chain Bridge - Submit agent decisions to the blockchain.

This module connects the agent's intent output (TIS + ZK proof) to the
deployed Arvyon contracts on Sepolia:

- PolicyRegistry  - read the agent's registered policy hash (read-only)
- Executor        - executeWithVerification(): verifies the ZK proof on-chain
                    and logs the result (the "verified execution" primitive)
- PDRLogger       - logDecision(): immutable audit record (the "PDR" primitive)

Configuration is entirely environment-driven so the agent can run in a pure
off-chain mode (no creds -> on-chain steps are skipped) or submit real
transactions when credentials are present:

    ARVYON_RPC_URL       JSON-RPC endpoint (e.g. an Alchemy/Infura Sepolia URL)
    ARVYON_PRIVATE_KEY   private key of the agent account (pays gas, is msg.sender)
    ARVYON_DRY_RUN       if "1", build/estimate the tx but never broadcast it

Contract addresses are read from contracts/deployments.json and may be
overridden per-contract via ARVYON_{POLICY_REGISTRY,EXECUTOR,PDR_LOGGER}_ADDR.

NOTE ON PROOF/VERIFIER COMPATIBILITY: the deployed PolicyCheckVerifier was
generated from a different trusted-setup zkey than the local
circuits/zkey_final.zkey, so a proof produced locally will not satisfy the
on-chain verifier (Executor will record isAuthorized=false). The PDRLogger
path does not verify proofs and records compliance directly. See README.
"""

import json
import os
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# web3 is optional: if it isn't installed the on-chain steps are skipped
# gracefully rather than crashing the agent.
try:
    from web3 import Web3
    from eth_account import Account
    _WEB3_AVAILABLE = True
except ImportError:  # pragma: no cover - exercised only without web3 installed
    Web3 = None
    Account = None
    _WEB3_AVAILABLE = False

REPO_ROOT = Path(__file__).resolve().parent.parent
DEPLOYMENTS_PATH = REPO_ROOT / "contracts" / "deployments.json"

# Minimal ABIs - only the functions/events the agent actually uses.
POLICY_REGISTRY_ABI = [
    {
        "inputs": [{"name": "user", "type": "address"}],
        "name": "getPolicy",
        "outputs": [{"name": "", "type": "bytes32"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [{"name": "user", "type": "address"}],
        "name": "hasPolicy",
        "outputs": [{"name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function",
    },
]

EXECUTOR_ABI = [
    {
        "inputs": [
            {"name": "agent", "type": "address"},
            {"name": "actionType", "type": "string"},
            {"name": "proofA", "type": "uint256[2]"},
            {"name": "proofB", "type": "uint256[2][2]"},
            {"name": "proofC", "type": "uint256[2]"},
            {"name": "pubSignals", "type": "uint256[1]"},
        ],
        "name": "executeWithVerification",
        "outputs": [{"name": "success", "type": "bool"}],
        "stateMutability": "nonpayable",
        "type": "function",
    },
]

PDR_LOGGER_ABI = [
    {
        "inputs": [
            {"name": "agent", "type": "address"},
            {"name": "actionType", "type": "string"},
            {"name": "policyHash", "type": "bytes32"},
            {"name": "isCompliant", "type": "bool"},
        ],
        "name": "logDecision",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
]


def load_deployments() -> Dict:
    """Load the deployed contract addresses from deployments.json."""
    if not DEPLOYMENTS_PATH.exists():
        return {}
    with open(DEPLOYMENTS_PATH) as f:
        return json.load(f)


def _resolve_addresses(deployments: Dict) -> Dict[str, Optional[str]]:
    """Resolve contract addresses, preferring env overrides then deployments.json.

    deployments.json holds both a legacy nested "contracts" block and newer
    top-level keys; the top-level keys are the current deployment, so they win.
    """
    contracts = deployments.get("contracts", {})

    def nested(name: str) -> Optional[str]:
        return contracts.get(name, {}).get("address")

    return {
        "PolicyRegistry": os.environ.get("ARVYON_POLICY_REGISTRY_ADDR")
        or deployments.get("PolicyRegistry")
        or nested("PolicyRegistry"),
        "Executor": os.environ.get("ARVYON_EXECUTOR_ADDR")
        or deployments.get("Executor")
        or nested("Executor"),
        "PDRLogger": os.environ.get("ARVYON_PDR_LOGGER_ADDR")
        or deployments.get("PDRLogger")
        or nested("PDRLogger"),
    }


def format_proof_for_solidity(
    proof: Dict,
) -> Tuple[List[int], List[List[int]], List[int]]:
    """Convert a snarkjs Groth16 proof into Solidity calldata components.

    Follows the snarkjs `exportSolidityCallData` convention, where the two
    coordinates of each G2 element in pi_b are swapped.

    Returns (a, b, c) as integer arrays matching the verifier's
    verifyProof(uint[2], uint[2][2], uint[2], uint[1]) signature.
    """
    a = [int(proof["pi_a"][0]), int(proof["pi_a"][1])]
    b = [
        [int(proof["pi_b"][0][1]), int(proof["pi_b"][0][0])],
        [int(proof["pi_b"][1][1]), int(proof["pi_b"][1][0])],
    ]
    c = [int(proof["pi_c"][0]), int(proof["pi_c"][1])]
    return a, b, c


class ChainClient:
    """Thin web3 wrapper for submitting Arvyon decisions on-chain."""

    def __init__(
        self,
        rpc_url: str,
        addresses: Dict[str, Optional[str]],
        private_key: Optional[str] = None,
        dry_run: bool = False,
    ):
        if not _WEB3_AVAILABLE:
            raise RuntimeError("web3 is not installed; cannot create ChainClient")

        self.w3 = Web3(Web3.HTTPProvider(rpc_url))
        self.dry_run = dry_run
        self.addresses = addresses

        self.account = None
        if private_key:
            self.account = Account.from_key(private_key)

        self.policy_registry = None
        if addresses.get("PolicyRegistry"):
            self.policy_registry = self.w3.eth.contract(
                address=Web3.to_checksum_address(addresses["PolicyRegistry"]),
                abi=POLICY_REGISTRY_ABI,
            )
        self.executor = None
        if addresses.get("Executor"):
            self.executor = self.w3.eth.contract(
                address=Web3.to_checksum_address(addresses["Executor"]),
                abi=EXECUTOR_ABI,
            )
        self.pdr_logger = None
        if addresses.get("PDRLogger"):
            self.pdr_logger = self.w3.eth.contract(
                address=Web3.to_checksum_address(addresses["PDRLogger"]),
                abi=PDR_LOGGER_ABI,
            )

    def is_connected(self) -> bool:
        try:
            return self.w3.is_connected()
        except Exception:
            return False

    @property
    def agent_address(self) -> Optional[str]:
        return self.account.address if self.account else None

    def read_policy(self, agent: str) -> Dict:
        """Read an agent's registered policy hash (read-only, no key needed)."""
        if not self.policy_registry:
            return {"status": "skipped", "reason": "no PolicyRegistry address"}
        agent = Web3.to_checksum_address(agent)
        has_policy = self.policy_registry.functions.hasPolicy(agent).call()
        policy_hash = self.policy_registry.functions.getPolicy(agent).call()
        return {
            "status": "ok",
            "hasPolicy": has_policy,
            "policyHash": "0x" + policy_hash.hex() if isinstance(policy_hash, bytes) else policy_hash,
        }

    def _send(self, fn) -> Dict:
        """Build, (optionally) sign and broadcast a contract function call."""
        if not self.account:
            return {"status": "skipped", "reason": "no private key configured"}

        sender = self.account.address
        tx = fn.build_transaction(
            {
                "from": sender,
                "nonce": self.w3.eth.get_transaction_count(sender),
                "chainId": self.w3.eth.chain_id,
            }
        )
        # Estimate gas; surface failures (e.g. require() reverts) clearly.
        try:
            tx["gas"] = int(self.w3.eth.estimate_gas(tx) * 1.2)
        except Exception as e:
            return {"status": "error", "stage": "estimate_gas", "error": str(e)}

        if self.dry_run:
            return {"status": "dry_run", "gas": tx["gas"], "to": tx["to"]}

        signed = self.account.sign_transaction(tx)
        tx_hash = self.w3.eth.send_raw_transaction(signed.raw_transaction)
        receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
        return {
            "status": "confirmed" if receipt.status == 1 else "reverted",
            "txHash": tx_hash.hex(),
            "blockNumber": receipt.blockNumber,
            "gasUsed": receipt.gasUsed,
        }

    def submit_execution(self, agent: str, action_type: str, proof_result: Dict) -> Dict:
        """Submit the ZK proof to Executor.executeWithVerification()."""
        if not self.executor:
            return {"status": "skipped", "reason": "no Executor address"}
        if "proof" not in proof_result:
            return {"status": "skipped", "reason": "no ZK proof available"}

        a, b, c = format_proof_for_solidity(proof_result["proof"])
        pub_signals = [int(s) for s in proof_result["publicSignals"]]

        fn = self.executor.functions.executeWithVerification(
            Web3.to_checksum_address(agent), action_type, a, b, c, pub_signals
        )
        return self._send(fn)

    def log_decision(
        self, agent: str, action_type: str, policy_hash: str, is_compliant: bool
    ) -> Dict:
        """Record a Policy Decision Record via PDRLogger.logDecision()."""
        if not self.pdr_logger:
            return {"status": "skipped", "reason": "no PDRLogger address"}

        policy_bytes = _to_bytes32(policy_hash)
        fn = self.pdr_logger.functions.logDecision(
            Web3.to_checksum_address(agent), action_type, policy_bytes, bool(is_compliant)
        )
        return self._send(fn)


def _to_bytes32(value) -> bytes:
    """Normalise a policy hash (hex string or bytes) into 32 bytes."""
    if isinstance(value, bytes):
        return value.rjust(32, b"\x00")[:32]
    if isinstance(value, str):
        hex_str = value[2:] if value.startswith("0x") else value
        if hex_str == "":
            return b"\x00" * 32
        return bytes.fromhex(hex_str).rjust(32, b"\x00")[:32]
    return b"\x00" * 32


def get_chain_client() -> Optional[ChainClient]:
    """Build a ChainClient from environment config, or None if unavailable.

    Returns None (rather than raising) when web3 is missing or no RPC URL is
    configured, so the agent can run fully off-chain by default.
    """
    if not _WEB3_AVAILABLE:
        return None

    rpc_url = os.environ.get("ARVYON_RPC_URL")
    if not rpc_url:
        return None

    deployments = load_deployments()
    addresses = _resolve_addresses(deployments)
    private_key = os.environ.get("ARVYON_PRIVATE_KEY")
    dry_run = os.environ.get("ARVYON_DRY_RUN", "0") == "1"

    return ChainClient(rpc_url, addresses, private_key=private_key, dry_run=dry_run)


if __name__ == "__main__":
    # Quick self-check: resolve addresses and (if configured) read a policy.
    deployments = load_deployments()
    addresses = _resolve_addresses(deployments)
    print("Resolved contract addresses:")
    for name, addr in addresses.items():
        print(f"   {name}: {addr}")

    client = get_chain_client()
    if client is None:
        print("\n[INFO] No ARVYON_RPC_URL set (or web3 missing) - on-chain steps disabled.")
    else:
        print(f"\nConnected: {client.is_connected()}")
        if client.agent_address:
            print(f"Agent account: {client.agent_address}")
            print(client.read_policy(client.agent_address))
