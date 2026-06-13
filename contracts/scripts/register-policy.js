/**
 * Register (or update) the agent's policy on-chain for the deployer account,
 * using the canonical hash of agent/policy.json — the SAME hash the agent and
 * the dApp compute. This ties the off-chain policy definition to the on-chain
 * commitment with no hardcoded hashes.
 *
 * Local:   npx hardhat run scripts/register-policy.js --network localhost
 * Sepolia: npx hardhat run scripts/register-policy.js --network sepolia
 */
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

// Canonical JSON: sorted keys (recursively), no whitespace. Matches the agent's
// json.dumps(sort_keys=True, separators=(",",":")) and the dApp's canonicalJson.
function canonicalJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
  return (
    "{" +
    Object.keys(value)
      .sort()
      .map((k) => JSON.stringify(k) + ":" + canonicalJson(value[k]))
      .join(",") +
    "}"
  );
}

async function main() {
  const policyPath = path.join(__dirname, "..", "..", "agent", "policy.json");
  const policy = JSON.parse(fs.readFileSync(policyPath, "utf-8"));
  const hash = hre.ethers.utils.keccak256(
    hre.ethers.utils.toUtf8Bytes(canonicalJson(policy)),
  );

  const deployments = require("../deployments.json");
  const registryAddr =
    deployments.PolicyRegistry ||
    (deployments.contracts && deployments.contracts.PolicyRegistry.address);

  const [signer] = await hre.ethers.getSigners();
  const reg = await hre.ethers.getContractAt("PolicyRegistry", registryAddr);

  console.log(`Account:     ${signer.address}`);
  console.log(`Policy hash: ${hash}`);

  const current = await reg.getPolicy(signer.address);
  const zero = "0x" + "0".repeat(64);
  if (current === zero) {
    const tx = await reg.registerPolicy(hash);
    await tx.wait();
    console.log(`Registered. tx: ${tx.hash}`);
  } else if (current.toLowerCase() === hash.toLowerCase()) {
    console.log("Already registered with this exact hash — nothing to do.");
  } else {
    const tx = await reg.updatePolicy(hash);
    await tx.wait();
    console.log(`Updated. tx: ${tx.hash}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
