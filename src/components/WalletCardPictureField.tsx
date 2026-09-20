"use client";

import { useRef, useState } from "react";
import { uploadWalletPhotoAction } from "@/app/dashboard/programs/photo-actions";
import { StampIconPicker } from "@/components/StampIconPicker";

const MAX_BYTES = 4 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = ["png", "jpg", "jpeg", "webp"];

type HeroStyle = "STAMPS" | "PHOTO";

/**
 * Google Wallet gives an issuer exactly one picture slot on the card. This is
 * where a business decides what goes in it: the stamps, which fill up as the
 * customer collects, or a photo of their own that never changes.
 *
 * The two choices share one slot, so this is a radio rather than two
 * independent settings. Whichever is not chosen stays mounted but hidden, so
 * switching back and forth does not lose the icon or the uploaded photo.
 */
export function WalletCardPictureField({
  defaultHeroStyle,
  defaultPhotoUrl,
  defaultEmoji,
}: {
  defaultHeroStyle?: HeroStyle | null;
  defaultPhotoUrl?: string | null;
  defaultEmoji?: string | null;
}) {
  const [heroStyle, setHeroStyle] = useState<HeroStyle>(defaultHeroStyle === "PHOTO" ? "PHOTO" : "STAMPS");
  const [photoUrl, setPhotoUrl] = useState(defaultPhotoUrl?.trim() ?? "");
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
      // Borrow the surrounding program form's CSRF token. The file input has no
      // name, so saving the program never posts the raw file with it.
      const formData = new FormData(form);
      formData.append("walletPhotoFile", file);
      const result = await uploadWalletPhotoAction(formData);
      if (result.error) {
        setUploadError(result.error);
      } else if (result.url) {
        setPhotoUrl(result.url);
      }
    } catch {
      setUploadError("The picture could not be uploaded. Please try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="grid gap-4">
      <input type="hidden" name="walletHeroStyle" value={heroStyle} />
      <input type="hidden" name="walletPhotoUrl" value={photoUrl} />

      <div className="grid gap-3 md:grid-cols-2">
        <Choice
          checked={heroStyle === "STAMPS"}
          onSelect={() => setHeroStyle("STAMPS")}
          title="Show the stamps"
          detail="The card shows a row of stamps that fills up as the customer collects. Recommended."
        />
        <Choice
          checked={heroStyle === "PHOTO"}
          onSelect={() => setHeroStyle("PHOTO")}
          title="Show my own picture"
          detail="The card shows one picture you upload. It stays the same no matter how many stamps the customer has."
        />
      </div>

      <div className={heroStyle === "STAMPS" ? "grid gap-3" : "hidden"}>
        <StampIconPicker defaultEmoji={defaultEmoji} />
      </div>

      <div className={heroStyle === "PHOTO" ? "grid gap-3" : "hidden"}>
        <input
          ref={fileInputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
          className="sr-only"
          aria-label="Upload the card picture"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFileSelected(file);
          }}
        />
        <div className="grid gap-3 rounded-md border border-[#E5E7EB] bg-white p-3">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoUrl}
              alt="The picture on the wallet card"
              className="h-auto w-full max-w-[344px] rounded-md border border-[#E5E7EB] object-cover"
            />
          ) : (
            <p className="text-sm text-[#6B7280]">No picture yet. The card falls back to the stamps until you upload one.</p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="rounded-md border border-[#E5E7EB] bg-white px-3 py-2 text-sm font-semibold text-[#111827] transition hover:bg-[#F9FAFB] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploading ? "Uploading..." : photoUrl ? "Change Picture" : "Upload Picture"}
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
                Remove Picture
              </button>
            ) : null}
          </div>

          <div className="space-y-1.5 rounded-md border border-[#FDE68A] bg-[#FFFBEB] p-3">
            <p className="text-xs font-semibold text-[#92400E]">Size this picture for the wallet card</p>
            <ul className="list-disc space-y-0.5 pl-4 text-xs text-[#92400E]">
              <li>Use a <strong>wide</strong> picture, 1032 x 812 pixels</li>
              <li>Keep anything important in the middle - the sides get trimmed on narrow phones</li>
              <li>Do not put words on the picture; small text will not be readable</li>
              <li>Your logo and business name already appear above it, so leave them out</li>
            </ul>
          </div>
          <p className="text-xs text-[#6B7280]">PNG, JPG, JPEG, or WEBP. Maximum 4MB.</p>
          {uploadError ? <p className="text-sm text-red-700">{uploadError}</p> : null}
        </div>
      </div>
    </div>
  );
}

function Choice({
  checked,
  onSelect,
  title,
  detail,
}: {
  checked: boolean;
  onSelect: () => void;
  title: string;
  detail: string;
}) {
  return (
    <label
      className={`flex min-h-24 cursor-pointer gap-3 rounded-xl border p-4 transition ${
        checked ? "border-[var(--business-primary)] bg-[var(--business-primary-soft)]" : "border-[#E5E7EB] bg-white hover:border-[var(--business-primary)]"
      }`}
    >
      <input type="radio" checked={checked} onChange={onSelect} className="mt-1 h-4 w-4" />
      <span>
        <span className="block text-sm font-semibold text-[#111827]">{title}</span>
        <span className="mt-1 block text-xs leading-5 text-[#6B7280]">{detail}</span>
      </span>
    </label>
  );
}
