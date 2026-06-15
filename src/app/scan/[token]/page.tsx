import { redirect } from "next/navigation";
import type React from "react";
import { CsrfInput } from "@/components/CsrfInput";
import { DashboardShell } from "@/components/DashboardShell";
import { IdempotencyInput } from "@/components/IdempotencyInput";
import { StatusBadge } from "@/components/StatusBadge";
import { BRANCH_INACTIVE_MESSAGE, hasUsableSubscription, SUBSCRIPTION_REQUIRED_MESSAGE } from "@/lib/commercial-access";
import { maskPhoneNumber } from "@/lib/customer-cards";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { progressValue, programCustomerStatusLabel } from "@/lib/programs";
import { isRewardReady } from "@/lib/rewards";
import { roleHomePath } from "@/lib/roles";
import { getCurrentUser } from "@/lib/session";
import { issueStampAction, redeemRewardAction } from "@/app/scan/actions";

export default async function ScanResultPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string; issued?: string; redeemed?: string }>;
}) {
  const user = await getCurrentUser();
  const { token } = await params;
  const qs = await searchParams;

  if (!user) redirect("/login");
  if (user.role !== "STAFF" && user.role !== "BRANCH_MANAGER" && user.role !== "BUSINESS_OWNER") redirect(roleHomePath[user.role]);
  if (!user.businessId) redirect(roleHomePath[user.role]);
  const authUser = user as typeof user & { businessId: number };

  const scanTimestamp = new Date();
  const scannerBranch = authUser.branchId
    ? await prisma.branch.findFirst({
        where: { id: authUser.branchId, businessId: authUser.businessId },
        select: { id: true, name: true, status: true },
      })
    : null;

  if (!(await hasUsableSubscription(authUser.businessId))) {
    return <ScanMessage user={user} title={SUBSCRIPTION_REQUIRED_MESSAGE} />;
  }

  if ((authUser.role === "STAFF" || authUser.role === "BRANCH_MANAGER") && scannerBranch?.status !== "ACTIVE") {
    return <ScanMessage user={user} title={BRANCH_INACTIVE_MESSAGE} />;
  }

  const programMembership = await prisma.customerProgramMembership.findUnique({
    where: { scanToken: token },
    include: {
      loyaltyProgram: true,
      businessCustomerMembership: {
        include: {
          globalCustomer: true,
          business: true,
          createdBranch: true,
        },
      },
    },
  });

  async function logScan(result: "VALID" | "INVALID" | "WRONG_BUSINESS" | "DISABLED", customerProgramMembershipId?: number) {
    await prisma.scanEvent.create({
      data: {
        businessId: authUser.businessId,
        branchId: scannerBranch?.id ?? null,
        scannedByUserId: authUser.id,
        customerProgramMembershipId: customerProgramMembershipId ?? null,
        scanToken: token,
        result,
        createdAt: scanTimestamp,
      },
    });
  }

  if (!programMembership) {
    await logScan("INVALID");
    return <ScanMessage user={user} title="Invalid Customer" description="Invalid loyalty QR code." />;
  }

  const businessMembership = programMembership.businessCustomerMembership;

  if (businessMembership.businessId !== authUser.businessId) {
    await logScan("WRONG_BUSINESS", programMembership.id);
    return <ScanMessage user={user} title="Wrong Business" description="This loyalty QR does not belong to your business." />;
  }

  if (programMembership.scanStatus !== "ACTIVE") {
    await logScan("DISABLED", programMembership.id);
    return <ScanMessage user={user} title="Disabled Card" description="This customer card is disabled and cannot be used for scanning." />;
  }

  if (
    programMembership.status !== "ACTIVE" ||
    !programMembership.loyaltyProgram.active ||
    businessMembership.status !== "ACTIVE"
  ) {
    await logScan("INVALID", programMembership.id);
    return <ScanMessage user={user} title="Invalid Customer" description="Invalid or unavailable loyalty QR." />;
  }

  await prisma.$transaction([
    prisma.customerProgramMembership.update({
      where: { id: programMembership.id },
      data: { scanLastUsedAt: scanTimestamp },
    }),
    prisma.scanEvent.create({
      data: {
        businessId: authUser.businessId,
        branchId: scannerBranch?.id ?? null,
        scannedByUserId: authUser.id,
        customerProgramMembershipId: programMembership.id,
        scanToken: token,
        result: "VALID",
        createdAt: scanTimestamp,
      },
    }),
  ]);

  const customer = businessMembership.globalCustomer;
  const program = programMembership.loyaltyProgram;
  const progress = progressValue(programMembership.earnedStamps, programMembership.bonusStamps);
  const issuedTransactionId = qs.issued ? Number(qs.issued) : null;
  const redeemedId = qs.redeemed ? Number(qs.redeemed) : null;
  const issuedTransaction = issuedTransactionId
    ? await prisma.stampTransaction.findFirst({
        where: {
          id: issuedTransactionId,
          businessId: authUser.businessId,
          customerProgramMembershipId: programMembership.id,
        },
        include: {
          customerProgramMembership: {
            include: { loyaltyProgram: true },
          },
        },
      })
    : null;
  const successProgress = issuedTransaction
    ? progressValue(issuedTransaction.customerProgramMembership.earnedStamps, issuedTransaction.customerProgramMembership.bonusStamps)
    : null;
  const rewardReady = isRewardReady({
    earnedStamps: programMembership.earnedStamps,
    bonusStamps: programMembership.bonusStamps,
    requiredStamps: program.requiredStamps,
  });
  const redemption = redeemedId
    ? await prisma.rewardRedemption.findFirst({
        where: {
          id: redeemedId,
          businessId: authUser.businessId,
          customerProgramMembershipId: programMembership.id,
        },
        include: {
          branch: true,
          redeemedByUser: true,
        },
      })
    : null;
  const lastVisit = await prisma.stampTransaction.findFirst({
    where: {
      businessId: authUser.businessId,
      customerProgramMembershipId: programMembership.id,
    },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true, branch: { select: { name: true } } },
  });
  const cardNumber = businessMembership.cardToken.length > 12 ? `${businessMembership.cardToken.slice(0, 8)}...${businessMembership.cardToken.slice(-4)}` : businessMembership.cardToken;

  return (
    <DashboardShell user={authUser} eyebrow={roleEyebrow(authUser.role)} title="Scan result" hideWelcomeMessage>
      <ScanStatusBanner tone="green" title="Valid Customer" description="This loyalty QR belongs to your business and is ready for service." />

      {rewardReady ? (
        <ScanStatusBanner tone="blue" title="Reward Ready" description={`${program.rewardName} can be redeemed by a Business Owner or Branch Manager.`} />
      ) : null}

      {issuedTransaction && issuedTransaction.quantity >= 3 ? (
        <ScanStatusBanner tone="orange" title="Suspicious Activity Alert" description="Multiple stamps were issued in one transaction. This may create an alert for Business Owner review." />
      ) : null}

      {qs.error ? (
        <ScanStatusBanner tone="red" title="Action blocked" description={qs.error} />
      ) : null}

      <StampIssuanceSection
        token={token}
        progress={progress}
        requiredStamps={program.requiredStamps}
        canOverrideCooldown={authUser.role !== "STAFF"}
      />

      {issuedTransaction ? (
        <section className="rounded-md border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-sm font-semibold text-emerald-800">Stamp issued successfully</p>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <Info label="Customer name" value={`${customer.firstName} ${customer.lastName ?? ""}`} />
            <Info label="Program name" value={program.name} />
            <Info label="Quantity added" value={issuedTransaction.quantity.toString()} />
            <Info label="Earned stamps" value={issuedTransaction.customerProgramMembership.earnedStamps.toString()} />
            <Info label="Bonus stamps" value={issuedTransaction.customerProgramMembership.bonusStamps.toString()} />
            <Info label="Progress" value={`${successProgress} / ${program.requiredStamps}`} />
            <Info label="Reward" value={program.rewardName} />
          </div>
        </section>
      ) : null}

      {redemption ? (
        <section className="rounded-md border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-sm font-semibold text-emerald-800">Reward Redeemed Successfully</p>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <Info label="Customer" value={`${customer.firstName} ${customer.lastName ?? ""}`} />
            <Info label="Reward" value={redemption.rewardName} />
            <Info label="Branch" value={redemption.branch?.name ?? "Unassigned"} />
            <Info label="Redeemed By" value={redemption.redeemedByUser.name} />
            <Info label="Date/Time" value={formatDateTime(redemption.redeemedAt)} />
          </div>
        </section>
      ) : null}

      <section className="rounded-md border border-[#E5E7EB] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#F97316]">Customer summary</p>
            <h2 className="mt-2 text-2xl font-semibold text-[#111827]">{customer.firstName} {customer.lastName ?? ""}</h2>
            <p className="mt-1 text-sm text-[#6B7280]">{program.name} member card</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <SummaryItem label="Card Number" value={cardNumber} />
            <SummaryItem label="Program" value={program.name} />
            <SummaryItem label="Progress" value={`${progress} / ${program.requiredStamps}`} />
            <SummaryItem label="Reward Status" value={redemption ? "Redeemed" : rewardReady ? "Reward Ready" : "Active"} />
            <SummaryItem label="Last Visit" value={lastVisit ? `${formatDateTime(lastVisit.createdAt)}${lastVisit.branch?.name ? ` at ${lastVisit.branch.name}` : ""}` : "No visits yet"} />
          </div>
        </div>
      </section>

      {rewardReady ? (
        <section className="rounded-md border-2 border-blue-200 bg-blue-50 p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase text-blue-800">Reward Ready</p>
              <h2 className="mt-2 text-2xl font-semibold text-[#111827]">{program.rewardName}</h2>
              <p className="mt-2 text-sm text-blue-800">This customer has reached the required stamp target.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Info label="Required Stamps" value={program.requiredStamps.toString()} />
              <Info label="Current Stamps" value={progress.toString()} />
              <Info label="Reward Name" value={program.rewardName} />
            </div>
          </div>
        </section>
      ) : null}

      <section className="grid gap-5 lg:grid-cols-3">
        <div className="rounded-md border border-[#E5E7EB] bg-white p-5">
          <p className="text-sm font-semibold text-[#F97316]">Customer</p>
          <h2 className="mt-2 text-xl font-semibold text-[#111827]">{customer.firstName} {customer.lastName ?? ""}</h2>
          <div className="mt-5 grid gap-3">
            <Info label="Phone" value={maskPhoneNumber(customer.normalizedPhone)} />
            <Info label="Business membership status" value={<StatusBadge status={businessMembership.status} />} />
          </div>
        </div>

        <div className="rounded-md border border-[#E5E7EB] bg-white p-5">
          <p className="text-sm font-semibold text-[#F97316]">Program</p>
          <h2 className="mt-2 text-xl font-semibold text-[#111827]">{program.name}</h2>
          <div className="mt-5 grid gap-3">
            <Info label="Product/service" value={program.productOrServiceName} />
            <Info label="Current progress" value={`${progress} / ${program.requiredStamps}`} />
            <Info label="Required stamps" value={program.requiredStamps.toString()} />
            <Info label="Bonus stamps" value={programMembership.bonusStamps.toString()} />
            <Info label="Earned stamps" value={programMembership.earnedStamps.toString()} />
            <Info
              label="Program status"
              value={programCustomerStatusLabel({
                status: programMembership.status,
                earnedStamps: programMembership.earnedStamps,
                bonusStamps: programMembership.bonusStamps,
                requiredStamps: program.requiredStamps,
              })}
            />
            <Info label="Reward name" value={program.rewardName} />
            <Info label="Reward description" value={program.rewardDescription} />
            <Info label="Reward state" value={redemption ? "Redeemed" : rewardReady ? "Reward Ready" : "Active"} />
          </div>
        </div>

        <div className="rounded-md border border-[#E5E7EB] bg-white p-5">
          <p className="text-sm font-semibold text-[#F97316]">Scan details</p>
          <div className="mt-5 grid gap-3">
            <Info label="Scanned by" value={authUser.name} />
            <Info label="Branch name" value={scannerBranch?.name ?? businessMembership.createdBranch?.name ?? "Unassigned"} />
            <Info label="Scan timestamp" value={formatDateTime(scanTimestamp)} />
          </div>
        </div>
      </section>

      {authUser.role !== "STAFF" ? (
        <section className={`rounded-md border p-5 ${rewardReady ? "border-emerald-200 bg-emerald-50" : "border-[#E5E7EB] bg-white"}`}>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className={`text-sm font-semibold ${rewardReady ? "text-emerald-800" : "text-[#F97316]"}`}>Reward redemption</p>
              <h2 className="mt-2 text-lg font-semibold text-[#111827]">{rewardReady ? "Reward Ready" : "Reward not ready"}</h2>
              <p className="mt-2 text-sm leading-6 text-[#6B7280]">
                {rewardReady
                  ? `${program.rewardName} can be redeemed now. Redemption resets earned stamps and starts a new cycle with the program bonus.`
                  : `Customer needs ${Math.max(0, program.requiredStamps - progress)} more stamp${Math.max(0, program.requiredStamps - progress) === 1 ? "" : "s"} before redemption.`}
              </p>
            </div>
            <div className="rounded-md border border-[#E5E7EB] bg-white p-3 text-sm text-[#6B7280]">
              Progress: <span className="font-semibold text-[#111827]">{progress} / {program.requiredStamps}</span>
            </div>
          </div>
          {rewardReady ? (
            <form action={redeemRewardAction} className="mt-5 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
              <CsrfInput scope="scan:redemption" />
              <IdempotencyInput scope="redemption" />
              <input type="hidden" name="scanToken" value={token} />
              <label className="grid gap-2 text-sm font-semibold text-[#111827]">
                Notes
                <textarea
                  name="notes"
                  rows={3}
                  className="rounded-md border border-[#E5E7EB] px-3 py-2 text-sm font-normal outline-none focus:border-[#F97316] focus:ring-4 focus:ring-orange-100"
                  placeholder="Optional redemption note"
                />
              </label>
              <button type="submit" className="h-11 rounded-md bg-[#F97316] px-5 text-sm font-semibold text-white">
                Confirm Redemption
              </button>
            </form>
          ) : null}
        </section>
      ) : null}
    </DashboardShell>
  );
}

