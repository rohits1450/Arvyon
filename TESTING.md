# Arvyon — Local Testing Workflow

End-to-end on localhost: deploy contracts → register a policy → run the agent
(real ZK proof verified **on-chain**) → watch it in the dApp. Everything is
driven by config (`contracts/deployments.json` + `agent/policy.json`); nothing
is hardcoded, so the same steps work on any network.

```
agent (observe→decide→intent→submit)
   │  real Groth16 proof
   ▼
Executor.executeWithVerification ──► Groth16Verifier.verifyProof (ON-CHAIN)
   │                                         │
   ▼                                         ▼
PDRLogger.DecisionLogged  ◄────────  isAuthorized = proofValid && compliant
   │
   ▼
Next.js dApp  ──► reads policy + PDR audit feed
```

---

## 0. One-time install

```bash
# Contracts (Hardhat)
cd contracts && npm install --legacy-peer-deps

# Agent (Python deps + snarkjs for proving)
cd ../agent && pip install -r requirements.txt && npm install

# Frontend
cd ../app && npm install
```

> The Python ZK bridge shells out to snarkjs, which is why `agent/` has its own
> `npm install`.

---

## 1. (Optional) Real LLM via Ollama — free & local

Without this the agent uses a clearly-labeled **rule-based fallback** (not AI).
To get genuine LLM reasoning:

```bash
ollama serve            # if not already running
ollama pull llama3.1    # any chat model
```

That's it — no API key, no config. In `auto` mode the agent detects the running
Ollama and auto-selects an installed model. (Override host with
`ARVYON_OLLAMA_HOST`; use a hosted provider instead via `ARVYON_LLM_BASE_URL` /
`ARVYON_LLM_API_KEY` / `ARVYON_LLM_MODEL`, or Anthropic via `ANTHROPIC_API_KEY`.)

---

## 2. Start a local chain

In a dedicated terminal (keep it running):

```bash
cd contracts
npm run node          # hardhat node on http://127.0.0.1:8545 (chainId 31337)
```

Hardhat prints 20 funded test accounts. **Account #0** is used below:

```
Address:     0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

> These keys are publicly known — **local testing only, never fund them**.

---

## 3. Deploy + register a policy

In a second terminal:

```bash
cd contracts
npm run deploy:local            # deploys all contracts, writes deployments.json,
                                # and syncs addresses into the frontend
npm run register-policy:local   # registers agent/policy.json's canonical hash
                                # for account #0
```

`deploy:local` deploys `PolicyRegistry`, `PDRLogger`, the `Groth16Verifier`
(generated from the agent's proving key), and `Executor`, then runs
`sync-config.js` so the dApp picks up the new addresses automatically.

`register-policy:local` hashes `agent/policy.json` with the **same canonical
keccak256** the agent and dApp use, so all three agree on the policy hash.

---

## 4. Run the agent — real proof, verified on-chain

```bash
cd ..   # repo root
ARVYON_RPC_URL=http://127.0.0.1:8545 \
ARVYON_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
ARVYON_REAL_ZK=1 \
ARVYON_SUBMIT_MODE=executor \
python3 -m agent.main
```

Expected (abridged):

```
[OBSERVE] ... Market price: 40 (volatility LOW)
[DECIDE]  [LLM:openai] base_url=http://localhost:11434/v1 model=llama3.1   # or [Rule-based fallback]
[INTENT]  [ZK] Generating proof...  Proof generated | Compliant: True
[SUBMIT]  [EXEC] {'status': 'confirmed', 'txHash': '0x…', 'gasUsed': 246220}
```

`gasUsed ≈ 246k` is the cost of the **on-chain** Groth16 pairing check. The
Executor records `isAuthorized = proofValid && isCompliant`.

**Tip:** prefer setting these in `agent/.env` (copy from `agent/.env.example`)
instead of inline env vars. Useful flags:

| Var | Effect |
|---|---|
| `ARVYON_SUBMIT_MODE` | `pdr` (log only) · `executor` (verify proof on-chain) · `both` |
| `ARVYON_REAL_ZK=1` | real Groth16 proof (required for `executor`) |
| `ARVYON_DRY_RUN=1` | build/estimate the tx but don't broadcast |
| `ARVYON_MARKET_SEED=7` | deterministic market for reproducible runs |
| `ARVYON_ITERATIONS=3` | run the loop N times |

---

## 5. Explore in the dApp

```bash
cd app
npm run dev          # http://localhost:3000
```

Point MetaMask at the local chain:

- **Add network** → RPC `http://127.0.0.1:8545`, Chain ID `31337`, symbol `ETH`.
- **Import account** → paste Account #0's private key (step 2).

Then:

- **/dashboard** — your registered policy + the live **Policy Decision Record**
  audit feed (the agent's on-chain decisions appear here).
- **/create-policy** — register/update/revoke a policy. The computed hash matches
  the agent's for the same definition.
- **/admin** — the deployed contract addresses (read live from the synced config)
  and a glossary.

---

## 6. Verify the on-chain proof logic directly (no agent/dApp)

A self-contained Hardhat test deploys the suite, generates real proofs, and
asserts the on-chain verifier behaves correctly:

```bash
cd contracts
npm run test:onchain-proof
```

Asserts: compliant proof → `isAuthorized=true`, out-of-bounds → `false`,
tampered proof → rejected.

---

## Going to Sepolia

Same flow with your own funded key. Create `contracts/.env`:

```
SEPOLIA_RPC_URL=https://...
PRIVATE_KEY=0x...        # funded with Sepolia ETH
```

```bash
cd contracts
npm run deploy:sepolia           # deploys + syncs frontend to Sepolia
npm run register-policy:sepolia
```

Then run the agent with `ARVYON_RPC_URL` / `ARVYON_PRIVATE_KEY` pointing at
Sepolia. (The currently-committed Sepolia addresses are from an earlier deploy
whose verifier predates the fixed trusted setup — redeploy to get on-chain proof
verification there.)
