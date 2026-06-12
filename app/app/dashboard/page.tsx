"use client";

import { useCallback, useEffect, useState } from "react";
import { useWalletContext } from "@/src/context/WalletContext";
import { useReadContracts } from "@/src/hooks/useContract";
import { PolicyCard } from "@/src/components/PolicyCard";
import { SkeletonCard, SkeletonRows } from "@/src/components/LoadingSkeletons";
import { explorerAddress } from "@/src/lib/constants";
import { shortenHex, timeAgo } from "@/src/lib/formatters";

interface Decision {
  agent: string;
  actionType: string;
  policyHash: string;
  isCompliant: boolean;
  timestamp: number;
  txHash: string;
}

export default function DashboardPage() {
  const { address } = useWalletContext();
  const { policyRegistry, pdrLogger } = useReadContracts();

  const [policy, setPolicy] = useState<{
    hash: string;
    timestamp: bigint;
  } | null>(null);
  const [policyLoading, setPolicyLoading] = useState(false);

  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);

  // Load the connected agent's policy
  useEffect(() => {
    if (!address) {
      setPolicy(null);
      return;
    }
    let cancelled = false;
    setPolicyLoading(true);
    (async () => {
      try {
        const [hash, ts] = await Promise.all([
          policyRegistry.getPolicy(address),
          policyRegistry.getPolicyTimestamp(address),
        ]);
        if (!cancelled) setPolicy({ hash, timestamp: ts });
      } finally {
        if (!cancelled) setPolicyLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [address, policyRegistry]);

  // Load the public PDR audit feed (recent DecisionLogged events)
  const loadFeed = useCallback(async () => {
    setFeedLoading(true);
    setFeedError(null);
    try {
      const provider = pdrLogger.runner?.provider;
      const latest = (await provider!.getBlockNumber()) ?? 0;
      // Sepolia public RPCs cap getLogs ranges; scan a recent window.
      const fromBlock = Math.max(0, latest - 45000);
      const events = await pdrLogger.queryFilter(
        pdrLogger.filters.DecisionLogged(),
        fromBlock,
        latest,
      );
      const parsed: Decision[] = events
        .map((e) => {
          const args = (e as unknown as { args: unknown[] }).args;
          return {
            agent: String(args[0]),
            actionType: String(args[1]),
            policyHash: String(args[2]),
            isCompliant: Boolean(args[3]),
            timestamp: Number(args[4]),
            txHash: e.transactionHash,
          };
        })
        .reverse()
        .slice(0, 25);
      setDecisions(parsed);
    } catch (e) {
      setFeedError(
        e instanceof Error ? e.message : "Could not load the audit feed.",
      );
    } finally {
      setFeedLoading(false);
    }
  }, [pdrLogger]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-12">
      <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500">
          Your agent
        </h2>
        {!address ? (
          <div className="rounded-xl border border-dashed border-zinc-300 p-6 text-sm text-zinc-500 dark:border-zinc-700">
            Connect a wallet to view your registered policy.
          </div>
        ) : policyLoading || !policy ? (
          <SkeletonCard />
        ) : (
          <PolicyCard
            address={address}
            policyHash={policy.hash}
            timestamp={policy.timestamp}
          />
        )}
      </section>

      <section className="mt-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            Policy Decision Records
          </h2>
          <button
            onClick={loadFeed}
            className="text-xs text-indigo-600 hover:underline dark:text-indigo-400"
          >
            Refresh
          </button>
        </div>

        {feedLoading ? (
          <SkeletonRows rows={5} />
        ) : feedError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {feedError}
          </div>
        ) : decisions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 p-6 text-sm text-zinc-500 dark:border-zinc-700">
            No decisions recorded in the recent block window.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900">
                <tr>
                  <th className="px-4 py-2 font-medium">Agent</th>
                  <th className="px-4 py-2 font-medium">Action</th>
                  <th className="px-4 py-2 font-medium">Compliant</th>
                  <th className="px-4 py-2 font-medium">When</th>
                  <th className="px-4 py-2 font-medium">Tx</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {decisions.map((d, i) => (
                  <tr key={`${d.txHash}-${i}`} className="bg-white dark:bg-zinc-950">
                    <td className="px-4 py-2 font-mono">
                      <a
                        href={explorerAddress(d.agent)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:underline dark:text-indigo-400"
                      >
                        {shortenHex(d.agent)}
                      </a>
                    </td>
                    <td className="px-4 py-2">{d.actionType}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          d.isCompliant
                            ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                            : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                        }`}
                      >
                        {d.isCompliant ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-zinc-500">{timeAgo(d.timestamp)}</td>
                    <td className="px-4 py-2 font-mono text-xs">
                      {shortenHex(d.txHash, 6, 4)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
