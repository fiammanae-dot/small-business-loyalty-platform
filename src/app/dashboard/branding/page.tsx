import { redirect } from "next/navigation";
import { requireBusinessOwner } from "@/lib/business-owner";

export default async function BrandingPage() {
  await requireBusinessOwner();
  redirect("/dashboard");
}
