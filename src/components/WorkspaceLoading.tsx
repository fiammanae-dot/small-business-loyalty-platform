import { LoadingSkeleton } from "@/components/ui";

/**
 * Shown the moment a workspace link is clicked, while the server prepares the
 * page. Without it the old page just sat there until the new one was ready,
 * which made every click feel slow.
 */
export function WorkspaceLoading({ withSidebar = true, label = "Loading" }: { withSidebar?: boolean; label?: string }) {
  return (
    <div className="min-h-screen bg-[#F6F7F9]" role="status" aria-live="polite" aria-label={label}>
      <div className="border-b border-[#E5E7EB] bg-white">
        <div className="mx-auto flex max-w-screen-2xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <LoadingSkeleton className="h-8 w-40" />
          <LoadingSkeleton className="h-8 w-20" />
        </div>
      </div>
      <div className={`mx-auto grid w-full max-w-screen-2xl gap-6 px-4 py-6 sm:px-6 lg:px-8 ${withSidebar ? "lg:grid-cols-[240px_minmax(0,1fr)]" : ""}`}>
        {withSidebar ? <LoadingSkeleton className="hidden h-[520px] rounded-xl lg:block" /> : null}
        <div className="grid content-start gap-6">
          <div className="grid gap-2">
            <LoadingSkeleton className="h-4 w-32" />
            <LoadingSkeleton className="h-8 w-64 max-w-full" />
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <LoadingSkeleton key={index} className="h-24 rounded-xl" />
            ))}
          </div>
          <LoadingSkeleton className="h-64 rounded-xl" />
        </div>
      </div>
      <span className="sr-only">{label}…</span>
    </div>
  );
}
