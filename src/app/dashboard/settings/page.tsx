import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { CsrfInput } from "@/components/CsrfInput";
import { DashboardShell } from "@/components/DashboardShell";
import { BusinessLogoAvatar } from "@/components/BusinessLogoAvatar";
import { BrandAssetsCenter } from "@/components/BrandAssetsCenter";
import { ButtonLink, EmptyState, MetricCard, PageIntro, SectionCard, StatusBadge } from "@/components/ui";
import { saveAbusePolicyAction, saveCooldownRuleAction, saveCustomerTierSettingsAction, saveScannerSettingsAction } from "@/app/dashboard/actions";
import { saveSupportAccessPolicyAction } from "@/app/platform/businesses/support-actions";
import { getBusinessOwnerContext, getCurrentPlan, getCurrentSubscription } from "@/lib/business-owner";
import { normalizeTierConfig, tierMaintenanceModeLabels, tierQualificationWindowLabels } from "@/lib/customer-tiers";
import { formatDate } from "@/lib/format";
import { messageChannelLabels } from "@/lib/messages";
import { getTwoFactorRequirement } from "@/lib/platform-settings";
import { prisma } from "@/lib/prisma";
import { countUnusedBackupCodes } from "@/lib/two-factor";
import { isTwoFactorRequiredForRole } from "@/lib/two-factor-policy";
import { businessTypeLabels } from "@/lib/roles";
import { getSubscriptionRemainingDays, getTrialRemainingDays, subscriptionDisplayDate, subscriptionStatusLabels } from "@/lib/subscriptions";
import { Bell, Building2, CreditCard, LockKeyhole, Palette, Plug, Settings2, ShieldAlert, SlidersHorizontal, UserRound } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

