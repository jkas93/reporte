export default function SuperadminLoading() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-64 bg-muted animate-pulse rounded-md" />
        <div className="h-4 w-96 bg-muted animate-pulse rounded-md" />
      </div>

      {/* KPI Cards Skeleton */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-muted animate-pulse rounded-xl border" />
        ))}
      </div>

      {/* Table/List Skeleton */}
      <div className="h-96 w-full bg-muted animate-pulse rounded-xl border mt-6" />
    </div>
  );
}
