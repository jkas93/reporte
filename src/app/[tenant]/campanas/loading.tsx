export default function CampanasLoading() {
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

      {/* Table Skeleton */}
      <div className="h-[500px] w-full bg-muted animate-pulse rounded-xl border" />
    </div>
  );
}
