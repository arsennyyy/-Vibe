export default function ConcertsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-border bg-[var(--vibe-surface)] overflow-hidden animate-pulse"
        >
          <div className="h-52 bg-white/[0.06]" />
          <div className="p-5 space-y-3">
            <div className="h-6 bg-white/[0.06] rounded-lg w-3/4" />
            <div className="h-4 bg-white/[0.04] rounded w-full" />
            <div className="h-4 bg-white/[0.04] rounded w-2/3" />
            <div className="h-10 bg-white/[0.04] rounded-xl mt-4" />
          </div>
        </div>
      ))}
    </div>
  );
}
