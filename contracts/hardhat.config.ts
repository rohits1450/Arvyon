import { HardhatUserConfig } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";
// import "@nomicfoundation/hardhat-verify"; // Version conflict with Hardhat 2.x
import "dotenv/config";

const config: HardhatUserConfig = {
  solidity: "0.8.19",
  paths: {
    sources: "./contracts",
  },
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    bscTestnet: {
      url: "https://data-seed-prebsc-1-s3:8545",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || "",
  },
};

export default config;
