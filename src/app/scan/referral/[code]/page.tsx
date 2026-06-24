import { redirect } from "next/navigation";

export default async function ScanReferralRedirectPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  redirect("/scan/" + encodeURIComponent("referral:" + code));
}
