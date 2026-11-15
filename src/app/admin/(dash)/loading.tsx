import { Skeleton } from "@/components/ui/skeleton";

/** Loading skeleton for every dashboard section (lists and forms). */
export default function DashboardLoading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-5 w-72 max-w-full" />
      <div className="flex gap-2">
        <Skeleton className="h-11 flex-1" />
        <Skeleton className="hidden h-11 w-32 sm:block" />
        <Skeleton className="hidden h-11 w-32 sm:block" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl border border-line bg-card p-3">
            <Skeleton className="size-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
