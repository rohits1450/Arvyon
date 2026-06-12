import { HardhatUserConfig } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";
// import "@nomicfoundation/hardhat-verify"; // Version conflict with Hardhat 2.x
import "dotenv/config";

// Default RPC endpoints so `compile`, the in-process `hardhat` network, and the
// local `localhost` node all work without any .env. Real deployments still read
// SEPOLIA_RPC_URL / PRIVATE_KEY from the environment.
const SEPOLIA_RPC_URL =
  process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";

const config: HardhatUserConfig = {
  solidity: "0.8.19",
  paths: {
    sources: "./contracts",
  },
  networks: {
    sepolia: {
      url: SEPOLIA_RPC_URL,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || "",
  },
};

export default config;
