/**
 * Loading placeholder matching JobCard layout (logo, title/meta, score ring, tags, actions, two columns).
 */
export default function RecommendationSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="relative overflow-hidden rounded-xl border border-indigo-200/70 bg-white/90 p-6 shadow-sm"
        >
          <div
            className="pointer-events-none absolute inset-0 z-10 opacity-90 recommendation-shimmer-mask"
            aria-hidden
          />
          <div className="relative z-[1] flex gap-4">
            <div className="h-14 w-14 shrink-0 rounded-xl bg-gray-200/90 animate-pulse" />
            <div className="min-w-0 flex-1 space-y-3">
              <div className="h-5 w-2/3 max-w-sm rounded-lg bg-gray-200/90 animate-pulse" />
              <div className="flex flex-wrap gap-2">
                <div className="h-4 w-28 rounded bg-gray-200/80 animate-pulse" />
                <div className="h-4 w-32 rounded bg-gray-200/80 animate-pulse" />
                <div className="h-4 w-24 rounded bg-gray-200/80 animate-pulse" />
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <div className="h-7 w-20 rounded-full bg-gray-200/85 animate-pulse" />
                <div className="h-7 w-24 rounded-full bg-gray-200/85 animate-pulse" />
                <div className="h-7 w-16 rounded-full bg-gray-200/85 animate-pulse" />
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <div className="h-10 w-[7.5rem] rounded-full bg-gray-200/90 animate-pulse" />
            </div>
          </div>
          <div className="relative z-[1] mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="h-9 w-full max-w-[14rem] rounded-lg bg-gray-200/85 animate-pulse sm:ml-auto" />
          </div>
          <div className="relative z-[1] mt-6 grid gap-6 border-t border-gray-100 pt-6 md:grid-cols-2">
            <div className="space-y-2">
              <div className="h-4 w-32 rounded bg-gray-200/80 animate-pulse" />
              <div className="h-3 w-full rounded bg-gray-200/70 animate-pulse" />
              <div className="h-3 w-full rounded bg-gray-200/70 animate-pulse" />
              <div className="h-3 w-4/5 rounded bg-gray-200/70 animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-40 rounded bg-gray-200/80 animate-pulse" />
              <div className="h-3 w-full rounded bg-gray-200/70 animate-pulse" />
              <div className="h-3 w-5/6 rounded bg-gray-200/70 animate-pulse" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
