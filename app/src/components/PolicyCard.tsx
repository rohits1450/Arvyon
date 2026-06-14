import { explorerAddress } from "@/src/lib/constants";
import { formatTimestamp, isZeroHash, shortenHex } from "@/src/lib/formatters";

interface PolicyCardProps {
  address: string;
  policyHash: string;
  timestamp: number | bigint;
}

export function PolicyCard({ address, policyHash, timestamp }: PolicyCardProps) {
  const active = !isZeroHash(policyHash);
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Registered Policy
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            active
              ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
              : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800"
          }`}
        >
          {active ? "Active" : "None"}
        </span>
      </div>
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-zinc-500">Agent</dt>
          <dd className="font-mono">
            {explorerAddress(address) ? (
              <a
                href={explorerAddress(address)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:underline dark:text-indigo-400"
              >
                {shortenHex(address)}
              </a>
            ) : (
              <span>{shortenHex(address)}</span>
            )}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-zinc-500">Policy hash</dt>
          <dd className="break-all text-right font-mono text-xs">
            {active ? policyHash : "—"}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-zinc-500">Last updated</dt>
          <dd>{active ? formatTimestamp(timestamp) : "—"}</dd>
        </div>
      </dl>
    </div>
  );
}
