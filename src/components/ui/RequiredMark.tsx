import { cn } from "./utils";

/**
 * Decorative only (aria-hidden): the field's `required` attribute already
 * carries the semantic requirement for assistive tech, so this stays purely
 * visual to avoid screen readers announcing "required" twice.
 */
export function RequiredMark({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cn("text-red-600", className)}>
      {" "}
      *
    </span>
  );
}
