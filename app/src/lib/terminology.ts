/** Glossary of Arvyon's core primitives — surfaced in UI tooltips / about pages. */

export interface Term {
  abbr: string;
  name: string;
  description: string;
}

export const TERMINOLOGY: Record<string, Term> = {
  TIS: {
    abbr: "TIS",
    name: "Transaction Intent Schema",
    description:
      "A structured declaration of what the agent intends to do and why, generated before every action.",
  },
  ZKP: {
    abbr: "ZK Proof",
    name: "Zero-Knowledge Policy Proof",
    description:
      "A zero-knowledge proof that the intended action complies with the user-defined policy, without revealing the agent's internal logic.",
  },
  PDR: {
    abbr: "PDR",
    name: "Policy Decision Record",
    description:
      "An on-chain, immutable log of every agent decision — queryable by anyone, forever.",
  },
  POLICY: {
    abbr: "Policy",
    name: "Behavioral Policy",
    description:
      "The rules an agent must follow, committed on-chain as a bytes32 hash in the PolicyRegistry.",
  },
};
