/** Display formatting helpers for addresses, hashes and timestamps. */

export function shortenHex(value: string, lead = 6, tail = 4): string {
  if (!value) return "";
  if (value.length <= lead + tail) return value;
  return `${value.slice(0, lead)}…${value.slice(-tail)}`;
}

export function isZeroHash(hash: string): boolean {
  return !hash || /^0x0*$/.test(hash);
}

export function formatTimestamp(seconds: number | bigint): string {
  const n = typeof seconds === "bigint" ? Number(seconds) : seconds;
  if (!n) return "—";
  return new Date(n * 1000).toLocaleString();
}

export function timeAgo(seconds: number | bigint): string {
  const n = typeof seconds === "bigint" ? Number(seconds) : seconds;
  if (!n) return "—";
  const diff = Math.floor(Date.now() / 1000) - n;
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
