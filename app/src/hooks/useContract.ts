"use client";

import { useMemo } from "react";
import { Contract, JsonRpcProvider, type BrowserProvider } from "ethers";
import { ABIS, CONTRACTS, NETWORK } from "@/src/lib/constants";

/**
 * Read-only contract instances backed by a public RPC provider. Usable
 * without a connected wallet (e.g. for the public PDR audit feed).
 */
export function useReadContracts() {
  return useMemo(() => {
    const rpc = new JsonRpcProvider(NETWORK.rpcUrl);
    return {
      policyRegistry: new Contract(CONTRACTS.PolicyRegistry, ABIS.PolicyRegistry, rpc),
      pdrLogger: new Contract(CONTRACTS.PDRLogger, ABIS.PDRLogger, rpc),
      executor: new Contract(CONTRACTS.Executor, ABIS.Executor, rpc),
    };
  }, []);
}

/**
 * Signer-backed contract instances for transactions. Returns null until a
 * wallet provider is available.
 */
export function useWriteContracts(provider: BrowserProvider | null) {
  return useMemo(() => {
    if (!provider) return null;
    const make = async () => {
      const signer = await provider.getSigner();
      return {
        policyRegistry: new Contract(CONTRACTS.PolicyRegistry, ABIS.PolicyRegistry, signer),
        pdrLogger: new Contract(CONTRACTS.PDRLogger, ABIS.PDRLogger, signer),
        executor: new Contract(CONTRACTS.Executor, ABIS.Executor, signer),
      };
    };
    return { make };
  }, [provider]);
}
