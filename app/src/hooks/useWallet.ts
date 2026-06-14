"use client";

import { useCallback, useEffect, useState } from "react";
import { BrowserProvider } from "ethers";
import { NETWORK, CHAIN_ID, CHAIN_ID_HEX, HAS_EXPLORER } from "@/src/lib/constants";

let metamaskFromEIP6963: any = null;

if (typeof window !== "undefined") {
  window.addEventListener("eip6963:announceProvider", (event: any) => {
    if (event.detail?.info?.name === "MetaMask") {
      metamaskFromEIP6963 = event.detail.provider;
    }
  });
  window.dispatchEvent(new Event("eip6963:requestProvider"));
}

const getEthereumProvider = (): any => {
  if (metamaskFromEIP6963) return metamaskFromEIP6963;

  if (typeof window === "undefined") return null;
  const eth = (window as any).ethereum;
  if (!eth) return null;
  
  // Prefer MetaMask if multiple injected providers exist (e.g. TrustWallet + MetaMask)
  if (eth.providers) {
    const metamask = eth.providers.find((p: any) => p.isMetaMask && !p.isTrust && !p.isTrustWallet);
    if (metamask) return metamask;
  }
  return eth;
};

export interface WalletState {
  address: string | null;
  chainId: number | null;
  provider: BrowserProvider | null;
  isConnecting: boolean;
  isCorrectNetwork: boolean;
  error: string | null;
  connect: () => Promise<void>;
  switchNetwork: () => Promise<void>;
}

export function useWallet(): WalletState {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const eth = getEthereumProvider();
    if (!eth) return;
    const p = new BrowserProvider(eth);
    const accounts = (await eth.request({
      method: "eth_accounts",
    })) as string[];
    const net = await p.getNetwork();
    setProvider(p);
    setChainId(Number(net.chainId));
    setAddress(accounts.length > 0 ? accounts[0] : null);
  }, []);

  const connect = useCallback(async () => {
    setError(null);
    const eth = getEthereumProvider();
    if (!eth) {
      setError("No Ethereum wallet found. Install MetaMask to continue.");
      return;
    }
    setIsConnecting(true);
    try {
      const accounts = (await eth.request({
        method: "eth_requestAccounts",
      })) as string[];
      const p = new BrowserProvider(eth);
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

  const switchNetwork = useCallback(async () => {
    const eth = getEthereumProvider();
    if (!eth) return;
    setError(null);
    try {
      await eth.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: CHAIN_ID_HEX }],
      });
    } catch (e: unknown) {
      // 4902 = chain not added to the wallet yet → add it (MetaMask then selects it).
      if (typeof e === "object" && e !== null && (e as { code?: number }).code === 4902) {
        try {
          // MetaMask rejects wallet_addEthereumChain when blockExplorerUrls is
          // empty or not a valid http(s) URL (e.g. a local Hardhat node has no
          // explorer), so only include it when there's a real one.
          const params: Record<string, unknown> = {
            chainId: CHAIN_ID_HEX,
            chainName: NETWORK.name,
            rpcUrls: [NETWORK.rpcUrl],
            nativeCurrency: NETWORK.nativeCurrency,
          };
          if (HAS_EXPLORER) params.blockExplorerUrls = [NETWORK.explorer];
          await eth.request({
            method: "wallet_addEthereumChain",
            params: [params],
          });
        } catch (addErr) {
          setError(addErr instanceof Error ? addErr.message : "Failed to add network");
        }
      } else {
        setError(e instanceof Error ? e.message : "Failed to switch network");
      }
    }
  }, []);

  useEffect(() => {
    refresh();
    const eth = getEthereumProvider();
    if (!eth?.on) return;
    const onAccounts = (...args: unknown[]) => {
      const accounts = args[0] as string[];
      setAddress(accounts.length > 0 ? accounts[0] : null);
    };
    const onChain = () => refresh();
    eth.on("accountsChanged", onAccounts);
    eth.on("chainChanged", onChain);
    return () => {
      eth.removeListener?.("accountsChanged", onAccounts);
      eth.removeListener?.("chainChanged", onChain);
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
    switchNetwork,
  };
}
