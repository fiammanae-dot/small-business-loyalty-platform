import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { CsrfInput } from "@/components/CsrfInput";
import { DashboardShell } from "@/components/DashboardShell";
import { BrandAssetsCenter } from "@/components/BrandAssetsCenter";
import { ButtonLink, EmptyState, MetricCard, PageIntro, SectionCard, StatusBadge } from "@/components/ui";
import { saveAbusePolicyAction, saveCooldownRuleAction, saveCustomerTierSettingsAction, saveScannerSettingsAction, updateBusinessProfileAction } from "@/app/dashboard/actions";
import { RequiredMark } from "@/components/ui/RequiredMark";
import { saveSupportAccessPolicyAction } from "@/app/platform/businesses/support-actions";
import { sendWhatsAppTestMessageAction } from "@/app/dashboard/settings/whatsapp-actions";
import { getBusinessOwnerContext, getCurrentPlan } from "@/lib/business-owner";
import { BillingCenter } from "@/components/billing/BillingCenter";
import { normalizeTierConfig, tierMaintenanceModeLabels, tierQualificationWindowLabels } from "@/lib/customer-tiers";
import { formatDate } from "@/lib/format";
import { formatAed } from "@/lib/cashback";
import { getTwoFactorRequirement } from "@/lib/platform-settings";
import { ALERT_RULES } from "@/lib/alert-engine";
import { prisma } from "@/lib/prisma";
import { countUnusedBackupCodes } from "@/lib/two-factor";
import { isTwoFactorRequiredForRole } from "@/lib/two-factor-policy";
import { businessTypeLabels } from "@/lib/roles";
import { programsUsedTowardLimit } from "@/lib/subscriptions";
import { Bell, Building2, CreditCard, LockKeyhole, MessageCircle, Palette, Settings2, ShieldAlert, Sparkles, SlidersHorizontal, UserRound } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

