# Arvyon

Arvyon is a ZK-verified autonomous AI agent framework for trustless policy
enforcement on blockchain. It enables users to deploy AI agents that act
on-chain autonomously, while every decision is paired with a zero-knowledge
proof of policy compliance, stored as an immutable on-chain audit record.

---

## The Problem

AI agents operating on blockchain can execute transactions, vote in DAOs,
and manage assets autonomously. But there's no way to prove the agent
followed the rules it was given by, leading users to blindly trust off-chain logic.


---

## The Solution

Arvyon introduces three primitives:

- **Transaction Intent Schema (TIS)** — A structured declaration of what
  the agent intends to do and why, generated before every action
- **ZK Policy Proof** — A zero-knowledge proof that the intended action
  complies with the user-defined policy, without revealing internal
  agent logic or raw data
- **Policy Decision Record (PDR)** — An on-chain immutable log of every
  agent decision, queryable by anyone, forever

---

## Use Cases

| Domain | How Arvyon Helps |
|---|---|
| DeFi Trading Agents | Prove every trade respected user-defined risk limits |
| DAO Governance | Cryptographically verify voting agents followed delegate preferences |
| Healthcare Data Markets | Prove agents only accessed policy-compliant data |
| Web3 Game NPCs | Audit autonomous NPC economic decisions on-chain |
| Media Provenance | Verify AI editorial policy was followed before publishing |
| Smart Contract Auditing | Bind audit agents to authorized inspection scope |

---

## Tech Stack

| Layer | Technology |
|---|---|
| AI Agent Core | Python, LangGraph |
| ZK Proof Engine | Circom, Noir (Aztec) |
| Smart Contracts | Solidity (EVM compatible) |
| On-chain Data | The Graph (GraphQL subgraphs) |
| Frontend dApp | Next.js, ethers.js, Tailwind CSS |
| Testing | Foundry |

---

## Research

Arvyon is being developed alongside a research paper:

**"Arvyon: A ZK-Verified Autonomous AI Agent Framework for Trustless
Policy Enforcement on Blockchain"**

Key references this work builds upon:
- *Verifying Authenticity and Intent in a Trustless Environment*
  (arXiv:2511.15712, 2025)
- *Autonomous Agents on Blockchains: Standards and Execution Models*
  (arXiv:2601.04583, 2026)
- *ERC-8126: AI Agent Verification* (Ethereum Magicians, Jan 2026)

---

## Status

🔨 In active development
