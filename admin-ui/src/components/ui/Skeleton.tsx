import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-lg", className)} />;
}

export function SkeletonCards({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-card rounded-2xl border border-line p-5 sm:p-6 space-y-3"
        >
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-16 ml-auto" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({
  rows = 8,
  columns = 4,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="rounded-2xl border border-line bg-card overflow-hidden">
      <div className="border-b border-line px-4 py-3 flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton
            key={i}
            className={cn("h-3", i === 0 ? "w-28" : "w-16 hidden sm:block")}
          />
        ))}
      </div>
      <div className="divide-y divide-line">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="px-4 py-4 flex items-center gap-4">
            <div className="flex-1 min-w-0 space-y-2">
              <Skeleton className="h-4 w-40 max-w-full" />
              <Skeleton className="h-3 w-52 max-w-full" />
            </div>
            <Skeleton className="h-4 w-20 hidden sm:block shrink-0" />
            <Skeleton className="h-4 w-32 hidden md:block shrink-0" />
            <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonPanelCards({ count = 2 }: { count?: number }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-card rounded-2xl border border-line p-5 sm:p-6 space-y-4"
        >
          <Skeleton className="h-5 w-36" />
          <div className="space-y-3">
            <Skeleton className="h-4 w-full max-w-md" />
            <Skeleton className="h-4 w-full max-w-sm" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonInstitutionDetail() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-28" />
      <div className="space-y-2">
        <Skeleton className="h-7 w-64 max-w-full" />
        <Skeleton className="h-4 w-48 max-w-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="bg-card rounded-2xl border border-line p-4 space-y-2"
          >
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-6 w-12" />
          </div>
        ))}
      </div>
      <SkeletonPanelCards count={2} />
      <div className="rounded-2xl border border-line bg-card overflow-hidden">
        <div className="px-5 sm:px-6 py-5 border-b border-line space-y-2">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-3 w-64 max-w-full" />
        </div>
        <div className="divide-y divide-line">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="px-5 sm:px-6 py-3 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-64 max-w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SkeletonRequestCards({ count = 3 }: { count?: number }) {
  return (
    <ul className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <li
          key={i}
          className="bg-card rounded-2xl border border-line p-5 sm:p-6 space-y-3"
        >
          <div className="flex gap-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-3 w-64 max-w-full" />
          <Skeleton className="h-3 w-36" />
        </li>
      ))}
    </ul>
  );
}
