"use client";

import { useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Loader2, Search, X } from "lucide-react";

export type ComboboxOption = {
  value: string;
  label: string;
  description?: string;
  badge?: string;
  disabled?: boolean;
};

type SearchableComboboxProps = {
  label: string;
  name: string;
  options: ComboboxOption[];
  defaultValue?: string;
  placeholder?: string;
  emptyLabel?: string;
  loading?: boolean;
  required?: boolean;
  maxVisibleOptions?: number;
};

export function SearchableCombobox({
  label,
  name,
  options,
  defaultValue = "",
  placeholder = "Search and select",
  emptyLabel = "No results found.",
  loading = false,
  required = false,
  maxVisibleOptions = 80,
}: SearchableComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedValue, setSelectedValue] = useState(defaultValue);
  const [activeIndex, setActiveIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const selectedOption = options.find((option) => option.value === selectedValue);
  const normalizedQuery = query.trim().toLowerCase();
  const matchedOptions = useMemo(() => {
    return normalizedQuery
      ? options.filter((option) =>
          [option.label, option.description, option.badge]
            .filter(Boolean)
            .some((value) => value!.toLowerCase().includes(normalizedQuery)),
        )
      : options;
  }, [normalizedQuery, options]);
  const filteredOptions = matchedOptions.slice(0, maxVisibleOptions);
  const hiddenOptionCount = Math.max(0, matchedOptions.length - filteredOptions.length);

  function openList() {
    setOpen(true);
    window.setTimeout(() => searchInputRef.current?.focus(), 0);
  }

  function selectOption(option: ComboboxOption) {
    if (option.disabled) return;
    setSelectedValue(option.value);
    setQuery("");
    setOpen(false);
    setActiveIndex(0);
  }

  function clearSelection() {
    setSelectedValue("");
    setQuery("");
    setActiveIndex(0);
    setOpen(false);
  }

  return (
    <div className="relative text-sm font-medium text-[#111827]">
      <span>{label}</span>
      <input type="hidden" name={name} value={selectedValue} required={required} />
      <div className="mt-1 flex gap-2">
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={open ? () => setOpen(false) : openList}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              openList();
            }
          }}
          className="flex h-10 min-w-0 flex-1 items-center justify-between gap-3 rounded-md border border-[#E5E7EB] bg-white px-3 text-left text-sm text-[#111827] outline-none transition focus:border-[#F97316] focus:ring-4 focus:ring-orange-100"
        >
          <span className="min-w-0">
            <span className={selectedOption ? "block truncate font-semibold text-[#111827]" : "block truncate text-[#6B7280]"}>
              {selectedOption?.label ?? placeholder}
            </span>
            {selectedOption?.description ? (
              <span className="block truncate text-xs font-normal text-[#6B7280]">{selectedOption.description}</span>
            ) : null}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-[#6B7280]" aria-hidden="true" />
        </button>
        {selectedValue ? (
          <button
            type="button"
            aria-label={`Clear ${label}`}
            onClick={clearSelection}
            className="flex h-10 w-10 items-center justify-center rounded-md border border-[#E5E7EB] bg-white text-[#6B7280] transition hover:border-[#F97316] hover:text-[#F97316]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {open ? (
        <div className="absolute z-50 mt-2 w-full rounded-md border border-[#E5E7EB] bg-white p-2 shadow-xl">
          <div className="flex items-center gap-2 rounded-md border border-[#E5E7EB] px-3">
            <Search className="h-4 w-4 text-[#6B7280]" aria-hidden="true" />
            <input
              ref={searchInputRef}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setOpen(false);
                }
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setActiveIndex((index) => Math.min(index + 1, filteredOptions.length - 1));
                }
                if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setActiveIndex((index) => Math.max(index - 1, 0));
                }
                if (event.key === "Enter" && filteredOptions[activeIndex]) {
                  event.preventDefault();
                  selectOption(filteredOptions[activeIndex]);
                }
              }}
              placeholder="Type to filter..."
              className="h-10 w-full bg-transparent text-sm outline-none"
            />
          </div>

          <div role="listbox" className="mt-2 max-h-[min(320px,45vh)] overflow-y-auto overscroll-contain">
            {loading ? (
              <div className="flex items-center gap-2 px-3 py-4 text-sm text-[#6B7280]">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Loading options...
              </div>
            ) : filteredOptions.length ? (
              filteredOptions.map((option, index) => (
                <button
                  key={`${option.value}-${option.label}`}
                  type="button"
                  role="option"
                  aria-selected={option.value === selectedValue}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => selectOption(option)}
                  disabled={option.disabled}
                  className={`flex w-full items-start justify-between gap-3 rounded-md px-3 py-2 text-left transition ${
                    option.disabled
                      ? "cursor-not-allowed opacity-50"
                      : index === activeIndex
                        ? "bg-orange-50"
                        : "hover:bg-[#FAFAFA]"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-[#111827]">
                      <HighlightedText text={option.label} query={query} />
                    </span>
                    {option.description ? (
                      <span className="mt-0.5 block text-xs font-normal text-[#6B7280]">
                        <HighlightedText text={option.description} query={query} />
                      </span>
                    ) : null}
                    {option.badge ? (
                      <span className="mt-1 inline-flex rounded-md bg-orange-50 px-2 py-0.5 text-xs font-semibold text-[#F97316]">
                        <HighlightedText text={option.badge} query={query} />
                      </span>
                    ) : null}
                  </span>
                  {option.value === selectedValue ? <Check className="mt-1 h-4 w-4 shrink-0 text-[#F97316]" aria-hidden="true" /> : null}
                </button>
              ))
            ) : (
              <p className="px-3 py-4 text-sm text-[#6B7280]">{emptyLabel}</p>
            )}
          </div>

          {hiddenOptionCount > 0 ? (
            <p className="border-t border-[#E5E7EB] px-3 pt-2 text-xs font-normal text-[#6B7280]">
              Showing first {filteredOptions.length} results. Continue typing to narrow the list.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  const trimmed = query.trim();
  if (!trimmed) return <>{text}</>;

  const index = text.toLowerCase().indexOf(trimmed.toLowerCase());
  if (index === -1) return <>{text}</>;

  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded bg-[#FDBA74]/40 px-0.5 text-inherit">{text.slice(index, index + trimmed.length)}</mark>
      {text.slice(index + trimmed.length)}
    </>
  );
}
