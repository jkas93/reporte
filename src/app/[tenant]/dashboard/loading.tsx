export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-64 bg-muted animate-pulse rounded-md" />
          <div className="h-4 w-96 bg-muted animate-pulse rounded-md" />
        </div>
        <div className="h-10 w-32 bg-muted animate-pulse rounded-md" />
      </div>

      {/* KPI Cards Skeleton */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-muted animate-pulse rounded-xl border" />
        ))}
      </div>

      {/* Chart & Top Campaigns Skeleton */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="lg:col-span-2 h-96 bg-muted animate-pulse rounded-xl border" />
        <div className="col-span-1 h-96 bg-muted animate-pulse rounded-xl border" />
      </div>
    </div>
  );
}
