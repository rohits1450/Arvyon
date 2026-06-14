# Arvyon

Arvyon is a ZK-verified autonomous AI agent framework for trustless policy enforcement on blockchain. It enables users to deploy AI agents that act on-chain autonomously, while every decision is paired with a zero-knowledge proof of policy compliance, stored as an immutable on-chain audit record.

---

## The Problem

AI agents operating on blockchain can execute transactions, vote in DAOs, and manage assets autonomously. However, traditional frameworks require users to blindly trust off-chain logic, leaving no mathematical proof that the agent actually followed the rules it was given.

---

## The Solution

Arvyon introduces a completely trustless, end-to-end framework built on four primitives:

- **Transaction Intent Schema (TIS)** — A structured declaration of what the agent intends to do and its reasoning, generated before every action.
- **ZK Policy Proof** — A zero-knowledge proof that the intended action complies with the user-defined policy (e.g., maximum trade limits), without revealing internal complex AI logic on-chain.
- **Policy Decision Record (PDR)** — An on-chain immutable log of every agent decision, queryable by anyone, forever.
- **Executor Contract** — A smart contract that mathematically verifies the ZK Proof on-chain. If valid, it executes the real transaction (e.g., swapping tokens on Uniswap); if invalid, the transaction is perfectly blocked.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **AI Agent Core** | Python, LangGraph, Ollama (Llama 3.1) |
| **ZK Proof Engine** | Circom, snarkjs (Groth16) |
| **Smart Contracts** | Solidity, Hardhat |
| **Frontend dApp** | Next.js, React, Tailwind CSS, ethers.js |

---

## Project Architecture

Arvyon operates as a continuous pipeline bridging off-chain AI reasoning with on-chain verification.

### 1. Setup & Policy Registration in Dapp
A user interacts with the Dapp to create a policy for their AI agent. This policy is hashed and stored on the Sepolia testnet via the `PolicyRegistry` smart contract.

### 2. The Agent Loop (LangGraph Pipeline)
The core autonomous loop :
* **Observe:** The agent fetches the registered policy bounds and current market data (via CoinGecko).
* **Decide:** The agent asks an LLM (e.g., Llama 3.1) to reason about the market data and propose an action.
* **Intent & ZK Proof:** The agent structures the decision into a TIS and generates a mathematical Zero-Knowledge (ZK) proof using Circom/snarkjs that proves the action complies with the policy bounds.
* **Submit:** The agent submits the decision and ZK proof to the blockchain.

### 3. On-Chain Verification (Smart Contracts)
When submitted to Sepolia:
* The `Executor` contract runs an on-chain verification of the Groth16 ZK proof.
* If mathematically valid, the action is approved and the transaction is forwarded to the target protocol (DeFi execution).
* The decision is permanently logged into the `PDRLogger`.

### 4. Audit & Transparency (Dashboard)
The Next.js dApp listens to the blockchain and displays a live, human-readable Dashboard. Users can watch a live stream of the agent's thought process (via the Live Agent Terminal) and see an immutable feed of `ZK Verified` executions.

---

## Quick Start Guide

### 1. Start the Frontend dApp
```bash
cd app
npm install
npm run dev
```
Open `http://localhost:3000` to view the Dashboard. Connect your MetaMask to the Sepolia Testnet.

### 2. Configure the Agent
In the `agent/` folder, configure your `.env` file (copy from `.env.example`).
Ensure you set:
- `ARVYON_PRIVATE_KEY` (Your Sepolia wallet key)
- `ARVYON_REAL_ZK=1` (To generate real cryptographic proofs)
- `ARVYON_SUBMIT_MODE=both` (To log decisions and execute them on-chain)

### 3. Run the AI Agent
From the root directory, launch the agent loop:
```bash
python3 -m agent.main
```
Watch the Live Agent Terminal on your web dashboard as the AI observes the market, generates its mathematical proofs, and dispatches real transactions to Sepolia.

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.