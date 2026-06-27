import type { InputHTMLAttributes, ReactNode } from "react";
import { Search } from "lucide-react";
import { cn } from "./utils";

type SearchBarProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  helper?: ReactNode;
};

export function SearchBar({ label = "Search", helper, className, ...props }: SearchBarProps) {
  return (
    <label className="block min-w-0 text-sm font-medium text-[#1E293B]">
      <span>{label}</span>
      <span className="mt-1 flex h-11 items-center gap-2 rounded-lg border border-[#CBD5E1] bg-white px-3 shadow-sm transition duration-200 ease-out focus-within:border-[#F97316] focus-within:ring-2 focus-within:ring-[#FED7AA] motion-reduce:transition-none">
        <Search className="h-4 w-4 shrink-0 text-[#64748B]" aria-hidden />
        <input className={cn("min-w-0 flex-1 bg-transparent text-sm placeholder:text-[#94A3B8] outline-none", className)} {...props} />
      </span>
      {helper ? <span className="mt-1 block text-xs leading-5 text-[#64748B]">{helper}</span> : null}
    </label>
  );
}
