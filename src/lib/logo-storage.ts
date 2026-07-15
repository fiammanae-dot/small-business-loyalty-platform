import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const LOGO_MAX_BYTES = 2 * 1024 * 1024;
export const LOGO_UPLOAD_URL_PREFIX = "/uploads/logos/";

const logoUploadDirectory = path.join(process.cwd(), "public", "uploads", "logos");

const allowedLogoTypes = [
  { extension: "png", mimeTypes: ["image/png"] },
  { extension: "jpg", mimeTypes: ["image/jpeg"] },
  { extension: "jpeg", mimeTypes: ["image/jpeg"] },
  { extension: "svg", mimeTypes: ["image/svg+xml"] },
  { extension: "webp", mimeTypes: ["image/webp"] },
] as const;

export type LogoValidationResult =
  | { ok: true; extension: string }
  | { ok: false; error: string };

export function validateLogoFile(file: File): LogoValidationResult {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const allowed = allowedLogoTypes.find((type) => type.extension === extension);

  if (!allowed) {
    return { ok: false, error: "Unsupported file type. Use PNG, JPG, JPEG, SVG, or WEBP." };
  }
  if (file.type && !(allowed.mimeTypes as readonly string[]).includes(file.type)) {
    return { ok: false, error: "The file content does not match its extension." };
  }
  if (file.size === 0) {
    return { ok: false, error: "The selected file is empty." };
  }
  if (file.size > LOGO_MAX_BYTES) {
    return { ok: false, error: "Logo must be 2MB or smaller." };
  }

  return { ok: true, extension: extension === "jpeg" ? "jpg" : extension };
}

/**
 * Verifies the actual bytes match the claimed format so a renamed or corrupted
 * file cannot slip through with a fake extension.
 */
export function validateLogoBytes(buffer: Buffer, extension: string): LogoValidationResult {
  if (extension === "png") {
    if (buffer.length < 8 || !buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
      return { ok: false, error: "This file is not a valid PNG image." };
    }
  } else if (extension === "jpg") {
    if (buffer.length < 3 || buffer[0] !== 0xff || buffer[1] !== 0xd8 || buffer[2] !== 0xff) {
      return { ok: false, error: "This file is not a valid JPG image." };
    }
  } else if (extension === "webp") {
    if (buffer.length < 12 || buffer.subarray(0, 4).toString("ascii") !== "RIFF" || buffer.subarray(8, 12).toString("ascii") !== "WEBP") {
      return { ok: false, error: "This file is not a valid WEBP image." };
    }
  } else if (extension === "svg") {
    const head = buffer.subarray(0, 4096).toString("utf8");
    if (!/<svg[\s>]/i.test(head)) {
      return { ok: false, error: "This file is not a valid SVG image." };
    }
    // Served with a sandboxing CSP as well; rejecting scripted SVGs is defense in depth.
    const fullText = buffer.toString("utf8");
    if (/<script[\s>]|javascript:|on\w+\s*=/i.test(fullText)) {
      return { ok: false, error: "SVG files with embedded scripts are not allowed." };
    }
  } else {
    return { ok: false, error: "Unsupported file type. Use PNG, JPG, JPEG, SVG, or WEBP." };
  }

  return { ok: true, extension };
}

export async function saveLogoFile(buffer: Buffer, extension: string) {
  const fileName = `${randomUUID()}.${extension}`;
  await mkdir(logoUploadDirectory, { recursive: true });
  await writeFile(path.join(logoUploadDirectory, fileName), buffer);
  return `${LOGO_UPLOAD_URL_PREFIX}${fileName}`;
}
