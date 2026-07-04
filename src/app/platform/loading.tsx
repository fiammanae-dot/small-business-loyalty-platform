import { LoadingSkeleton } from "@/components/ui";

export default function PlatformLoading() {
  return (
    <div className="min-h-screen bg-[var(--app-canvas)]">
      <div className="border-b border-[var(--medium-gray)] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <LoadingSkeleton className="h-8 w-36" />
          <LoadingSkeleton className="h-8 w-20" />
        </div>
      </div>
      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:px-8">
        <LoadingSkeleton className="hidden h-[480px] rounded-xl lg:block" />
        <div className="grid gap-6">
          <div className="grid gap-2">
            <LoadingSkeleton className="h-4 w-40" />
            <LoadingSkeleton className="h-8 w-72 max-w-full" />
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <LoadingSkeleton key={index} className="h-28 rounded-xl" />
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <LoadingSkeleton key={index} className="h-11 w-32 rounded-lg" />
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <LoadingSkeleton key={index} className="h-32 rounded-xl" />
            ))}
          </div>
          <LoadingSkeleton className="h-72 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
