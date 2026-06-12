/**
 * Arvyon dApp constants — network config + deployed contract addresses.
 *
 * Addresses mirror contracts/deployments.json (the single source of truth).
 * They can be overridden at build time via NEXT_PUBLIC_* env vars.
 */
import abi from "@/src/contracts/abi.json";

export const SEPOLIA_CHAIN_ID = 11155111;
export const SEPOLIA_CHAIN_ID_HEX = "0xaa36a7";

export const NETWORK = {
  chainId: SEPOLIA_CHAIN_ID,
  chainIdHex: SEPOLIA_CHAIN_ID_HEX,
  name: "Sepolia",
  rpcUrl:
    process.env.NEXT_PUBLIC_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com",
  explorer: "https://sepolia.etherscan.io",
  nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
};

export const CONTRACTS = {
  PolicyRegistry:
    process.env.NEXT_PUBLIC_POLICY_REGISTRY ||
    "0xA765a452c26DD14278B23830B801887F46DB3bF2",
  PDRLogger:
    process.env.NEXT_PUBLIC_PDR_LOGGER ||
    "0x93Cd482389Ba18D157F52e8871f28719698c3f5E",
  Executor:
    process.env.NEXT_PUBLIC_EXECUTOR ||
    "0x2131aB1c9F3F9E7155FF2f29C62cac31564D0114",
} as const;

export const ABIS = abi as {
  PolicyRegistry: object[];
  PDRLogger: object[];
  Executor: object[];
};

export type ContractName = keyof typeof CONTRACTS;

export function explorerAddress(address: string): string {
  return `${NETWORK.explorer}/address/${address}`;
}

export function explorerTx(hash: string): string {
  return `${NETWORK.explorer}/tx/${hash}`;
}
