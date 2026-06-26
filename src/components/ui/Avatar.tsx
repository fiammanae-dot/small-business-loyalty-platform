import { cn } from "./utils";

export function Avatar({
  name,
  imageUrl,
  className,
}: {
  name: string;
  imageUrl?: string | null;
  className?: string;
}) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <span className={cn("inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-[#FED7AA] bg-[#FFF7ED] text-sm font-bold text-[#EA580C]", className)}>
      {imageUrl ? <img src={imageUrl} alt="" className="h-full w-full object-cover" /> : initials || "LB"}
    </span>
  );
}
