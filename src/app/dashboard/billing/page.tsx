import { redirect } from "next/navigation";

// Billing now lives in Settings (Settings -> Billing). This route redirects
// there so existing links and bookmarks keep working.
export default function BusinessBillingPage() {
  redirect("/dashboard/settings?tab=billing");
}
