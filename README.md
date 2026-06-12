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

Working today:

- **Agent** — LangGraph pipeline (`observe → decide → intent → submit`). Runs in a
  fast mock mode by default; set `ARVYON_REAL_ZK=1` for real Groth16 proofs and
  `ARVYON_RPC_URL` / `ARVYON_PRIVATE_KEY` to submit decisions on-chain. See
  `agent/.env.example`.
- **Contracts** — PolicyRegistry, PDRLogger and Executor deployed to Sepolia
  (addresses in `contracts/deployments.json`).
- **Frontend** — Next.js dApp (`app/`) with wallet connect, policy registration,
  and a public Policy Decision Record audit feed wired to the Sepolia contracts.
