# ZK Proof Outputs

This directory stores SnarkJS outputs when proofs are generated.

Generated files (via `npx snarkjs` from Python subprocess):
- `policy_check_js/` — Generated witness calculator
- `policy_check.zkey` — Proving key
- `policy_check_final.zkey` — Final proving key
- `proof.json` — Generated proof
- `public.json` — Public inputs

These are generated at runtime via the intent node and submitted to Executor contract.
