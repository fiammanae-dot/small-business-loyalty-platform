"use client";

import { useRef, useState } from "react";
import { uploadCashbackPhotoAction } from "@/app/dashboard/programs/photo-actions";

const MAX_BYTES = 4 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = ["png", "jpg", "jpeg", "webp"];

/**
 * The cashback card's optional picture. Cashback has no stamps, so (unlike the
 * program picture field) there is only one choice here: a photo, or nothing.
 * walletHeroStyle is pinned to PHOTO; an empty walletPhotoUrl means a clean
 * card that just shows the balance.
 */
export function CashbackPhotoField({
  defaultPhotoUrl,
  onPhotoChange,
}: {
  defaultPhotoUrl?: string | null;
  /** Lets the live card preview follow an upload or removal. */
  onPhotoChange?: (url: string) => void;
}) {
  const [photoUrl, setPhotoUrlState] = useState(defaultPhotoUrl?.trim() ?? "");
  const setPhotoUrl = (url: string) => {
    setPhotoUrlState(url);
    onPhotoChange?.(url);
  };
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelected(file: File) {
    setUploadError(null);
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ACCEPTED_EXTENSIONS.includes(extension)) {
      setUploadError("Unsupported file type. Use PNG, JPG, JPEG, or WEBP.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setUploadError("The picture must be 4MB or smaller.");
      return;
    }
    const form = fileInputRef.current?.form;
    if (!form) {
      setUploadError("The picture could not be uploaded. Please refresh and try again.");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData(form);
      formData.append("walletPhotoFile", file);
      const result = await uploadCashbackPhotoAction(formData);
      if (result.error) setUploadError(result.error);
      else if (result.url) setPhotoUrl(result.url);
    } catch {
      setUploadError("The picture could not be uploaded. Please try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="grid gap-3">
      <input type="hidden" name="walletHeroStyle" value="PHOTO" />
      <input type="hidden" name="walletPhotoUrl" value={photoUrl} />
      <div>
        <p className="text-sm font-semibold text-[#111827]">Card picture (optional)</p>
        <p className="mt-1 text-sm text-[#6B7280]">A photo shown at the top of the cashback card. Leave blank for a clean card that just shows the balance.</p>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
        className="sr-only"
        aria-label="Upload the cashback card picture"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFileSelected(file);
        }}
      />
      <div className="grid gap-3 rounded-md border border-[#E5E7EB] bg-white p-3">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt="The picture on the cashback card" className="h-auto w-full max-w-[344px] rounded-md border border-[#E5E7EB] object-cover" />
        ) : (
          <p className="text-sm text-[#6B7280]">No picture yet.</p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="rounded-md border border-[#E5E7EB] bg-white px-3 py-2 text-sm font-semibold text-[#111827] transition hover:bg-[#F9FAFB] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {uploading ? "Uploading..." : photoUrl ? "Change picture" : "Upload picture"}
          </button>
          {photoUrl && !uploading ? (
            <button
              type="button"
              onClick={() => {
                setUploadError(null);
                setPhotoUrl("");
              }}
              className="rounded-md px-3 py-2 text-sm font-semibold text-[#B91C1C] transition hover:bg-red-50"
            >
              Remove picture
            </button>
          ) : null}
        </div>
        {uploadError ? <p className="text-sm font-medium text-[#B91C1C]">{uploadError}</p> : null}
      </div>
    </div>
  );
}
