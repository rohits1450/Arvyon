"use client";

import toast from "react-hot-toast";
import type { ContractTransactionResponse } from "ethers";
import { explorerTx, NETWORK } from "@/src/lib/constants";

/**
 * Wrap a contract transaction with toast notifications: pending → success/error,
 * including a clickable Etherscan link. Returns the receipt or throws.
 */
export async function runTransaction(
  label: string,
  send: () => Promise<ContractTransactionResponse>,
) {
  const toastId = toast.loading(`${label}: awaiting wallet…`);
  try {
    const tx = await send();
    toast.loading(`${label}: confirming…`, { id: toastId });
    const receipt = await tx.wait();
    const txUrl = explorerTx(tx.hash);
    toast.success(
      (t) => (
        <span className="flex flex-col gap-1">
          <span>{label} confirmed</span>
          {txUrl ? (
            <a
              href={txUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-indigo-600 underline"
              onClick={() => toast.dismiss(t.id)}
            >
              View on {NETWORK.name} explorer ↗
            </a>
          ) : (
            <span className="text-xs text-zinc-500">tx {tx.hash.slice(0, 10)}…</span>
          )}
        </span>
      ),
      { id: toastId, duration: 8000 },
    );
    return receipt;
  } catch (e: unknown) {
    const msg =
      typeof e === "object" && e !== null && "shortMessage" in e
        ? String((e as { shortMessage: string }).shortMessage)
        : e instanceof Error
          ? e.message
          : "Transaction failed";
    toast.error(`${label} failed: ${msg}`, { id: toastId });
    throw e;
  }
}
