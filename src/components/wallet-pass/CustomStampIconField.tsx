"use client";

import { useRef, useState } from "react";
import { uploadStampIconAction } from "@/app/dashboard/programs/photo-actions";

const MAX_BYTES = 2 * 1024 * 1024;

/**
 * Upload a stamp icon of the business's own (for example one bought from an
 * icon shop) to use instead of the built-in icons. It is drawn in every stamp
 * slot on the web card and in Apple and Google Wallet.
 */
export function CustomStampIconField({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setError(null);
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (extension !== "png" && extension !== "webp") {
      setError("Use a PNG or WEBP icon with a transparent background.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("The icon must be 2MB or smaller.");
      return;
    }
    const form = inputRef.current?.form;
    if (!form) {
      setError("The icon could not be uploaded. Please refresh and try again.");
      return;
    }
    setUploading(true);
    try {
      // Borrow the surrounding form's CSRF token; the file input has no name,
      // so saving the design never posts the raw file.
      const formData = new FormData(form);
      formData.append("stampIconFile", file);
      const result = await uploadStampIconAction(formData);
      if (result.error) setError(result.error);
      else if (result.url) onChange(result.url);
    } catch {
      setError("The icon could not be uploaded. Please try again.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="grid gap-3 rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-4">
      <div className="flex flex-wrap items-center gap-3">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="Your stamp icon" className="h-12 w-12 rounded-lg border border-[#E5E7EB] bg-white object-contain p-1" />
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#111827]">{value ? "Using your own icon" : "Use your own icon"}</p>
          <p className="text-xs leading-5 text-[#64748B]">
            PNG or WEBP with a transparent background, square, 256 x 256 or larger, up to 2MB. If you bought it, check the licence
            allows use in apps or digital products.
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".png,.webp,image/png,image/webp"
          className="sr-only"
          aria-label="Upload a stamp icon"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
          }}
        />
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="h-9 rounded-lg border border-[#CBD5E1] bg-white px-3 text-sm font-semibold text-[#111827] hover:border-[var(--business-primary)] disabled:opacity-60"
        >
          {uploading ? "Uploading..." : value ? "Replace" : "Upload icon"}
        </button>
        {value ? (
          <button type="button" onClick={() => onChange(null)} className="h-9 rounded-lg px-3 text-sm font-semibold text-[#64748B] hover:text-[#111827]">
            Remove
          </button>
        ) : null}
      </div>
      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