export default async function BusinessSettingsPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string; tab?: string }> }) {
  const context = await getBusinessOwnerContext();
  const { business } = context;
  const user = context.user;
  const params = await searchParams;
  const plan = getCurrentPlan(business);
  const scannerSoundEffectsEnabled = business.scannerSettings?.soundEffectsEnabled ?? true;
  const cashback = business.cashbackSettings;
  const cashbackEnabled = cashback?.enabled ?? false;
  // Plan usage, counted the same way as Billing (cashback takes a program slot).
  const programsUsed = programsUsedTowardLimit(business._count.loyaltyPrograms, cashbackEnabled);
  const branchesUsed = business._count.branches;
  const packageCount = await prisma.loyaltyProgram.count({ where: { businessId: user.businessId, isMembership: true } });
  const tierConfig = normalizeTierConfig(business.tierSetting);
  const cooldownRule = await prisma.cooldownRule.findFirst({ where: { businessId: user.businessId, active: true }, orderBy: { updatedAt: "desc" } });
  const abusePolicies = await prisma.abusePolicy.findMany({ where: { businessId: user.businessId }, orderBy: { ruleType: "asc" } });
  // Read-mostly for owners: credentials are inserted admin-side in Phase 1, so the
  // panel never selects the encrypted token, only what the owner needs to see.
  const whatsAppChannel = await prisma.businessWhatsAppChannel.findUnique({
    where: { businessId: user.businessId },
    select: {
      connectionStatus: true,
      welcomeTemplateName: true,
      welcomeTemplateStatus: true,
      lastErrorMessage: true,
      lastCheckedAt: true,
    },
  });
  const [twoFactorRecord, twoFactorRequirement, unusedBackupCodes] = await Promise.all([
    prisma.user.findUnique({ where: { id: user.id }, select: { twoFactorEnabled: true } }),
    getTwoFactorRequirement(),
    countUnusedBackupCodes(user.id),
  ]);
  const twoFactorEnabled = twoFactorRecord?.twoFactorEnabled ?? false;
  const twoFactorRequired = isTwoFactorRequiredForRole(user.role, twoFactorRequirement);
  const whatsAppConnected = whatsAppChannel?.connectionStatus === "CONNECTED";
  // What is actually switched on for this platform (booleans only, never the keys).
  const services = {
    systemEmails: Boolean(process.env.RESEND_API_KEY && process.env.PASSWORD_RESET_FROM_EMAIL),
    googleWallet: Boolean(process.env.GOOGLE_WALLET_ISSUER_ID && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL),
    appleWallet: Boolean(process.env.WALLETWALLET_API_KEY),
  };
  const activeCategory = resolveSettingsCategory(params.tab);
  const settingsCategories = [
    { key: "general", label: "General", icon: UserRound },
    { key: "brand", label: "Brand Assets", icon: Palette },
    { key: "security", label: "Security & access", icon: ShieldAlert },
    { key: "messaging", label: "Messaging", icon: Bell },
    { key: "loyalty", label: "Loyalty rules", icon: SlidersHorizontal },
    { key: "features", label: "Features", icon: Sparkles },
    { key: "billing", label: "Billing", icon: CreditCard },
  ] as const;

  return (
    <DashboardShell user={user} eyebrow="Business Owner" title="Business Settings" hideWelcomeMessage>
      <div className="max-w-full min-w-0 space-y-5 overflow-x-hidden pb-28 md:pb-0">
        <Message error={params.error} success={params.success} />
        <PageIntro eyebrow="Business Owner" description="Manage your business configuration, preferences and security." />

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Settings overview">
          <MetricCard label="Business" value={business.name} helper={businessTypeLabels[business.businessType]} icon={<Building2 className="h-5 w-5" />} tone="business" />
          <MetricCard
            label="Plan"
            value={plan?.name ?? "Unassigned"}
            helper={`Programs ${programsUsed} / ${plan?.maxLoyaltyPrograms ?? 1} \u00b7 Branches ${branchesUsed} / ${plan?.maxBranches ?? 1}`}
            icon={<Settings2 className="h-5 w-5" />}
            tone="neutral"
          />
          <MetricCard label="Two-factor login" value={twoFactorEnabled ? "On" : "Off"} helper={twoFactorEnabled ? "Your owner login is protected" : "Recommended for owner accounts"} icon={<LockKeyhole className="h-5 w-5" />} tone="neutral" />
          <MetricCard label="WhatsApp welcome" value={whatsAppConnected ? "Connected" : "Not connected"} helper="New customers get their card on WhatsApp" icon={<MessageCircle className="h-5 w-5" />} tone="info" />
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
            <SecuritySection twoFactorEnabled={twoFactorEnabled} twoFactorRequired={twoFactorRequired} unusedBackupCodes={unusedBackupCodes} />
            <SupportAccessPolicySection policy={business.supportAccessPolicy} />
            <AccountClosureNote />
          </div>
        ) : null}
        {activeCategory === "messaging" ? (
          <div className="grid gap-5">
            <WhatsAppAutomationSection channel={whatsAppChannel} />
            <ChannelsSection whatsAppConnected={whatsAppConnected} services={services} />
          </div>
        ) : null}
        {activeCategory === "loyalty" ? (
          <div className="grid gap-5">
            <CustomerTiersSection tierConfig={tierConfig} />
            <ScannerSection scannerSoundEffectsEnabled={scannerSoundEffectsEnabled} />
            <CooldownSection cooldownRule={cooldownRule} />
            <AlertPoliciesSection abusePolicies={abusePolicies} />
          </div>
        ) : null}
        {activeCategory === "features" ? (
          <div className="grid gap-5">
            <PackagesSection packageCount={packageCount} />
            <CashbackSection cashback={cashback} />
          </div>
        ) : null}
        {activeCategory === "billing" ? (
          <div className="grid gap-5">
            <BillingCenter />
          </div>
        ) : null}
      </div>
    </DashboardShell>
  );
}

