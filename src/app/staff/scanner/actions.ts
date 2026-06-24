"use server";

import { redirect } from "next/navigation";
import { extractScanToken } from "@/lib/scan";
import { requireRole } from "@/lib/session";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function staffScannerAction(formData: FormData) {
  await requireRole("STAFF");
  const token = extractScanToken(getString(formData, "scanInput"));
  if (!token) {
    redirect("/staff/scanner?error=Enter a valid scan token or scan URL.");
  }

  redirect(`/scan/${encodeURIComponent(token)}`);
}