function ScanMessage({
  user,
  title,
  description,
}: {
  user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
  title: string;
  description?: string;
}) {
  return (
    <DashboardShell user={user} eyebrow={roleEyebrow(user.role)} title="Scan result" hideWelcomeMessage>
      <ScanStatusBanner tone="red" title={title} description={description ?? "Ask the customer to show a current loyalty QR for this business."} />
    </DashboardShell>
  );
}

function ScanStatusBanner({
  tone,
  title,
  description,
}: {
  tone: "green" | "blue" | "orange" | "red";
  title: string;
  description: string;
}) {
  const classes = {
    green: "border-emerald-200 bg-emerald-50 text-emerald-800",
    blue: "border-blue-200 bg-blue-50 text-blue-800",
    orange: "border-orange-200 bg-orange-50 text-orange-800",
    red: "border-red-200 bg-red-50 text-red-700",
  }[tone];

  return (
    <section className={`rounded-md border p-5 ${classes}`}>
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-6">{description}</p>
    </section>
  );
}

function StampIssuanceSection({
  token,
  progress,
  requiredStamps,
  canOverrideCooldown,
}: {
  token: string;
  progress: number;
  requiredStamps: number;
  canOverrideCooldown: boolean;
}) {
  return (
    <section className="rounded-md border-2 border-orange-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#F97316]">Stamp issuance</p>
          <h2 className="mt-2 text-lg font-semibold text-[#111827]">Add earned stamps</h2>
          <p className="mt-2 text-sm leading-6 text-[#6B7280]">Only earned stamps are updated. Bonus stamps remain unchanged.</p>
        </div>
        <div className="rounded-md border border-[#E5E7EB] bg-[#FAFAFA] p-3 text-sm text-[#6B7280]">
          Current progress: <span className="font-semibold text-[#111827]">{progress} / {requiredStamps}</span>
        </div>
      </div>
      <form action={issueStampAction} className="mt-6 grid gap-4 rounded-md border-2 border-orange-200 bg-orange-50 p-4 md:grid-cols-[minmax(260px,0.8fr)_1fr_auto] md:items-end">
        <CsrfInput scope="scan:stamp" />
        <IdempotencyInput scope="stamp" />
        <input type="hidden" name="scanToken" value={token} />
        <label className="grid gap-2 text-sm font-semibold text-[#111827]">
          Stamp Quantity
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((quantity) => (
              <label key={quantity} className="cursor-pointer">
                <input className="peer sr-only" type="radio" name="quantity" value={quantity} defaultChecked={quantity === 1} />
                <span className="flex min-h-12 items-center justify-center rounded-md border border-[#E5E7EB] bg-white text-sm font-semibold text-[#111827] transition peer-checked:border-[#F97316] peer-checked:bg-[#F97316] peer-checked:text-white">
                  +{quantity}
                </span>
              </label>
            ))}
          </div>
        </label>
        <label className="grid gap-2 text-sm font-semibold text-[#111827]">
          Reason for multiple stamps
          <textarea
            name="reason"
            rows={3}
            className="rounded-md border border-[#E5E7EB] px-3 py-2 text-sm font-normal outline-none focus:border-[#F97316] focus:ring-4 focus:ring-orange-100"
            placeholder="Required for +2 to +5 stamps so managers can review unusual activity. Example: Customer purchased multiple items."
          />
        </label>
        <button type="submit" className="h-12 rounded-md bg-[#F97316] px-6 text-base font-semibold text-white shadow-sm transition hover:bg-orange-600">
          Add Stamp
        </button>
        {canOverrideCooldown ? (
          <div className="rounded-md border border-orange-200 bg-white p-3 md:col-span-3">
            <label className="flex items-center gap-2 text-sm font-semibold text-[#111827]">
              <input type="checkbox" name="overrideCooldown" className="h-4 w-4 rounded border-[#E5E7EB]" />
              Override cooldown rule
            </label>
            <label className="mt-3 grid gap-2 text-sm font-semibold text-[#111827]">
              Override reason
              <input
                name="overrideReason"
                className="h-10 rounded-md border border-[#E5E7EB] px-3 text-sm font-normal outline-none focus:border-[#F97316] focus:ring-4 focus:ring-orange-100"
                placeholder="Required when overriding a cooldown violation"
              />
            </label>
          </div>
        ) : null}
      </form>
    </section>
  );
}

function roleEyebrow(role: string) {
  if (role === "STAFF") return "Staff";
  if (role === "BRANCH_MANAGER") return "Branch Manager";
  return "Business Owner";
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border border-[#E5E7EB] bg-white p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">{label}</p>
      <div className="mt-2 text-sm font-semibold text-[#111827]">{value}</div>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[#E5E7EB] bg-[#FAFAFA] p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold text-[#111827]">{value}</p>
    </div>
  );
}
