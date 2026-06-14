/**
 * Regenerate contracts/contracts/zk/PolicyCheckVerifier.sol from the agent's
 * canonical Groth16 proving key (agent/circuits/zkey_final.zkey).
 *
 * The zkey is the single source of truth for the ZK trusted setup: the on-chain
 * verifier MUST be generated from the same zkey the agent uses to produce
 * proofs, or proofs will never satisfy the verifier. Wiring this into deploy.js
 * makes that invariant structural — every deploy re-derives the verifier from
 * the live zkey, so the two can never silently drift apart.
 *
 * Run standalone: `node scripts/export-verifier.js`
 * (also invoked automatically at the start of scripts/deploy.js)
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const CONTRACTS_ROOT = path.join(__dirname, "..");
const AGENT_DIR = path.join(CONTRACTS_ROOT, "..", "agent");
const ZKEY = path.join(AGENT_DIR, "circuits", "zkey_final.zkey");
const SNARKJS_BIN = path.join(AGENT_DIR, "node_modules", ".bin", "snarkjs");
const OUT = path.join(CONTRACTS_ROOT, "contracts", "zk", "PolicyCheckVerifier.sol");

function exportVerifier() {
  if (!fs.existsSync(ZKEY)) {
    throw new Error(`Proving key not found: ${ZKEY}`);
  }
  if (!fs.existsSync(SNARKJS_BIN)) {
    throw new Error(
      `snarkjs not found at ${SNARKJS_BIN}. Run \`npm install\` in the agent/ dir.`,
    );
  }

  // snarkjs emits a Solidity contract named `Groth16Verifier`, which is exactly
  // what Executor.sol / deploy.js reference — no renaming required. It writes to
  // a file (it cannot stream to a pipe), so emit to a temp path then move it.
  const tmp = path.join(require("os").tmpdir(), `PolicyCheckVerifier.${process.pid}.sol`);
  try {
    execFileSync(SNARKJS_BIN, ["zkey", "export", "solidityverifier", ZKEY, tmp], {
      stdio: ["ignore", "ignore", "inherit"],
    });
    const contract = fs.readFileSync(tmp, "utf-8");
    fs.writeFileSync(OUT, contract);
  } finally {
    if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
  }
  console.log(`Exported verifier from ${path.relative(CONTRACTS_ROOT, ZKEY)} -> ${path.relative(CONTRACTS_ROOT, OUT)}`);
  return OUT;
}

if (require.main === module) {
  exportVerifier();
}

module.exports = { exportVerifier };
