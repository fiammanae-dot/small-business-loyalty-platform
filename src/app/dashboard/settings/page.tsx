import { CsrfInput } from "@/components/CsrfInput";
import { DashboardShell } from "@/components/DashboardShell";
import { StatusBadge } from "@/components/StatusBadge";
import Link from "next/link";
import { saveAbusePolicyAction, saveCooldownRuleAction, saveCustomerTierSettingsAction, saveScannerSettingsAction } from "@/app/dashboard/actions";
import { getBusinessOwnerContext, getCurrentPlan, getCurrentSubscription } from "@/lib/business-owner";
import { normalizeTierConfig, tierMaintenanceModeLabels, tierQualificationWindowLabels } from "@/lib/customer-tiers";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { businessTypeLabels } from "@/lib/roles";
import { getSubscriptionRemainingDays, getTrialRemainingDays, subscriptionDisplayDate } from "@/lib/subscriptions";
import { messageChannelLabels } from "@/lib/messages";

export default async function BusinessSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string; tab?: string }>;
}) {
  const { user, business } = await getBusinessOwnerContext();
  const params = await searchParams;
  const plan = getCurrentPlan(business);
  const subscription = getCurrentSubscription(business);
  const expiryDate = subscriptionDisplayDate(subscription);
  const remainingDays = getSubscriptionRemainingDays(subscription);
  const trialDays = getTrialRemainingDays(subscription);
  const communicationSettings = business.communicationSettings;
  const scannerSoundEffectsEnabled = business.scannerSettings?.soundEffectsEnabled ?? true;
  const tierConfig = normalizeTierConfig(business.tierSetting);
  const cooldownRule = await prisma.cooldownRule.findFirst({
    where: { businessId: user.businessId, active: true },
    orderBy: { updatedAt: "desc" },
  });
  const abusePolicies = await prisma.abusePolicy.findMany({
    where: { businessId: user.businessId },
    orderBy: { ruleType: "asc" },
  });
  const activeTab = resolveSettingsTab(params.tab);

  return (
    <DashboardShell user={user} eyebrow="Business Owner" title="Business settings">
      {params.error || params.success ? (
        <p className={`rounded-md border px-3 py-2 text-sm ${params.error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
          {params.error ?? params.success}
        </p>
      ) : null}
      <nav className="flex gap-2 overflow-x-auto rounded-md border border-[#E5E7EB] bg-white p-2 text-sm" aria-label="Business settings tabs">
        {[
          ["overview", "Overview"],
          ["tiers", "Customer Tiers"],
          ["scanner", "Scanner Settings"],
          ["alerts", "Alert Policies"],
          ["cooldowns", "Cooldowns"],
          ["subscription", "Subscription"],
          ["communications", "Communications"],
        ].map(([tab, label]) => (
          <Link
            key={tab}
            href={`/dashboard/settings?tab=${tab}`}
            className={`shrink-0 rounded-md px-3 py-2 font-semibold ${activeTab === tab ? "bg-orange-50 business-bg-soft text-[#F97316] business-text" : "text-[#111827] hover:bg-[#FAFAFA]"}`}
          >
            {label}
          </Link>
        ))}
      </nav>

      {activeTab === "overview" ? <section className="rounded-md border border-[#E5E7EB] bg-white p-5">
        <h2 className="text-lg font-semibold text-[#111827]">Read-only setup</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Item label="Business type" value={businessTypeLabels[business.businessType]} />
          <Item label="Current plan" value={plan?.name ?? "Unassigned"} />
          <Item label="Branch limit" value={(plan?.maxBranches ?? 1).toString()} />
          <Item label="Loyalty program limit" value={(plan?.maxLoyaltyPrograms ?? 1).toString()} />
          <Item label="Management scope" value="Business profile, branches, staff, customers, and programs" />
        </div>
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-semibold text-[#F97316] business-text">Advanced identifiers</summary>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <Item label="Business ID" value={business.id.toString()} />
            <Item label="Business UUID" value={business.uuid} />
          </div>
        </details>
      </section> : null}

      {activeTab === "tiers" ? <section className="rounded-md border border-[#E5E7EB] bg-white p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#111827]">Customer tiers</h2>
            <p className="mt-2 text-sm text-[#6B7280]">
              Configure visit-based Bronze, Silver, Gold, and VIP grades. Tiers are available on every plan.
            </p>
          </div>
          <span className="w-fit rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
            Enabled
          </span>
        </div>
        <form action={saveCustomerTierSettingsAction} className="mt-5 grid gap-4">
          <CsrfInput scope="dashboard:customer-tiers" />
          <div className="grid gap-4 md:grid-cols-3">
            <label className="space-y-2">
              <span className="text-sm font-medium text-[#111827]">Tier calculation method</span>
              <select name="criteria" defaultValue="VISITS_ONLY" disabled className="h-11 w-full rounded-md border border-[#E5E7EB] bg-[#FAFAFA] px-3 text-sm text-[#6B7280]">
                <option value="VISITS_ONLY">Visits only</option>
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-[#111827]">Qualification window</span>
              <select name="tierQualificationWindow" defaultValue={tierConfig.tierQualificationWindow} className="h-11 w-full rounded-md border border-[#E5E7EB] px-3 text-sm outline-none business-ring focus:ring-0 business-border ">
                {Object.entries(tierQualificationWindowLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-[#111827]">Maintenance mode</span>
              <select name="tierMaintenanceMode" defaultValue={tierConfig.tierMaintenanceMode} className="h-11 w-full rounded-md border border-[#E5E7EB] px-3 text-sm outline-none business-ring focus:ring-0 business-border ">
                {Object.entries(tierMaintenanceModeLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Input name="silverVisitRequirement" label="Silver visit requirement" type="number" min="1" defaultValue={tierConfig.silverVisitRequirement.toString()} />
            <Input name="goldVisitRequirement" label="Gold visit requirement" type="number" min="1" defaultValue={tierConfig.goldVisitRequirement.toString()} />
            <Input name="vipVisitRequirement" label="VIP visit requirement" type="number" min="1" defaultValue={tierConfig.vipVisitRequirement.toString()} />
          </div>
          <div className="grid gap-3 rounded-md bg-orange-50 business-bg-soft px-3 py-3 text-sm text-[#9A3412] business-text-strong md:grid-cols-3">
            <p>Silver: {tierConfig.silverVisitRequirement} visits in {tierQualificationWindowLabels[tierConfig.tierQualificationWindow].toLowerCase()}</p>
            <p>Gold: {tierConfig.goldVisitRequirement} visits in {tierQualificationWindowLabels[tierConfig.tierQualificationWindow].toLowerCase()}</p>
            <p>VIP: {tierConfig.vipVisitRequirement} visits in {tierQualificationWindowLabels[tierConfig.tierQualificationWindow].toLowerCase()}</p>
          </div>
          <p className="rounded-md border border-[#E5E7EB] bg-[#FAFAFA] px-3 py-2 text-sm text-[#6B7280]">
            Bronze is automatic when a customer joins. Public customer cards show visits, tier progress, rewards, and QR code only. Spend and internal analytics are never shown on the customer card.
          </p>
          <div>
            <button type="submit" className="h-11 rounded-md bg-[#F97316] business-button px-4 text-sm font-semibold text-white">
              Save tier settings
            </button>
          </div>
        </form>
      </section> : null}

      {activeTab === "scanner" ? <section className="rounded-md border border-[#E5E7EB] bg-white p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#111827]">Scanner settings</h2>
            <p className="mt-2 text-sm text-[#6B7280]">Control audio feedback for scanner outcomes. Visual success and error messages always remain visible.</p>
          </div>
          <span className={`w-fit rounded-md px-2 py-1 text-xs font-semibold ${scannerSoundEffectsEnabled ? "bg-emerald-50 text-emerald-700" : "bg-[#FAFAFA] text-[#6B7280]"}`}>
            {scannerSoundEffectsEnabled ? "Sound ON" : "Sound OFF"}
          </span>
        </div>
        <form action={saveScannerSettingsAction} className="mt-5 grid gap-4">
          <CsrfInput scope="dashboard:scanner-settings" />
          <label className="flex items-center justify-between gap-4 rounded-md border border-[#E5E7EB] bg-[#FAFAFA] p-4">
            <span>
              <span className="block text-sm font-semibold text-[#111827]">Scanner Sound Effects</span>
              <span className="mt-1 block text-sm text-[#6B7280]">Play a short beep, buzz, or chime after scanner actions.</span>
            </span>
            <input
              type="checkbox"
              name="soundEffectsEnabled"
              defaultChecked={scannerSoundEffectsEnabled}
              className="h-5 w-5 rounded border-[#E5E7EB] text-[#F97316] business-text"
              aria-label="Scanner Sound Effects"
            />
          </label>
          <p className="rounded-md border border-orange-200 business-border-soft bg-orange-50 business-bg-soft px-3 py-2 text-sm text-[#9A3412] business-text-strong">
            Sounds play only after scanner interaction or scan form submission so mobile browsers can allow audio. Keep this on for busy counters where staff need instant feedback.
          </p>
          <div>
            <button type="submit" className="h-11 rounded-md bg-[#F97316] business-button px-4 text-sm font-semibold text-white">
              Save scanner settings
            </button>
          </div>
        </form>
      </section> : null}

      {activeTab === "alerts" ? <section className="rounded-md border border-[#E5E7EB] bg-white p-5">
        <div>
          <h2 className="text-lg font-semibold text-[#111827]">Alert policies</h2>
          <p className="mt-2 text-sm text-[#6B7280]">Tune abuse-monitoring thresholds and severity for this business.</p>
        </div>
        <div className="mt-5 grid gap-3">
          {abusePolicies.map((policy) => (
            <form key={policy.id} action={saveAbusePolicyAction} className="grid gap-3 rounded-md border border-[#E5E7EB] p-4 lg:grid-cols-[1fr_140px_150px_120px_auto] lg:items-end">
              <CsrfInput scope="dashboard:abuse-policies" />
              <input type="hidden" name="policyId" value={policy.id} />
              <div>
                <p className="text-sm font-semibold text-[#111827]">{policy.policyName}</p>
                <p className="mt-1 text-xs text-[#6B7280]">{policy.ruleType.replaceAll("_", " ").toLowerCase()}</p>
              </div>
              <Input name="thresholdValue" label="Threshold" type="number" min="0" defaultValue={policy.thresholdValue.toString()} />
              <label className="space-y-2">
                <span className="text-sm font-medium text-[#111827]">Severity</span>
                <select name="severity" defaultValue={policy.severity} className="h-11 w-full rounded-md border border-[#E5E7EB] px-3 text-sm">
                  {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((severity) => (
                    <option key={severity} value={severity}>{severity}</option>
                  ))}
                </select>
              </label>
              <label className="flex min-h-11 items-center gap-2 rounded-md border border-[#E5E7EB] px-3 text-sm font-medium text-[#111827]">
                <input type="checkbox" name="enabled" defaultChecked={policy.enabled} className="h-4 w-4 rounded border-[#E5E7EB]" />
                Enabled
              </label>
              <button type="submit" className="h-11 rounded-md border border-[#F97316] business-border px-4 text-sm font-semibold text-[#F97316] business-text">
                Save
              </button>
            </form>
          ))}
          {abusePolicies.length === 0 ? <p className="rounded-md border border-dashed border-[#E5E7EB] p-4 text-sm text-[#6B7280]">Default alert policies will be created by the Phase 12B migration.</p> : null}
        </div>
      </section> : null}

      {activeTab === "cooldowns" ? <section className="rounded-md border border-[#E5E7EB] bg-white p-5">
        <div>
          <h2 className="text-lg font-semibold text-[#111827]">Cooldown policy</h2>
          <p className="mt-2 text-sm text-[#6B7280]">Control abuse-monitoring limits for stamp issuance. Overrides are available only to Business Owners and Branch Managers.</p>
        </div>
        <form action={saveCooldownRuleAction} className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <CsrfInput scope="dashboard:cooldowns" />
          <Input name="minimumMinutesBetweenStamps" label="Minimum minutes between stamps" type="number" min="0" defaultValue={(cooldownRule?.minimumMinutesBetweenStamps ?? 0).toString()} />
          <Input name="maximumStampsPerTransaction" label="Maximum stamps per transaction" type="number" min="1" max="5" defaultValue={(cooldownRule?.maximumStampsPerTransaction ?? 5).toString()} />
          <Input name="maximumStampsPerCustomerPerDay" label="Maximum stamps per customer per day" type="number" min="1" defaultValue={cooldownRule?.maximumStampsPerCustomerPerDay?.toString() ?? ""} />
          <Input name="maximumStampsPerStaffPerDay" label="Maximum stamps per staff per day" type="number" min="1" defaultValue={cooldownRule?.maximumStampsPerStaffPerDay?.toString() ?? ""} />
          <label className="flex min-h-11 items-center gap-2 rounded-md border border-[#E5E7EB] px-3 text-sm font-medium text-[#111827]">
            <input type="checkbox" name="generateAlert" defaultChecked={cooldownRule?.generateAlert ?? true} className="h-4 w-4 rounded border-[#E5E7EB]" />
            Generate alerts for violations
          </label>
          <div className="flex items-end">
            <button type="submit" className="h-11 rounded-md bg-[#F97316] business-button px-4 text-sm font-semibold text-white">
              Save cooldown policy
            </button>
          </div>
        </form>
      </section> : null}

      {activeTab === "subscription" ? <section className="rounded-md border border-[#E5E7EB] bg-white p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#111827]">Subscription</h2>
            <p className="text-sm text-[#6B7280]">Plan and lifecycle details are managed by the System Administrator.</p>
          </div>
          {subscription ? <StatusBadge status={subscription.status} /> : null}
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Item label="Current plan" value={plan?.name ?? "Unassigned"} />
          <Item label="Renewal date" value={subscription?.renewalDate ? formatDate(subscription.renewalDate) : "Not set"} />
          <Item label="Expiry date" value={expiryDate ? formatDate(expiryDate) : "Not set"} />
          <Item label="Remaining days" value={remainingDays === null ? "Not set" : remainingDays.toString()} />
          <Item label="Trial remaining days" value={trialDays === null ? "Not in trial" : trialDays.toString()} />
          <Item label="Branch usage" value={`${business._count.branches} / ${plan?.maxBranches ?? 1}`} />
          <Item label="Program usage" value={`${business._count.loyaltyPrograms} / ${plan?.maxLoyaltyPrograms ?? 1}`} />
        </div>
      </section> : null}

      {activeTab === "communications" ? <section className="rounded-md border border-[#E5E7EB] bg-white p-5">
        <h2 className="text-lg font-semibold text-[#111827]">Communication channels</h2>
        <p className="mt-2 text-sm text-[#6B7280]">Provider-level channel settings are managed by the System Administrator. Messages are prepared manually only.</p>
        <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Item label="WhatsApp enabled" value={communicationSettings?.whatsappEnabled ? "Yes" : "No"} />
          <Item label="SMS enabled" value={communicationSettings?.smsEnabled ? "Yes" : "No"} />
          <Item label="Email enabled" value={communicationSettings?.emailEnabled ? "Yes" : "No"} />
          <Item label="Default channel" value={messageChannelLabels[communicationSettings?.preferredDefaultChannel ?? "NONE"]} />
          <Item label="WhatsApp business number" value={communicationSettings?.whatsappBusinessNumber ?? "Not set"} />
          <Item label="Sender email" value={communicationSettings?.senderEmail ?? "Not set"} />
          <Item label="Sender name" value={communicationSettings?.senderName ?? "Not set"} />
        </div>
      </section> : null}
    </DashboardShell>
  );
}

function resolveSettingsTab(tab?: string) {
  const allowed = ["overview", "tiers", "scanner", "alerts", "cooldowns", "subscription", "communications"];
  return allowed.includes(tab ?? "") ? tab! : "overview";
}

function Input({
  label,
  name,
  type = "text",
  defaultValue,
  min,
  max,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  min?: string;
  max?: string;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-[#111827]">{label}</span>
      <input name={name} type={type} min={min} max={max} defaultValue={defaultValue} className="h-11 w-full rounded-md border border-[#E5E7EB] px-3 text-sm outline-none business-ring focus:ring-0 business-border " />
    </label>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[#E5E7EB] p-4">
      <p className="text-sm text-[#6B7280]">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold text-[#111827]">{value}</p>
    </div>
  );
}