function BusinessProfileSection({ business, user }: { business: Awaited<ReturnType<typeof getBusinessOwnerContext>>["business"]; user: Awaited<ReturnType<typeof getBusinessOwnerContext>>["user"] }) {
  const primaryBranch = business.branches[0];
  return (
    <SectionCard title="Business Profile" description="Your business name as customers see it on cards, passes and messages.">
      <form action={updateBusinessProfileAction} className="grid gap-4">
        <CsrfInput scope="dashboard:business-profile" />
        <div className="grid gap-4 md:grid-cols-2">
          <label className="min-w-0 space-y-2">
            <span className="text-sm font-medium text-[#111827]">Business Name<RequiredMark /></span>
            <input name="name" defaultValue={business.name} required className="h-11 w-full rounded-md border border-[#E5E7EB] px-3 text-sm outline-none business-ring business-border" />
          </label>
          <label className="min-w-0 space-y-2">
            <span className="text-sm font-medium text-[#111827]">Business Type</span>
            {/* Set by the platform when the business is created; owners cannot change it. */}
            <div className="flex h-11 w-full items-center rounded-md border border-[#E5E7EB] bg-[#F9FAFB] px-3 text-sm text-[#374151]" aria-readonly="true">
              {businessTypeLabels[business.businessType]}
            </div>
            <span className="block text-xs text-[#6B7280]">To change your business type, contact Loyalty Card UAE support.</span>
          </label>
        </div>
        <button type="submit" className="h-11 w-fit rounded-md business-button px-4 text-sm font-semibold text-white">Save business profile</button>
      </form>
      <div className="mt-5 grid gap-3 border-t border-[#EEF1F4] pt-5 md:grid-cols-3">
        <Item label="Owner" value={user.name} />
        <Item label="Owner email" value={user.email} />
        <Item
          label="Main branch address"
          value={
            primaryBranch ? (
              <span>
                {`${primaryBranch.address}, ${primaryBranch.city}, ${primaryBranch.country}`}{" "}
                <Link href="/dashboard/branches" className="business-text underline-offset-2 hover:underline">Edit in Branches</Link>
              </span>
            ) : (
              <Link href="/dashboard/branches" className="business-text underline-offset-2 hover:underline">Add a branch</Link>
            )
          }
        />
      </div>
    </SectionCard>
  );
}
function SecuritySection({ twoFactorEnabled, twoFactorRequired, unusedBackupCodes }: { twoFactorEnabled: boolean; twoFactorRequired: boolean; unusedBackupCodes: number }) {
  return (
    <SectionCard title="Login security" description="Protect the owner login. Two-factor asks for a code from your phone when you sign in.">
      <div className="grid gap-3 md:grid-cols-2">
        <Item
          label="Two-factor login"
          value={twoFactorEnabled ? `On \u00b7 ${unusedBackupCodes} backup code${unusedBackupCodes === 1 ? "" : "s"} left` : twoFactorRequired ? "Required \u2014 set it up now" : "Off"}
        />
        <Item label="Password" value="Change it any time with the button below" />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <ButtonLink href="/change-password" variant="outline">Change password</ButtonLink>
        <ButtonLink href="/account/two-factor/setup" variant="outline">{twoFactorEnabled ? "Manage two-factor login" : "Set up two-factor login"}</ButtonLink>
      </div>
    </SectionCard>
  );
}

