"use client";

import { useRef, useState } from "react";
import { uploadBusinessLogoAction } from "@/app/platform/businesses/logo-actions";
import { BusinessLogoAvatar } from "@/components/BusinessLogoAvatar";

const MAX_BYTES = 2 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = ["png", "jpg", "jpeg", "svg", "webp"];

export function BusinessLogoUploadField({
  value,
  onChange,
  businessName,
  error,
}: {
  value: string;
  onChange: (url: string) => void;
  businessName: string;
  error?: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleFileSelected(file: File) {
    setUploadError(null);

    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ACCEPTED_EXTENSIONS.includes(extension)) {
      setUploadError("Unsupported file type. Use PNG, JPG, JPEG, SVG, or WEBP.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setUploadError("Logo must be 2MB or smaller.");
      return;
    }

    const form = fileInputRef.current?.form;
    if (!form) {
      setUploadError("The logo could not be uploaded. Please refresh and try again.");
      return;
    }

    setUploading(true);
    try {
      // Reuse the surrounding form's hidden CSRF token; the file input itself
      // has no name so the main business form never submits the raw file.
      const formData = new FormData(form);
      formData.append("logoFile", file);
      const result = await uploadBusinessLogoAction(formData);
      if (result.error) {
        setUploadError(result.error);
      } else if (result.url) {
        onChange(result.url);
      }
    } catch {
      setUploadError("The logo could not be uploaded. Please try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <span className="text-sm font-medium text-[#111827]">Business Logo</span>
      <input type="hidden" name="logoUrl" value={value} />
      <input
        ref={fileInputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.svg,.webp,image/png,image/jpeg,image/svg+xml,image/webp"
        className="sr-only"
        aria-label="Upload business logo"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFileSelected(file);
        }}
      />
      <div className="flex flex-wrap items-center gap-3 rounded-md border border-[#E5E7EB] bg-white p-3">
        <BusinessLogoAvatar
          logoUrl={value || null}
          businessName={businessName || "Business"}
          className="h-12 w-12 rounded-full border border-[#E5E7EB] bg-[#F8FAFC] text-lg text-[#111827]"
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="rounded-md border border-[#E5E7EB] bg-white px-3 py-2 text-sm font-semibold text-[#111827] transition hover:bg-[#F9FAFB] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {uploading ? "Uploading..." : value ? "Change Logo" : "Upload Logo"}
          </button>
          {value && !uploading ? (
            <button
              type="button"
              onClick={() => {
                setUploadError(null);
                onChange("");
              }}
              className="rounded-md px-3 py-2 text-sm font-semibold text-[#B91C1C] transition hover:bg-red-50"
            >
              Remove Logo
            </button>
          ) : null}
        </div>
        <p className="w-full text-xs text-[#6B7280]">PNG, JPG, JPEG, SVG, or WEBP. Maximum 2MB.</p>
      </div>
      {uploadError || error ? <p className="text-sm text-red-700">{uploadError ?? error}</p> : null}
    </div>
  );
}
