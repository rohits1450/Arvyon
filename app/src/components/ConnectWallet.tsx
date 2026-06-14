"use client";

import { useWalletContext } from "@/src/context/WalletContext";
import { shortenHex } from "@/src/lib/formatters";
import { NETWORK } from "@/src/lib/constants";

export function ConnectWallet() {
  const { address, isConnecting, isCorrectNetwork, connect, switchNetwork } =
    useWalletContext();

  if (!address) {
    return (
      <button
        onClick={connect}
        disabled={isConnecting}
        className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-60"
      >
        {isConnecting ? "Connecting…" : "Connect Wallet"}
      </button>
    );
  }

  if (!isCorrectNetwork) {
    return (
      <button
        onClick={switchNetwork}
        className="rounded-full bg-amber-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-400"
      >
        Switch to {NETWORK.name}
      </button>
    );
  }

  return (
    <span className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
      <span className="h-2 w-2 rounded-full bg-green-500" />
      {shortenHex(address)}
    </span>
  );
}