function AccountClosureNote() {
  return (
    <p className="rounded-md border border-[#E5E7EB] bg-white px-4 py-3 text-sm text-[#475569]">
      To pause or close your business account, contact Loyalty Card UAE support.
    </p>
  );
}
function WhatsAppAutomationSection({ channel }: { channel: { connectionStatus: string; welcomeTemplateName: string; welcomeTemplateStatus: string; lastErrorMessage: string | null; lastCheckedAt: Date | null } | null }) {
  const connected = channel?.connectionStatus === "CONNECTED";
  const templateApproved = channel?.welcomeTemplateStatus === "APPROVED";
  const canSendTest = connected && templateApproved;

  return (
    <SectionCard
      title="WhatsApp Automation"
      description="Send each new customer their loyalty card automatically, from your own WhatsApp number."
      actions={<StatusBadge tone={connected ? "success" : channel?.connectionStatus === "ERROR" ? "danger" : "neutral"}>{connected ? "Connected" : channel?.connectionStatus === "ERROR" ? "Error" : "Not connected"}</StatusBadge>}
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Item label="Connection" value={connected ? "Connected" : "Not connected"} />
        <Item label="Welcome template" value={channel?.welcomeTemplateName ?? "Not set up"} />
        <Item label="Template approval" value={!channel ? "Not set up" : templateApproved ? "Approved" : channel.welcomeTemplateStatus === "REJECTED" ? "Rejected by Meta" : "Waiting for Meta review"} />
        <Item label="Last checked" value={channel?.lastCheckedAt ? formatDate(channel.lastCheckedAt) : "Never"} />
      </div>

      {channel?.lastErrorMessage ? (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">Last error: {channel.lastErrorMessage}</p>
      ) : null}

      {canSendTest ? (
        <form action={sendWhatsAppTestMessageAction} className="mt-5 grid gap-3 md:grid-cols-[minmax(0,320px)_auto] md:items-end">
          <CsrfInput scope="dashboard:whatsapp-test" />
          <Input name="testPhone" label="Send a test to your number (e.g. 050 123 4567)" type="tel" />
          <button type="submit" className="h-11 w-fit rounded-md business-button px-4 text-sm font-semibold text-white">Send test message</button>
        </form>
      ) : (
        <p className="mt-5 rounded-md business-border-soft business-bg-soft px-3 py-2 text-sm business-primary-strong">
          {channel ? "Automated sending starts once the connection is live and Meta has approved the welcome template." : "WhatsApp automation is set up by Loyalty Card UAE support. Contact us to connect your business number."}
        </p>
      )}
    </SectionCard>
  );
}


function ChannelsSection({ whatsAppConnected, services }: { whatsAppConnected: boolean; services: { systemEmails: boolean; googleWallet: boolean; appleWallet: boolean } }) {
  const rows: Array<{ title: string; detail: string; on: boolean; offLabel?: string }> = [
    { title: "WhatsApp welcome message", detail: "Sends each new customer their card from your WhatsApp number.", on: whatsAppConnected, offLabel: "Not connected" },
    { title: "System emails", detail: "Password resets and high-risk alert emails to the owner.", on: services.systemEmails, offLabel: "Not set up" },
    { title: "Google Wallet", detail: "Customers add their card to Google Wallet.", on: services.googleWallet, offLabel: "Not available" },
    { title: "Apple Wallet", detail: "Customers add their card to Apple Wallet.", on: services.appleWallet, offLabel: "Not available" },
    { title: "SMS", detail: "Text messages to customers are not part of the platform yet.", on: false, offLabel: "Not available" },
  ];
  return (
    <SectionCard title="Channels" description="How your business reaches customers. Campaign messages on the Messages page are prepared here and sent from your own phone.">
      <div className="grid gap-2">
        {rows.map((row) => (
          <div key={row.title} className="flex items-center justify-between gap-3 rounded-md border border-[#E2E8F0] bg-white px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#0F172A]">{row.title}</p>
              <p className="mt-0.5 text-xs text-[#64748B]">{row.detail}</p>
            </div>
            <StatusBadge tone={row.on ? "success" : "neutral"}>{row.on ? "Active" : row.offLabel ?? "Off"}</StatusBadge>
          </div>
        ))}
      </div>
      {!whatsAppConnected ? <p className="mt-3 text-xs text-[#64748B]">WhatsApp is connected by Loyalty Card UAE support. Contact us to connect your business number.</p> : null}
    </SectionCard>
  );
}
function SupportAccessPolicySection({ policy }: { policy: string }) {
  return <SectionCard title="Support Access Policy" description="Choose how Loyalty Card UAE Support can access your workspace when assistance is needed."><form action={saveSupportAccessPolicyAction} className="grid gap-4"><CsrfInput scope="platform:support-sessions" /><input type="hidden" name="redirectTo" value="/dashboard/settings?tab=support" /><div className="grid gap-3 lg:grid-cols-3"><PolicyOption value="IMMEDIATE" title="Immediate Support" description="Support sessions begin immediately after a Platform Administrator enters a reason and duration." current={policy} /><PolicyOption value="APPROVAL_REQUIRED" title="Approval Required" description="Support must submit a request. A Business Owner must approve before access starts." current={policy} /><PolicyOption value="EMERGENCY_ACCESS" title="Emergency Access" description="Normal requests need approval, but emergency requests can begin immediately and notify you." current={policy} /></div><button type="submit" className="h-11 w-fit rounded-md business-button px-4 text-sm font-semibold text-white">Save support access policy</button></form></SectionCard>;
}
function PolicyOption({ value, title, description, current }: { value: string; title: string; description: string; current: string }) { return <label className={`grid cursor-pointer gap-2 rounded-md border p-4 transition ${current === value ? "business-border-soft business-bg-soft" : "border-[#E2E8F0] bg-white hover:bg-[#F8FAFC]"}`}><span className="flex items-center gap-2 text-sm font-semibold text-[#0F172A]"><input type="radio" name="supportAccessPolicy" value={value} defaultChecked={current === value} className="h-4 w-4" />{title}</span><span className="text-sm leading-6 text-[#64748B]">{description}</span></label>; }

