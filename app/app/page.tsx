import Link from "next/link";
import { TERMINOLOGY } from "@/src/lib/terminology";
import { NETWORK } from "@/src/lib/constants";

const PRIMITIVES = [TERMINOLOGY.TIS, TERMINOLOGY.ZKP, TERMINOLOGY.PDR];

export default function Home() {
  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-16">
      <section className="flex flex-col items-start gap-6">
        <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-300">
          ZK-verified · {NETWORK.name}
        </span>
        <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
          Trustless policy enforcement for autonomous on-chain AI agents.
        </h1>
        <p className="max-w-2xl text-lg leading-8 text-zinc-600 dark:text-zinc-400">
          Arvyon lets you deploy AI agents that act on-chain autonomously, while
          every decision is paired with a zero-knowledge proof of policy
          compliance — stored as an immutable, public audit record.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/create-policy"
            className="rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
          >
            Register a policy
          </Link>
          <Link
            href="/dashboard"
            className="rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            View audit feed
          </Link>
        </div>
      </section>

      <section className="mt-16 grid gap-5 sm:grid-cols-3">
        {PRIMITIVES.map((p) => (
          <div
            key={p.abbr}
            className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <div className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
              {p.abbr}
            </div>
            <div className="mt-1 font-medium">{p.name}</div>
            <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              {p.description}
            </p>
          </div>
        ))}
      </section>

      <section className="mt-16 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-lg font-semibold">How a decision flows</h2>
        <ol className="mt-4 grid gap-4 text-sm sm:grid-cols-4">
          {[
            ["Observe", "The agent reads on-chain state and market data."],
            ["Decide", "An LLM reasons about a compliant action within policy bounds."],
            ["Prove", "A ZK proof attests the action satisfies the policy."],
            ["Record", "The decision is logged on-chain as a public PDR."],
          ].map(([title, body], i) => (
            <li key={title} className="flex flex-col gap-1">
              <span className="text-xs font-medium text-zinc-400">
                Step {i + 1}
              </span>
              <span className="font-medium">{title}</span>
              <span className="text-zinc-600 dark:text-zinc-400">{body}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
