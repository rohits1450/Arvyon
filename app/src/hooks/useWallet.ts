"use client";

import { useCallback, useEffect, useState } from "react";
import { BrowserProvider } from "ethers";
import { NETWORK, CHAIN_ID, CHAIN_ID_HEX } from "@/src/lib/constants";

export interface WalletState {
  address: string | null;
  chainId: number | null;
  provider: BrowserProvider | null;
  isConnecting: boolean;
  isCorrectNetwork: boolean;
  error: string | null;
  connect: () => Promise<void>;
  switchToSepolia: () => Promise<void>;
}

export function useWallet(): WalletState {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (typeof window === "undefined" || !window.ethereum) return;
    const p = new BrowserProvider(window.ethereum);
    const accounts = (await window.ethereum.request({
      method: "eth_accounts",
    })) as string[];
    const net = await p.getNetwork();
    setProvider(p);
    setChainId(Number(net.chainId));
    setAddress(accounts.length > 0 ? accounts[0] : null);
  }, []);

  const connect = useCallback(async () => {
    setError(null);
    if (typeof window === "undefined" || !window.ethereum) {
      setError("No Ethereum wallet found. Install MetaMask to continue.");
      return;
    }
    setIsConnecting(true);
    try {
      const accounts = (await window.ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];
      const p = new BrowserProvider(window.ethereum);
      const net = await p.getNetwork();
      setProvider(p);
      setAddress(accounts[0] ?? null);
      setChainId(Number(net.chainId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to connect wallet");
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const switchToSepolia = useCallback(async () => {
    if (typeof window === "undefined" || !window.ethereum) return;
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: CHAIN_ID_HEX }],
      });
    } catch (e: unknown) {
      // 4902 = chain not added to the wallet yet
      if (typeof e === "object" && e !== null && (e as { code?: number }).code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: CHAIN_ID_HEX,
              chainName: NETWORK.name,
              rpcUrls: [NETWORK.rpcUrl],
              nativeCurrency: NETWORK.nativeCurrency,
              blockExplorerUrls: [NETWORK.explorer],
            },
          ],
        });
      }
    }
  }, []);

  useEffect(() => {
    refresh();
    if (typeof window === "undefined" || !window.ethereum?.on) return;
    const onAccounts = (...args: unknown[]) => {
      const accounts = args[0] as string[];
      setAddress(accounts.length > 0 ? accounts[0] : null);
    };
    const onChain = () => refresh();
    window.ethereum.on("accountsChanged", onAccounts);
    window.ethereum.on("chainChanged", onChain);
    return () => {
      window.ethereum?.removeListener?.("accountsChanged", onAccounts);
      window.ethereum?.removeListener?.("chainChanged", onChain);
    };
  }, [refresh]);

  return {
    address,
    chainId,
    provider,
    isConnecting,
    isCorrectNetwork: chainId === CHAIN_ID,
    error,
    connect,
    switchToSepolia,
  };
}
