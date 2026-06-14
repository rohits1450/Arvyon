/**
 * End-to-end proof of genuine ON-CHAIN ZK verification.
 *
 * Deploys the full suite on the in-process Hardhat network, generates REAL
 * Groth16 proofs with the agent's proving key, and submits them to
 * Executor.executeWithVerification — which calls Groth16Verifier.verifyProof
 * ON-CHAIN. Asserts:
 *   - a compliant action (value within bounds) → isAuthorized == true
 *   - a non-compliant action (value out of bounds) → isAuthorized == false
 *
 * Run: npx hardhat run scripts/test-onchain-proof.js
 */
const hre = require("hardhat");
const path = require("path");
const assert = require("assert");

const AGENT_DIR = path.join(__dirname, "..", "..", "agent");
const snarkjs = require(path.join(AGENT_DIR, "node_modules", "snarkjs"));
const WASM = path.join(AGENT_DIR, "circuits", "policy_check.wasm");
const ZKEY = path.join(AGENT_DIR, "circuits", "zkey_final.zkey");

async function genProof(actionValue, policyMin, policyMax) {
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    { actionValue, policyMin, policyMax },
    WASM,
    ZKEY,
  );
  // Use snarkjs's authoritative Solidity calldata formatter.
  const calldata = await snarkjs.groth16.exportSolidityCallData(proof, publicSignals);
  const [a, b, c, pub] = JSON.parse(`[${calldata}]`);
  return { a, b, c, pub };
}

async function main() {
  const ethers = hre.ethers;
  const [agent] = await ethers.getSigners();

  console.log("Deploying contracts on the in-process Hardhat network...");
  const PolicyRegistry = await ethers.getContractFactory("PolicyRegistry");
  const registry = await PolicyRegistry.deploy();
  await registry.deployed();

  const PDRLogger = await ethers.getContractFactory("PDRLogger");
  const pdr = await PDRLogger.deploy();
  await pdr.deployed();

  const Verifier = await ethers.getContractFactory("Groth16Verifier");
  const verifier = await Verifier.deploy();
  await verifier.deployed();

  const Executor = await ethers.getContractFactory("Executor");
  const executor = await Executor.deploy(registry.address, pdr.address, verifier.address);
  await executor.deployed();
  console.log("  Verifier:", verifier.address);
  console.log("  Executor:", executor.address, "\n");

  // Register a policy for the agent (required by the Executor).
  const policyHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("policy-v1"));
  await (await registry.registerPolicy(policyHash)).wait();
  console.log("Policy registered:", policyHash, "\n");

  const POLICY_MIN = 10;
  const POLICY_MAX = 100;

  // --- Case 1: compliant action (value within [10,100]) ---
  console.log("[Case 1] value=50 within bounds -> expect isAuthorized=true");
  const ok = await genProof(50, POLICY_MIN, POLICY_MAX);
  assert.strictEqual(BigInt(ok.pub[0]), 1n, "circuit should report compliant");
  const ZERO = ethers.constants.AddressZero;
  const authorized = await executor.callStatic.executeWithVerification(
    agent.address, "TRADE", ZERO, "0x", ok.a, ok.b, ok.c, ok.pub,
  );
  console.log("  on-chain verifyProof + compliance -> isAuthorized =", authorized);
  assert.strictEqual(authorized, true, "compliant proof must authorize on-chain");

  // Send it for real so the PDR event is emitted.
  const rcpt = await (
    await executor.executeWithVerification(agent.address, "TRADE", ZERO, "0x", ok.a, ok.b, ok.c, ok.pub)
  ).wait();
  const logged = pdr.interface.parseLog(
    rcpt.logs.find((l) => l.address === pdr.address),
  );
  console.log("  PDR DecisionLogged -> isCompliant =", logged.args.isCompliant, "\n");
  assert.strictEqual(logged.args.isCompliant, true, "PDR should record authorized=true");

  // --- Case 2: non-compliant action (value out of bounds) ---
  console.log("[Case 2] value=150 out of bounds -> expect isAuthorized=false");
  const bad = await genProof(150, POLICY_MIN, POLICY_MAX);
  assert.strictEqual(BigInt(bad.pub[0]), 0n, "circuit should report non-compliant");
  const authorized2 = await executor.callStatic.executeWithVerification(
    agent.address, "TRADE", ZERO, "0x", bad.a, bad.b, bad.c, bad.pub,
  );
  console.log("  on-chain verifyProof valid, compliance=0 -> isAuthorized =", authorized2, "\n");
  assert.strictEqual(authorized2, false, "non-compliant proof must not authorize");

  // --- Case 3: tampered proof must NOT authorize (verifyProof returns false,
  // or the pairing precompile reverts — either way, never authorized). ---
  console.log("[Case 3] tampered proof -> must not authorize");
  const tampered = { ...ok, a: [ok.a[0], "12345"] };
  let authorized3 = false;
  try {
    authorized3 = await executor.callStatic.executeWithVerification(
      agent.address, "TRADE", ZERO, "0x", tampered.a, tampered.b, tampered.c, tampered.pub,
    );
  } catch {
    authorized3 = false; // reverted = rejected
  }
  console.log("  tampered proof -> isAuthorized =", authorized3, "\n");
  assert.strictEqual(authorized3, false, "tampered proof must never authorize");

  // --- Case 4: a genuine compliant proof dispatches a REAL on-chain action ---
  console.log("[Case 4] compliant proof + target -> dispatches real action");
  const MockTarget = await ethers.getContractFactory("MockTarget");
  const target = await MockTarget.deploy();
  await target.deployed();
  const payload = target.interface.encodeFunctionData("ping", [50]);

  const rcpt4 = await (
    await executor.executeWithVerification(
      agent.address, "TRADE", target.address, payload, ok.a, ok.b, ok.c, ok.pub,
    )
  ).wait();
  const executed = rcpt4.logs.some((l) => {
    try {
      return executor.interface.parseLog(l).name === "ActionExecuted";
    } catch {
      return false;
    }
  });
  console.log("  target.callCount =", (await target.callCount()).toString(),
    "| ActionExecuted emitted =", executed);
  assert.strictEqual((await target.callCount()).toNumber(), 1, "authorized proof must dispatch the action");
  assert.strictEqual(executed, true, "ActionExecuted must be emitted for a dispatched action");

  console.log("\nALL ASSERTIONS PASSED — on-chain ZK verification + real execution are genuine.");
}

main()
  // snarkjs keeps a worker-thread pool alive, which otherwise prevents node
  // from exiting; exit explicitly once the script is done.
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
