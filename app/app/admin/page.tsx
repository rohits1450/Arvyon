"use client";

import { CONTRACTS, NETWORK, explorerAddress } from "@/src/lib/constants";
import { TERMINOLOGY } from "@/src/lib/terminology";

const CONTRACT_INFO: { name: keyof typeof CONTRACTS; role: string }[] = [
  { name: "PolicyRegistry", role: "Stores agent behavioral policies as bytes32 hashes." },
  { name: "PDRLogger", role: "Immutable audit trail — emits a record for every decision." },
  { name: "Executor", role: "Verifies the ZK proof on-chain and logs the outcome." },
];

export default function AdminPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-bold tracking-tight">Deployed contracts</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Arvyon runs on <span className="font-medium">{NETWORK.name}</span> (chain
        id {NETWORK.chainId}). These are the live contract addresses the dApp and
        agent talk to.
      </p>

      <div className="mt-6 space-y-4">
        {CONTRACT_INFO.map((c) => (
          <div
            key={c.name}
            className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{c.name}</h2>
              <a
                href={explorerAddress(CONTRACTS[c.name])}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-indigo-600 hover:underline dark:text-indigo-400"
              >
                Etherscan ↗
              </a>
            </div>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{c.role}</p>
            <div className="mt-2 break-all font-mono text-xs text-zinc-500">
              {CONTRACTS[c.name]}
            </div>
          </div>
        ))}
      </div>

      <h2 className="mt-12 text-lg font-semibold">Glossary</h2>
      <dl className="mt-4 space-y-4">
        {Object.values(TERMINOLOGY).map((t) => (
          <div key={t.abbr}>
            <dt className="text-sm font-medium">
              {t.name}{" "}
              <span className="text-zinc-400">({t.abbr})</span>
            </dt>
            <dd className="text-sm text-zinc-600 dark:text-zinc-400">
              {t.description}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
