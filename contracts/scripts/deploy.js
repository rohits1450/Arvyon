import "dotenv/config";
import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";

async function main() {
  // Get network from command line or default to Sepolia
  const network = process.argv[2] || "sepolia";

  // Load contract ABI
  const artifactPath = path.join(
    process.cwd(),
    "artifacts",
    "contracts",
    "HelloWorld.sol",
    "HelloWorld.json"
  );

  if (!fs.existsSync(artifactPath)) {
    throw new Error("Contract artifact not found. Run 'npx hardhat compile' first");
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
  const bytecode = artifact.bytecode;
  const abi = artifact.abi;

  // Setup provider and signer
  let rpcUrl, chainId;
  if (network === "sepolia") {
    rpcUrl =
      process.env.SEPOLIA_RPC_URL ||
      "https://eth-sepolia.g.alchemy.com/v2/demo";
    chainId = 11155111;
  } else if (network === "bscTestnet") {
    rpcUrl = "https://data-seed-prebsc-1-s3:8545";
    chainId = 97;
  } else {
    throw new Error(`Unknown network: ${network}`);
  }

  const provider = new ethers.providers.JsonRpcProvider(rpcUrl, {
    name: network,
    chainId,
  });

  if (!process.env.PRIVATE_KEY) {
    throw new Error("PRIVATE_KEY environment variable is not set");
  }

  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  console.log(`Deploying to ${network}...`);
  console.log(`Deployer address: ${wallet.address}`);

  // Get balance
  const balance = await provider.getBalance(wallet.address);
  console.log(
    `Balance: ${ethers.utils.formatEther(balance)} ${network === "sepolia" ? "ETH" : "BNB"}`
  );

  // Deploy contract
  const factory = new ethers.ContractFactory(abi, bytecode, wallet);
  console.log("Deploying contract...");
  const contract = await factory.deploy();
  await contract.deployed();

  console.log(`✅ HelloWorld deployed to: ${contract.address}`);

  // Test the contract
  const message = await contract.getMessage();
  console.log(`Initial message: "${message}"`);

  // Save deployment info
  const deploymentInfo = {
    network,
    contractAddress: contract.address,
    deploymentTx: contract.deployTransaction.hash,
    deployer: wallet.address,
    timestamp: new Date().toISOString(),
  };

  const deploymentPath = path.join(process.cwd(), "deployments.json");
  let deployments = {};
  if (fs.existsSync(deploymentPath)) {
    deployments = JSON.parse(fs.readFileSync(deploymentPath, "utf-8"));
  }
  deployments[network] = deploymentInfo;
  fs.writeFileSync(deploymentPath, JSON.stringify(deployments, null, 2));

  console.log("\n✅ Deployment successful!");
  console.log(`Deployment info saved to deployments.json`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