export default async function BusinessSettingsPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string; tab?: string }> }) {
  const context = await getBusinessOwnerContext();
  const { business } = context;
  // The session-derived AuthUser never carries these fields (support-session admins
  // and regular business owners alike); this metric card has always rendered its
  // "not recorded" fallback in production. Widened here only to type the existing access honestly.
  const user = context.user as typeof context.user & { lastLoginAt?: Date | null; passwordChangedAt?: Date | null };
  const params = await searchParams;
  const plan = getCurrentPlan(business);
  const subscription = getCurrentSubscription(business);
  const expiryDate = subscriptionDisplayDate(subscription);
  const remainingDays = getSubscriptionRemainingDays(subscription);
  const trialDays = getTrialRemainingDays(subscription);
  const communicationSettings = business.communicationSettings;
  const scannerSoundEffectsEnabled = business.scannerSettings?.soundEffectsEnabled ?? true;
  const tierConfig = normalizeTierConfig(business.tierSetting);
  const cooldownRule = await prisma.cooldownRule.findFirst({ where: { businessId: user.businessId, active: true }, orderBy: { updatedAt: "desc" } });
  const abusePolicies = await prisma.abusePolicy.findMany({ where: { businessId: user.businessId }, orderBy: { ruleType: "asc" } });
  const [twoFactorRecord, twoFactorRequirement, unusedBackupCodes] = await Promise.all([
    prisma.user.findUnique({ where: { id: user.id }, select: { twoFactorEnabled: true } }),
    getTwoFactorRequirement(),
    countUnusedBackupCodes(user.id),
  ]);
  const twoFactorEnabled = twoFactorRecord?.twoFactorEnabled ?? false;
  const twoFactorRequired = isTwoFactorRequiredForRole(user.role, twoFactorRequirement);
  const activeCategory = resolveSettingsCategory(params.tab);
  const settingsCategories = [
    { key: "general", label: "General", icon: UserRound },
    { key: "brand", label: "Brand Assets", icon: Palette },
    { key: "security", label: "Security & access", icon: ShieldAlert },
    { key: "messaging", label: "Messaging", icon: Bell },
    { key: "loyalty", label: "Loyalty rules", icon: SlidersHorizontal },
    { key: "billing", label: "Billing", icon: CreditCard },
  ] as const;

  return (
    <DashboardShell user={user} eyebrow="Business Owner" title="Business Settings" hideWelcomeMessage>
      <div className="max-w-full min-w-0 space-y-5 overflow-x-hidden pb-28 md:pb-0">
        <Message error={params.error} success={params.success} />
        <PageIntro eyebrow="Business Owner" description="Manage your business configuration, preferences and security." />

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Settings overview">
          <MetricCard label="Business" value={business.name} helper={businessTypeLabels[business.businessType]} icon={<Building2 className="h-5 w-5" />} tone="business" />
          <MetricCard label="Security" value={user.lastLoginAt ? "Recent login" : "No login recorded"} helper={user.passwordChangedAt ? `Password changed ${formatDate(user.passwordChangedAt)}` : "Password status available"} icon={<LockKeyhole className="h-5 w-5" />} tone="neutral" />
          <MetricCard label="Notifications" value={communicationSettings?.preferredDefaultChannel ? messageChannelLabels[communicationSettings.preferredDefaultChannel] : "Manual only"} helper="Customer messages are prepared manually" icon={<Bell className="h-5 w-5" />} tone="info" />
          <MetricCard label="Platform Config" value={plan?.name ?? "Unassigned"} helper={`${business._count.branches} branches, ${business._count.loyaltyPrograms} programs`} icon={<Settings2 className="h-5 w-5" />} tone="neutral" />
        </section>

        <nav className="flex max-w-full min-w-0 gap-1 overflow-x-auto border-b border-[#E5E7EB] [scrollbar-gutter:stable]" aria-label="Settings categories">
          {settingsCategories.map(({ key, label, icon: Icon }) => (
            <Link
              key={key}
              href={`/dashboard/settings?tab=${key}`}
              aria-current={activeCategory === key ? "page" : undefined}
              className={`inline-flex min-h-11 items-center gap-2 whitespace-nowrap border-b-2 px-3 text-sm font-semibold transition ${activeCategory === key ? "business-border business-text" : "border-transparent text-[#64748B] hover:text-[#1E293B]"}`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </Link>
          ))}
        </nav>

        {activeCategory === "general" ? (
          <div className="grid gap-5">
            <BusinessProfileSection business={business} user={user} />
            <BrandingSection branding={business.branding} businessName={business.name} />
            <PreferencesSection business={business} communicationSettings={communicationSettings} />
          </div>
        ) : null}
        {activeCategory === "brand" ? (
          <BrandAssetsCenter
            csrfInput={<CsrfInput scope="dashboard:brand-assets" />}
            businessName={business.name}
            initialAssets={{
              logoUrl: business.branding?.logoUrl ?? "",
              primaryColor: business.branding?.primaryColor ?? "#F97316",
              secondaryColor: business.branding?.secondaryColor ?? "#FDBA74",
              backgroundColor: business.branding?.backgroundColor ?? "#FFFFFF",
              textColor: business.branding?.textColor ?? "#111827",
              buttonColor: business.branding?.buttonColor ?? "#F97316",
            }}
          />
        ) : null}
        {activeCategory === "security" ? (
          <div className="grid gap-5">
            <SecuritySection user={user} twoFactorEnabled={twoFactorEnabled} twoFactorRequired={twoFactorRequired} unusedBackupCodes={unusedBackupCodes} />
            <SupportAccessPolicySection policy={business.supportAccessPolicy} />
            <AdvancedSection />
          </div>
        ) : null}
        {activeCategory === "messaging" ? (
          <div className="grid gap-5">
            <NotificationsSection communicationSettings={communicationSettings} />
            <CommunicationsSection communicationSettings={communicationSettings} />
            <IntegrationsSection communicationSettings={communicationSettings} />
          </div>
        ) : null}
        {activeCategory === "loyalty" ? (
          <div className="grid gap-5">
            <CustomerTiersSection tierConfig={tierConfig} />
            <ScannerSection scannerSoundEffectsEnabled={scannerSoundEffectsEnabled} />
            <AlertPoliciesSection abusePolicies={abusePolicies} />
            <CooldownSection cooldownRule={cooldownRule} />
          </div>
        ) : null}
        {activeCategory === "billing" ? (
          <div className="grid gap-5">
            <SubscriptionSection plan={plan} subscription={subscription} expiryDate={expiryDate} remainingDays={remainingDays} trialDays={trialDays} business={business} />
          </div>
        ) : null}
      </div>
    </DashboardShell>
  );
}

function BusinessProfileSection({ business, user }: { business: Awaited<ReturnType<typeof getBusinessOwnerContext>>["business"]; user: Awaited<ReturnType<typeof getBusinessOwnerContext>>["user"] }) {
  const primaryBranch = business.branches[0];
  return <SectionCard title="Business Profile" description="Core identity and public-facing business information."><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3"><Item label="Business Name" value={business.name} /><Item label="Business Type" value={businessTypeLabels[business.businessType]} /><Item label="Owner Name" value={user.name} /><Item label="Owner Email" value={user.email} /><Item label="Phone" value="Not configured" /><Item label="Address" value={primaryBranch ? `${primaryBranch.address}, ${primaryBranch.city}, ${primaryBranch.country}` : "No branch address configured"} /><Item label="Timezone" value="Business default" /><Item label="Language" value="English" /><Item label="Logo" value={business.branding?.logoUrl ? "Configured" : "Not configured"} /></div></SectionCard>;
}
function SecuritySection({ user, twoFactorEnabled, twoFactorRequired, unusedBackupCodes }: { user: Awaited<ReturnType<typeof getBusinessOwnerContext>>["user"] & { passwordChangedAt?: Date | null }; twoFactorEnabled: boolean; twoFactorRequired: boolean; unusedBackupCodes: number }) { return <SectionCard title="Security" description="Account access and session-related information for the Business Owner."><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><Item label="Password" value="Managed through secure account flow" /><Item label="Two-factor status" value={twoFactorEnabled ? `Enabled (${unusedBackupCodes} backup codes left)` : twoFactorRequired ? "Required - setup pending" : "Not enabled"} /><Item label="Recent password change" value={user.passwordChangedAt ? formatDate(user.passwordChangedAt) : "Not recorded"} /><Item label="Active sessions" value="Current session managed automatically" /></div><div className="mt-4 flex flex-wrap gap-2"><ButtonLink href="/change-password" variant="outline">Reset Password</ButtonLink><ButtonLink href="/account/two-factor/setup" variant="outline">{twoFactorEnabled ? "Manage Two-Factor Authentication" : "Set Up Two-Factor Authentication"}</ButtonLink></div></SectionCard>; }
function NotificationsSection({ communicationSettings }: { communicationSettings: Awaited<ReturnType<typeof getBusinessOwnerContext>>["business"]["communicationSettings"] }) { return <SectionCard title="Notifications" description="Customer and team notification preferences currently available for this business."><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5"><Item label="Email notifications" value={communicationSettings?.emailEnabled ? "Enabled" : "Disabled"} /><Item label="Referral notifications" value="Prepared manually" /><Item label="Reward notifications" value="Prepared manually" /><Item label="Staff notifications" value="Workspace alerts" /><Item label="Billing notifications" value="Platform managed" /></div></SectionCard>; }
function BrandingSection({ branding, businessName }: { branding: Awaited<ReturnType<typeof getBusinessOwnerContext>>["business"]["branding"]; businessName: string }) { return <SectionCard title="Branding" description="Your business identity is managed in the Brand Assets center and applied to every customer-facing surface."><div className="flex flex-wrap items-center gap-4"><BusinessLogoAvatar logoUrl={branding?.logoUrl ?? null} businessName={businessName} fallback={businessName.slice(0, 2).toUpperCase()} size="md" className="rounded-md text-white" style={{ background: branding?.primaryColor ?? "#F97316" }} /><div className="flex gap-2">{[branding?.primaryColor ?? "#F97316", branding?.secondaryColor ?? "#FDBA74", branding?.buttonColor ?? "#F97316"].map((color, index) => <span key={index} className="h-6 w-6 rounded-full ring-1 ring-black/10" style={{ backgroundColor: color }} />)}</div><ButtonLink href="/dashboard/settings?tab=brand" variant="outline">Open Brand Assets</ButtonLink></div></SectionCard>; }
function PreferencesSection({ business, communicationSettings }: { business: Awaited<ReturnType<typeof getBusinessOwnerContext>>["business"]; communicationSettings: Awaited<ReturnType<typeof getBusinessOwnerContext>>["business"]["communicationSettings"] }) { return <SectionCard title="Preferences" description="Display and workspace defaults currently available for this business."><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><Item label="Language" value="English" /><Item label="Date format" value="System default" /><Item label="Timezone" value="Business default" /><Item label="Display preferences" value="Standard dashboard layout" /><Item label="Default channel" value={messageChannelLabels[communicationSettings?.preferredDefaultChannel ?? "NONE"]} /><Item label="Business type" value={businessTypeLabels[business.businessType]} /></div></SectionCard>; }
function IntegrationsSection({ communicationSettings }: { communicationSettings: Awaited<ReturnType<typeof getBusinessOwnerContext>>["business"]["communicationSettings"] }) { return <SectionCard title="Integrations" description="Connected services visible to this business."><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><IntegrationCard title="WhatsApp" status={communicationSettings?.whatsappEnabled ? "Enabled" : "Not connected"} /><IntegrationCard title="SMS" status={communicationSettings?.smsEnabled ? "Enabled" : "Not connected"} /><IntegrationCard title="Email" status={communicationSettings?.emailEnabled ? "Enabled" : "Not connected"} /><IntegrationCard title="Apple Wallet" status="Not available in this pilot" /></div></SectionCard>; }
function AdvancedSection() { return <SectionCard title="Advanced" description="Platform configuration without exposing unsafe controls."><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><IntegrationCard title="API Keys" status="Not enabled" /><IntegrationCard title="Webhooks" status="Not enabled" /><IntegrationCard title="Custom Domains" status="Not enabled" /><IntegrationCard title="White Label" status="Not enabled" /></div><div className="mt-5 rounded-md border border-red-200 bg-red-50 p-4"><h3 className="font-semibold text-red-800">Danger Zone</h3><p className="mt-1 text-sm text-red-700">Deactivate Business and Delete Business are not available from this workspace. Contact Loyalty Card UAE support for account lifecycle changes.</p></div></SectionCard>; }


function SupportAccessPolicySection({ policy }: { policy: string }) {
  return <SectionCard title="Support Access Policy" description="Choose how Loyalty Card UAE Support can access your workspace when assistance is needed."><form action={saveSupportAccessPolicyAction} className="grid gap-4"><CsrfInput scope="platform:support-sessions" /><input type="hidden" name="redirectTo" value="/dashboard/settings?tab=support" /><div className="grid gap-3 lg:grid-cols-3"><PolicyOption value="IMMEDIATE" title="Immediate Support" description="Support sessions begin immediately after a Platform Administrator enters a reason and duration." current={policy} /><PolicyOption value="APPROVAL_REQUIRED" title="Approval Required" description="Support must submit a request. A Business Owner must approve before access starts." current={policy} /><PolicyOption value="EMERGENCY_ACCESS" title="Emergency Access" description="Normal requests need approval, but emergency requests can begin immediately and notify you." current={policy} /></div><button type="submit" className="h-11 w-fit rounded-md business-button px-4 text-sm font-semibold text-white">Save support access policy</button></form></SectionCard>;
}
function PolicyOption({ value, title, description, current }: { value: string; title: string; description: string; current: string }) { return <label className={`grid cursor-pointer gap-2 rounded-md border p-4 transition ${current === value ? "business-border-soft business-bg-soft" : "border-[#E2E8F0] bg-white hover:bg-[#F8FAFC]"}`}><span className="flex items-center gap-2 text-sm font-semibold text-[#0F172A]"><input type="radio" name="supportAccessPolicy" value={value} defaultChecked={current === value} className="h-4 w-4" />{title}</span><span className="text-sm leading-6 text-[#64748B]">{description}</span></label>; }

function CustomerTiersSection({ tierConfig }: { tierConfig: ReturnType<typeof normalizeTierConfig> }) { return <SectionCard title="Customer tiers" description="Configure visit-based Bronze, Silver, Gold, and VIP grades. Tiers are available on every plan." actions={<StatusBadge tone="success">Enabled</StatusBadge>}><form action={saveCustomerTierSettingsAction} className="grid min-w-0 gap-4"><CsrfInput scope="dashboard:customer-tiers" /><div className="grid gap-4 md:grid-cols-3"><label className="space-y-2"><span className="text-sm font-medium text-[#111827]">Tier calculation method</span><select name="criteria" defaultValue="VISITS_ONLY" disabled className="h-11 w-full rounded-md border border-[#E5E7EB] bg-[#FAFAFA] px-3 text-sm text-[#6B7280]"><option value="VISITS_ONLY">Visits only</option></select></label><SelectInput name="tierQualificationWindow" label="Qualification window" defaultValue={tierConfig.tierQualificationWindow} options={Object.entries(tierQualificationWindowLabels)} /><SelectInput name="tierMaintenanceMode" label="Maintenance mode" defaultValue={tierConfig.tierMaintenanceMode} options={Object.entries(tierMaintenanceModeLabels)} /></div><div className="grid gap-4 md:grid-cols-3"><Input name="silverVisitRequirement" label="Silver visit requirement" type="number" min="1" defaultValue={tierConfig.silverVisitRequirement.toString()} /><Input name="goldVisitRequirement" label="Gold visit requirement" type="number" min="1" defaultValue={tierConfig.goldVisitRequirement.toString()} /><Input name="vipVisitRequirement" label="VIP visit requirement" type="number" min="1" defaultValue={tierConfig.vipVisitRequirement.toString()} /></div><div className="grid gap-3 rounded-md business-bg-soft px-3 py-3 text-sm business-primary-strong md:grid-cols-3"><p>Silver: {tierConfig.silverVisitRequirement} visits</p><p>Gold: {tierConfig.goldVisitRequirement} visits</p><p>VIP: {tierConfig.vipVisitRequirement} visits</p></div><button type="submit" className="h-11 w-fit rounded-md business-button px-4 text-sm font-semibold text-white">Save tier settings</button></form></SectionCard>; }
function ScannerSection({ scannerSoundEffectsEnabled }: { scannerSoundEffectsEnabled: boolean }) { return <SectionCard title="Scanner Settings" description="Control audio feedback for scanner outcomes. Visual success and error messages always remain visible." actions={<StatusBadge tone={scannerSoundEffectsEnabled ? "success" : "neutral"}>{scannerSoundEffectsEnabled ? "Sound ON" : "Sound OFF"}</StatusBadge>}><form action={saveScannerSettingsAction} className="grid gap-4"><CsrfInput scope="dashboard:scanner-settings" /><label className="flex items-center justify-between gap-4 rounded-md border border-[#E5E7EB] bg-[#FAFAFA] p-4"><span><span className="block text-sm font-semibold text-[#111827]">Scanner Sound Effects</span><span className="mt-1 block text-sm text-[#6B7280]">Play a short beep, buzz, or chime after scanner actions.</span></span><input type="checkbox" name="soundEffectsEnabled" defaultChecked={scannerSoundEffectsEnabled} className="h-5 w-5 rounded border-[#E5E7EB] business-primary" aria-label="Scanner Sound Effects" /></label><p className="rounded-md business-border-soft business-bg-soft px-3 py-2 text-sm business-primary-strong">Sounds play only after scanner interaction or scan form submission so mobile browsers can allow audio.</p><button type="submit" className="h-11 w-fit rounded-md business-button px-4 text-sm font-semibold text-white">Save scanner settings</button></form></SectionCard>; }
function AlertPoliciesSection({ abusePolicies }: { abusePolicies: Array<{ id: number; policyName: string; ruleType: string; thresholdValue: number; severity: string; enabled: boolean }> }) { return <SectionCard title="Alert policies" description="Tune abuse-monitoring thresholds and severity for this business."><div className="grid gap-3">{abusePolicies.map((policy) => <form key={policy.id} action={saveAbusePolicyAction} className="grid gap-3 rounded-md border border-[#E5E7EB] p-4 lg:grid-cols-[1fr_140px_150px_120px_auto] lg:items-end"><CsrfInput scope="dashboard:abuse-policies" /><input type="hidden" name="policyId" value={policy.id} /><div><p className="text-sm font-semibold text-[#111827]">{policy.policyName}</p><p className="mt-1 text-xs text-[#6B7280]">{policy.ruleType.replaceAll("_", " ").toLowerCase()}</p></div><Input name="thresholdValue" label="Threshold" type="number" min="0" defaultValue={policy.thresholdValue.toString()} /><SelectInput name="severity" label="Severity" defaultValue={policy.severity} options={["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((s) => [s, s])} /><label className="flex min-h-11 items-center gap-2 rounded-md border border-[#E5E7EB] px-3 text-sm font-medium text-[#111827]"><input type="checkbox" name="enabled" defaultChecked={policy.enabled} className="h-4 w-4 rounded border-[#E5E7EB]" />Enabled</label><button type="submit" className="h-11 rounded-md border business-border px-4 text-sm font-semibold business-primary">Save</button></form>)}{abusePolicies.length === 0 ? <EmptyState title="No alert policies configured" description="Default alert policies will be created by the platform migration." /> : null}</div></SectionCard>; }
function CooldownSection({ cooldownRule }: { cooldownRule: { minimumMinutesBetweenStamps: number; maximumStampsPerTransaction: number; maximumStampsPerCustomerPerDay: number | null; maximumStampsPerStaffPerDay: number | null; generateAlert: boolean } | null }) { return <SectionCard title="Cooldown policy" description="Control abuse-monitoring limits for stamp issuance. Overrides are available only to Business Owners and Branch Managers."><form action={saveCooldownRuleAction} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"><CsrfInput scope="dashboard:cooldowns" /><Input name="minimumMinutesBetweenStamps" label="Minimum minutes between stamps" type="number" min="0" defaultValue={(cooldownRule?.minimumMinutesBetweenStamps ?? 0).toString()} /><Input name="maximumStampsPerTransaction" label="Maximum stamps per transaction" type="number" min="1" max="5" defaultValue={(cooldownRule?.maximumStampsPerTransaction ?? 5).toString()} /><Input name="maximumStampsPerCustomerPerDay" label="Maximum stamps per customer per day" type="number" min="1" defaultValue={cooldownRule?.maximumStampsPerCustomerPerDay?.toString() ?? ""} /><Input name="maximumStampsPerStaffPerDay" label="Maximum stamps per staff per day" type="number" min="1" defaultValue={cooldownRule?.maximumStampsPerStaffPerDay?.toString() ?? ""} /><label className="flex min-h-11 items-center gap-2 rounded-md border border-[#E5E7EB] px-3 text-sm font-medium text-[#111827]"><input type="checkbox" name="generateAlert" defaultChecked={cooldownRule?.generateAlert ?? true} className="h-4 w-4 rounded border-[#E5E7EB]" />Generate alerts for violations</label><div className="flex items-end"><ConfirmSubmitButton message="Save cooldown policy? This affects future stamp issuance limits." className="h-11 rounded-md business-button px-4 text-sm font-semibold text-white">Save cooldown policy</ConfirmSubmitButton></div></form></SectionCard>; }
function SubscriptionSection({ plan, subscription, expiryDate, remainingDays, trialDays, business }: { plan: ReturnType<typeof getCurrentPlan>; subscription: ReturnType<typeof getCurrentSubscription>; expiryDate: Date | null; remainingDays: number | null; trialDays: number | null; business: Awaited<ReturnType<typeof getBusinessOwnerContext>>["business"] }) { return <SectionCard title="Subscription" description="Plan and lifecycle details are managed by the System Administrator." actions={subscription ? <StatusBadge tone={subscription.status === "ACTIVE" ? "success" : subscription.status === "TRIAL" ? "warning" : "danger"}>{subscriptionStatusLabels[subscription.status]}</StatusBadge> : null}><div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4"><Item label="Current plan" value={plan?.name ?? "Unassigned"} /><Item label="Renewal date" value={subscription?.renewalDate ? formatDate(subscription.renewalDate) : "Not set"} /><Item label="Expiry date" value={expiryDate ? formatDate(expiryDate) : "Not set"} /><Item label="Remaining days" value={remainingDays === null ? "Not set" : remainingDays.toString()} /><Item label="Trial remaining days" value={trialDays === null ? "Not in trial" : trialDays.toString()} /><Item label="Branch usage" value={`${business._count.branches} / ${plan?.maxBranches ?? 1}`} /><Item label="Program usage" value={`${business._count.loyaltyPrograms} / ${plan?.maxLoyaltyPrograms ?? 1}`} /></div></SectionCard>; }
function CommunicationsSection({ communicationSettings }: { communicationSettings: Awaited<ReturnType<typeof getBusinessOwnerContext>>["business"]["communicationSettings"] }) { return <SectionCard title="Communication Channels" description="Provider-level channel settings are managed by the System Administrator. Messages are prepared manually only."><div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3"><Item label="WhatsApp enabled" value={communicationSettings?.whatsappEnabled ? "Yes" : "No"} /><Item label="SMS enabled" value={communicationSettings?.smsEnabled ? "Yes" : "No"} /><Item label="Email enabled" value={communicationSettings?.emailEnabled ? "Yes" : "No"} /><Item label="Default channel" value={messageChannelLabels[communicationSettings?.preferredDefaultChannel ?? "NONE"]} /><Item label="WhatsApp business number" value={communicationSettings?.whatsappBusinessNumber ?? "Not set"} /><Item label="Sender email" value={communicationSettings?.senderEmail ?? "Not set"} /><Item label="Sender name" value={communicationSettings?.senderName ?? "Not set"} /></div></SectionCard>; }

function resolveSettingsCategory(tab?: string) {
  const categories = ["general", "brand", "security", "messaging", "loyalty", "billing"];
  if (tab && categories.includes(tab)) return tab;
  const sectionToCategory: Record<string, string> = {
    overview: "general", profile: "general", branding: "brand", preferences: "general",
    security: "security", support: "security", advanced: "security",
    notifications: "messaging", communications: "messaging", integrations: "messaging",
    tiers: "loyalty", scanner: "loyalty", alerts: "loyalty", cooldowns: "loyalty",
    subscription: "billing",
  };
  return (tab ? sectionToCategory[tab] : undefined) ?? "general";
}
function SelectInput({ label, name, defaultValue, options }: { label: string; name: string; defaultValue: string; options: Array<[string, string]> }) { return <label className="min-w-0 space-y-2"><span className="text-sm font-medium text-[#111827]">{label}</span><select name={name} defaultValue={defaultValue} className="h-11 w-full rounded-md border border-[#E5E7EB] px-3 text-sm outline-none business-ring business-border">{options.map(([value, labelText]) => <option key={value} value={value}>{labelText}</option>)}</select></label>; }
function Input({ label, name, type = "text", defaultValue, min, max }: { label: string; name: string; type?: string; defaultValue?: string; min?: string; max?: string }) { return <label className="min-w-0 space-y-2"><span className="text-sm font-medium text-[#111827]">{label}</span><input name={name} type={type} min={min} max={max} defaultValue={defaultValue} className="h-11 w-full rounded-md border border-[#E5E7EB] px-3 text-sm outline-none business-ring business-border" /></label>; }
function Item({ label, value }: { label: string; value: ReactNode }) { return <div className="min-w-0 overflow-hidden rounded-md border border-[#E2E8F0] bg-white p-4"><p className="break-words text-xs font-semibold uppercase tracking-wide text-[#64748B]">{label}</p><div className="mt-2 break-words text-sm font-semibold text-[#0F172A]">{value}</div></div>; }
function IntegrationCard({ title, status }: { title: string; status: string }) { return <div className="rounded-md border border-[#E2E8F0] bg-white p-4"><div className="flex items-center justify-between gap-3"><p className="font-semibold text-[#0F172A]">{title}</p><Plug className="h-4 w-4 text-[#64748B]" aria-hidden /></div><p className="mt-2 text-sm text-[#64748B]">{status}</p></div>; }
function Message({ error, success }: { error?: string; success?: string }) { if (!error && !success) return null; return <p className={`rounded-md border px-3 py-2 text-sm ${error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{error ?? success}</p>; }

