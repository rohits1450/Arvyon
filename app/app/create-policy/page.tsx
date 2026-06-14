"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { keccak256, toUtf8Bytes } from "ethers";
import { useWalletContext } from "@/src/context/WalletContext";
import { useReadContracts, useWriteContracts } from "@/src/hooks/useContract";
import { runTransaction } from "@/src/components/TransactionToast";
import { canonicalJson, isZeroHash } from "@/src/lib/formatters";
import { NETWORK } from "@/src/lib/constants";

export default function CreatePolicyPage() {
  const { address, provider, isCorrectNetwork, connect } = useWalletContext();
  const { policyRegistry: readRegistry } = useReadContracts();
  const writers = useWriteContracts(provider);

  const [policyText, setPolicyText] = useState(
    JSON.stringify(
      {
        actionType: "TRADE",
        policyMin: 10,
        policyMax: 100,
        description:
          "Trade actions must propose a value within [policyMin, policyMax].",
      },
      null,
      2,
    ),
  );
  const [existing, setExisting] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Hash the canonical form of the parsed policy (sorted keys, no whitespace),
  // so the hash matches the agent regardless of formatting. Falls back to
  // hashing the raw text if it isn't valid JSON.
  const policyHash = useMemo(() => {
    try {
      const parsed = JSON.parse(policyText);
      return keccak256(toUtf8Bytes(canonicalJson(parsed)));
    } catch {
      try {
        return keccak256(toUtf8Bytes(policyText));
      } catch {
        return "";
      }
    }
  }, [policyText]);

  const hasPolicy = !!existing && !isZeroHash(existing);

  const refreshExisting = useCallback(async () => {
    if (!address) {
      setExisting(null);
      return;
    }
    const hash: string = await readRegistry.getPolicy(address);
    setExisting(hash);
  }, [address, readRegistry]);

  useEffect(() => {
    refreshExisting();
  }, [refreshExisting]);

  const submit = useCallback(async () => {
    if (!writers) return;
    setBusy(true);
    try {
      const { policyRegistry } = await writers.make();
      if (hasPolicy) {
        await runTransaction("Update policy", () =>
          policyRegistry.updatePolicy(policyHash),
        );
      } else {
        await runTransaction("Register policy", () =>
          policyRegistry.registerPolicy(policyHash),
        );
      }
      await refreshExisting();
    } catch {
      // toast already surfaced the error
    } finally {
      setBusy(false);
    }
  }, [writers, hasPolicy, policyHash, refreshExisting]);

  const revoke = useCallback(async () => {
    if (!writers) return;
    setBusy(true);
    try {
      const { policyRegistry } = await writers.make();
      await runTransaction("Revoke policy", () => policyRegistry.revokePolicy());
      await refreshExisting();
    } catch {
      // handled by toast
    } finally {
      setBusy(false);
    }
  }, [writers, refreshExisting]);

  const sameAsExisting = hasPolicy && existing === policyHash;
  const canSubmit =
    address && isCorrectNetwork && !busy && policyHash !== "" && !sameAsExisting;

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-bold tracking-tight">
        {hasPolicy ? "Update your policy" : "Register a policy"}
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Your policy is committed on-chain as a <span className="font-mono">bytes32</span>{" "}
        keccak256 hash of its definition. The raw rules stay off-chain; only the
        commitment is public.
      </p>

      <label className="mt-6 block text-sm font-medium">Policy definition</label>
      <textarea
        value={policyText}
        onChange={(e) => setPolicyText(e.target.value)}
        rows={8}
        spellCheck={false}
        className="mt-2 w-full rounded-lg border border-zinc-300 bg-white p-3 font-mono text-sm outline-none focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-950"
      />

      <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Computed policy hash
        </div>
        <div className="mt-1 break-all font-mono text-xs">{policyHash || "—"}</div>
        {sameAsExisting && (
          <div className="mt-2 text-xs text-amber-600 dark:text-amber-400">
            This matches your currently registered policy — change the definition
            to update.
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        {!address ? (
          <button
            onClick={connect}
            className="rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-500"
          >
            Connect wallet
          </button>
        ) : (
          <>
            <button
              onClick={submit}
              disabled={!canSubmit}
              className="rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
            >
              {hasPolicy ? "Update policy" : "Register policy"}
            </button>
            {hasPolicy && (
              <button
                onClick={revoke}
                disabled={busy}
                className="rounded-full border border-red-300 px-5 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:hover:bg-red-950/40"
              >
                Revoke
              </button>
            )}
          </>
        )}
      </div>

      {address && !isCorrectNetwork && (
        <p className="mt-4 text-sm text-amber-600 dark:text-amber-400">
          Switch your wallet to the {NETWORK.name} network to submit transactions.
        </p>
      )}
    </div>
  );
}
