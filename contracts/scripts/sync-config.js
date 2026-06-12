/**
 * Sync the canonical contracts/deployments.json into the frontend so the dApp
 * reads live addresses dynamically instead of hardcoding them.
 *
 * Writes app/src/contracts/deployments.json with { network, chainId, contracts }.
 * Run automatically at the end of deploy.js, or standalone: `node scripts/sync-config.js`.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const DEPLOYMENTS = path.join(__dirname, "..", "deployments.json");
const APP_OUT = path.join(ROOT, "app", "src", "contracts", "deployments.json");

function resolveAddress(deployments, name) {
  return (
    deployments[name] ||
    (deployments.contracts && deployments.contracts[name] && deployments.contracts[name].address) ||
    null
  );
}

function sync() {
  if (!fs.existsSync(DEPLOYMENTS)) {
    throw new Error(`deployments.json not found at ${DEPLOYMENTS}`);
  }
  const deployments = JSON.parse(fs.readFileSync(DEPLOYMENTS, "utf-8"));

  const config = {
    network: deployments.network || "sepolia",
    chainId: deployments.chainId || 11155111,
    contracts: {
      PolicyRegistry: resolveAddress(deployments, "PolicyRegistry"),
      PDRLogger: resolveAddress(deployments, "PDRLogger"),
      Executor: resolveAddress(deployments, "Executor"),
      PolicyCheckVerifier: resolveAddress(deployments, "PolicyCheckVerifier"),
    },
    updatedAt: deployments.timestamp || new Date().toISOString(),
  };

  fs.mkdirSync(path.dirname(APP_OUT), { recursive: true });
  fs.writeFileSync(APP_OUT, JSON.stringify(config, null, 2) + "\n");
  console.log(`Synced config to ${path.relative(ROOT, APP_OUT)}:`);
  console.log(JSON.stringify(config, null, 2));
  return config;
}

if (require.main === module) {
  sync();
}

module.exports = { sync, resolveAddress };