function CustomerTiersSection({ tierConfig }: { tierConfig: ReturnType<typeof normalizeTierConfig> }) { return <SectionCard title="Customer tiers" description="Customers move up from Bronze to Silver, Gold and VIP by number of visits."><form action={saveCustomerTierSettingsAction} className="grid min-w-0 gap-4"><CsrfInput scope="dashboard:customer-tiers" /><div className="grid gap-4 md:grid-cols-2"><SelectInput name="tierQualificationWindow" label="Qualification window" defaultValue={tierConfig.tierQualificationWindow} options={Object.entries(tierQualificationWindowLabels)} /><SelectInput name="tierMaintenanceMode" label="Maintenance mode" defaultValue={tierConfig.tierMaintenanceMode} options={Object.entries(tierMaintenanceModeLabels)} /></div><div className="grid gap-4 md:grid-cols-3"><Input name="silverVisitRequirement" label="Silver visit requirement" type="number" min="1" defaultValue={tierConfig.silverVisitRequirement.toString()} /><Input name="goldVisitRequirement" label="Gold visit requirement" type="number" min="1" defaultValue={tierConfig.goldVisitRequirement.toString()} /><Input name="vipVisitRequirement" label="VIP visit requirement" type="number" min="1" defaultValue={tierConfig.vipVisitRequirement.toString()} /></div><div className="grid gap-3 rounded-md business-bg-soft px-3 py-3 text-sm business-primary-strong md:grid-cols-3"><p>Silver: {tierConfig.silverVisitRequirement} visits</p><p>Gold: {tierConfig.goldVisitRequirement} visits</p><p>VIP: {tierConfig.vipVisitRequirement} visits</p></div><button type="submit" className="h-11 w-fit rounded-md business-button px-4 text-sm font-semibold text-white">Save tier settings</button></form></SectionCard>; }
function ScannerSection({ scannerSoundEffectsEnabled }: { scannerSoundEffectsEnabled: boolean }) { return <SectionCard title="Scanner Settings" description="Control audio feedback for scanner outcomes. Visual success and error messages always remain visible." actions={<StatusBadge tone={scannerSoundEffectsEnabled ? "success" : "neutral"}>{scannerSoundEffectsEnabled ? "Sound ON" : "Sound OFF"}</StatusBadge>}><form action={saveScannerSettingsAction} className="grid gap-4"><CsrfInput scope="dashboard:scanner-settings" /><label className="flex items-center justify-between gap-4 rounded-md border border-[#E5E7EB] bg-[#FAFAFA] p-4"><span><span className="block text-sm font-semibold text-[#111827]">Scanner Sound Effects</span><span className="mt-1 block text-sm text-[#6B7280]">Play a short beep, buzz, or chime after scanner actions.</span></span><input type="checkbox" name="soundEffectsEnabled" defaultChecked={scannerSoundEffectsEnabled} className="h-5 w-5 rounded border-[#E5E7EB] business-primary" aria-label="Scanner Sound Effects" /></label><p className="rounded-md business-border-soft business-bg-soft px-3 py-2 text-sm business-primary-strong">Sounds play only after scanner interaction or scan form submission so mobile browsers can allow audio.</p><button type="submit" className="h-11 w-fit rounded-md business-button px-4 text-sm font-semibold text-white">Save scanner settings</button></form></SectionCard>; }
function AlertPoliciesSection({ abusePolicies }: { abusePolicies: Array<{ id: number; policyName: string; ruleType: string; thresholdValue: number; severity: string; enabled: boolean }> }) {
  // Listed in the platform's rule order, each with a plain explanation of what
  // its threshold means. These settings drive the alerts directly.
  const rows = ALERT_RULES.map((rule) => ({ rule, policy: abusePolicies.find((policy) => policy.ruleType === rule.ruleType) })).filter(
    (row): row is { rule: (typeof ALERT_RULES)[number]; policy: (typeof abusePolicies)[number] } => Boolean(row.policy),
  );
  return (
    <SectionCard title="Alert policies" description="These only WARN you \u2014 nothing is blocked. An alert appears in Alerts when a rule trips; high-risk alerts are also emailed to the owner. Set a threshold to 0 or untick Enabled to switch a rule off.">
      <div className="grid gap-3">
        {rows.map(({ rule, policy }) => (
          <form key={policy.id} action={saveAbusePolicyAction} className="grid gap-3 rounded-md border border-[#E5E7EB] p-4 lg:grid-cols-[1fr_140px_150px_120px_auto] lg:items-end">
            <CsrfInput scope="dashboard:abuse-policies" />
            <input type="hidden" name="policyId" value={policy.id} />
            <div>
              <p className="text-sm font-semibold text-[#111827]">{rule.policyName}</p>
              <p className="mt-1 text-xs leading-5 text-[#6B7280]">{rule.explain.replace("{n}", String(policy.thresholdValue))}</p>
            </div>
            <Input name="thresholdValue" label="Threshold" type="number" min="0" defaultValue={policy.thresholdValue.toString()} />
            <SelectInput name="severity" label="Level" defaultValue={policy.severity} options={["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((s) => [s, s])} />
            <label className="flex min-h-11 items-center gap-2 rounded-md border border-[#E5E7EB] px-3 text-sm font-medium text-[#111827]"><input type="checkbox" name="enabled" defaultChecked={policy.enabled} className="h-4 w-4 rounded border-[#E5E7EB]" />Enabled</label>
            <button type="submit" className="h-11 rounded-md border business-border px-4 text-sm font-semibold business-primary">Save</button>
          </form>
        ))}
        {rows.length === 0 ? <EmptyState title="No alert policies configured" description="Default alert policies will be created by the platform migration." /> : null}
      </div>
    </SectionCard>
  );
}
function CooldownSection({ cooldownRule }: { cooldownRule: { minimumMinutesBetweenStamps: number; maximumStampsPerTransaction: number; maximumStampsPerCustomerPerDay: number | null; maximumStampsPerStaffPerDay: number | null } | null }) {
  return (
    <SectionCard title="Stamp limits" description="These BLOCK the stamp. When a limit is reached staff cannot add the stamp; an owner or manager can override with a reason. Leave a box blank for no limit.">
      <form action={saveCooldownRuleAction} className="grid gap-4 md:grid-cols-2">
        <CsrfInput scope="dashboard:cooldowns" />
        <Input name="minimumMinutesBetweenStamps" label="Minutes between stamps for the same customer (0 = no wait)" type="number" min="0" defaultValue={(cooldownRule?.minimumMinutesBetweenStamps ?? 0).toString()} />
        <Input name="maximumStampsPerTransaction" label="Most stamps in one go (1 to 5)" type="number" min="1" max="5" defaultValue={(cooldownRule?.maximumStampsPerTransaction ?? 5).toString()} />
        <Input name="maximumStampsPerCustomerPerDay" label="Most stamps per customer per day" type="number" min="1" defaultValue={cooldownRule?.maximumStampsPerCustomerPerDay?.toString() ?? ""} />
        <Input name="maximumStampsPerStaffPerDay" label="Most stamps per staff member per day" type="number" min="1" defaultValue={cooldownRule?.maximumStampsPerStaffPerDay?.toString() ?? ""} />
        <div className="flex items-end md:col-span-2"><ConfirmSubmitButton message="Save stamp limits? They apply to the next stamp staff add." className="h-11 rounded-md business-button px-4 text-sm font-semibold text-white">Save stamp limits</ConfirmSubmitButton></div>
      </form>
    </SectionCard>
  );
}
function CashbackSection({ cashback }: { cashback: Awaited<ReturnType<typeof getBusinessOwnerContext>>["business"]["cashbackSettings"] }) {
  const enabled = cashback?.enabled ?? false;
  const currency = cashback?.currency ?? "AED";
  const money = (value: unknown) => (value == null ? "No limit" : formatAed(Number(value), currency));
  return (
    <SectionCard
      title="Cashback"
      description="Customers build a balance from each payment and spend it on later visits. Everything about it is edited in one place: the cashback program."
      actions={<StatusBadge tone={enabled ? "success" : "neutral"}>{enabled ? "On" : "Off"}</StatusBadge>}
    >
      {enabled ? (
        <div className="grid gap-3 md:grid-cols-4">
          <Item label="Program name" value={cashback?.name?.trim() || "Cashback"} />
          <Item label="Cashback rate" value={`${cashback?.ratePercent?.toString() ?? "5"}%`} />
          <Item label="Max bill per payment" value={money(cashback?.maxBillAmount)} />
          <Item label="Max spend per visit" value={money(cashback?.maxRedemption)} />
        </div>
      ) : (
        <p className="text-sm text-[#64748B]">Cashback is off. Set it up as a program to let staff add cashback at the counter.</p>
      )}
      <div className="mt-4">
        <ButtonLink href="/dashboard/programs/new?type=cashback" variant="outline">{enabled ? "Edit cashback program" : "Set up cashback"}</ButtonLink>
      </div>
    </SectionCard>
  );
}

function PackagesSection({ packageCount }: { packageCount: number }) {
  return (
    <SectionCard
      title="Packages"
      description="Prepaid packages of visits or treatments. They switch on automatically when you create your first package."
      actions={<StatusBadge tone={packageCount > 0 ? "success" : "neutral"}>{packageCount > 0 ? "On" : "None yet"}</StatusBadge>}
    >
      <p className="text-sm text-[#64748B]">
        {packageCount > 0
          ? `You have ${packageCount} package${packageCount === 1 ? "" : "s"}. Rules like expiry and visits per month are set on each package's page.`
          : "Create a package from Programs when you are ready to sell prepaid visits."}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <ButtonLink href="/dashboard/programs" variant="outline">Open Programs</ButtonLink>
        <ButtonLink href="/dashboard/programs/new?type=membership" variant="outline">Create a package</ButtonLink>
      </div>
    </SectionCard>
  );
}
function resolveSettingsCategory(tab?: string) {
  const categories = ["general", "brand", "security", "messaging", "loyalty", "features", "billing"];
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
function Message({ error, success }: { error?: string; success?: string }) { if (!error && !success) return null; return <p className={`rounded-md border px-3 py-2 text-sm ${error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{error ?? success}</p>; }

