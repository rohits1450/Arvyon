export function SkeletonLine({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-zinc-200 dark:bg-zinc-800 ${className}`}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="space-y-3 rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
      <SkeletonLine className="h-4 w-1/3" />
      <SkeletonLine className="h-6 w-2/3" />
      <SkeletonLine className="h-4 w-1/2" />
    </div>
  );
}

export function SkeletonRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonLine key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}
