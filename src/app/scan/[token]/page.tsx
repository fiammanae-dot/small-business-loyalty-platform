import Link from "next/link";
import { redirect } from "next/navigation";
import type React from "react";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { CsrfInput } from "@/components/CsrfInput";
import { DashboardShell } from "@/components/DashboardShell";
import { IdempotencyInput } from "@/components/IdempotencyInput";
import { ScannerSoundFeedback } from "@/components/ScannerSoundFeedback";
import { StatusBadge } from "@/components/StatusBadge";
import { StampWhatsAppSharePrompt } from "@/components/StampWhatsAppSharePrompt";
import { ButtonLink, EmptyState, MetricCard, ProgressBar, SectionCard } from "@/components/ui";
import { ScannerResultCard } from "@/components/domain";
import { DetailPageLayout } from "@/components/layouts";
import { BRANCH_INACTIVE_MESSAGE, hasUsableSubscription, SUBSCRIPTION_REQUIRED_MESSAGE } from "@/lib/commercial-access";
import { getCardUrl, maskPhoneNumber } from "@/lib/customer-cards";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { fromStoredTier } from "@/lib/customer-tiers";
import { progressValue, programCustomerStatusLabel } from "@/lib/programs";
import { extractReferralCode, resolveReferralLandingReferrer } from "@/lib/referrals";
import { isRewardReady } from "@/lib/rewards";
import { roleHomePath } from "@/lib/roles";
import { getCurrentUser, hasActiveBusinessAccess } from "@/lib/session";
import { issueStampAction, redeemRewardAction, undoStampAction } from "@/app/scan/actions";

const CROSS_BUSINESS_SCAN_TITLE = "Access Denied";
const CROSS_BUSINESS_SCAN_DESCRIPTION = "This customer belongs to a different business workspace. For privacy and security reasons, customer information cannot be viewed or modified outside the assigned business.";
const CROSS_BUSINESS_SCAN_HELPER = "If you believe this is a mistake, contact your Business Owner or System Administrator.";
const OUT_OF_BRANCH_SCAN_DESCRIPTION = "This customer is outside your assigned branch scope. Customer information cannot be viewed or modified from this scanner.";
const STAMP_UNDO_WINDOW_MINUTES = 3;
const stampUndoReasons = ["Wrong customer scanned", "Duplicate scan", "Customer cancelled purchase", "System error", "Other"];

function isOutOfAssignedBranch(user: { role: string; branchId?: number | null }, membership: { createdBranchId?: number | null }) {
  return (user.role === "STAFF" || user.role === "BRANCH_MANAGER") && (!user.branchId || membership.createdBranchId !== user.branchId);
}

async function getStampUndoEligibility({
  stampTransaction,
  user,
}: {
  stampTransaction: {
    id: number;
    businessId: number;
    customerProgramMembershipId: number;
    issuedByUserId: number;
    createdAt: Date;
  };
  user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>> & { businessId: number };
}) {
  if (stampTransaction.businessId !== user.businessId) return { allowed: false, reason: "Stamp belongs to another business." };
  if (stampTransaction.issuedByUserId !== user.id) return { allowed: false, reason: "Only the user who issued this stamp can undo it." };
  if (stampTransaction.createdAt < new Date(Date.now() - STAMP_UNDO_WINDOW_MINUTES * 60 * 1000)) {
    return { allowed: false, reason: "The 3 minute undo window has expired." };
  }

  const [latestStamp, laterRedemption, laterCorrection] = await Promise.all([
    prisma.stampTransaction.findFirst({
      where: { businessId: user.businessId, customerProgramMembershipId: stampTransaction.customerProgramMembershipId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: { id: true },
    }),
    prisma.rewardRedemption.findFirst({
      where: {
        businessId: user.businessId,
        customerProgramMembershipId: stampTransaction.customerProgramMembershipId,
        redeemedAt: { gt: stampTransaction.createdAt },
      },
      select: { id: true },
    }),
    prisma.auditEvent.findFirst({
      where: {
        businessId: user.businessId,
        entityType: "customer_program_membership",
        entityId: String(stampTransaction.customerProgramMembershipId),
        action: { in: ["STAMP_UNDONE", "STAMP_MANUAL_CORRECTION"] },
        createdAt: { gt: stampTransaction.createdAt },
      },
      select: { id: true },
    }),
  ]);

  if (latestStamp?.id !== stampTransaction.id) return { allowed: false, reason: "Only the most recent stamp can be undone." };
  if (laterRedemption) return { allowed: false, reason: "A reward was redeemed after this stamp." };
  if (laterCorrection) return { allowed: false, reason: "A later correction already exists." };
  return { allowed: true, reason: null };
}

function decodeScanRouteToken(token: string) {
  try {
    return decodeURIComponent(token);
  } catch {
    return token;
  }
}

function referralCodeFromScanRouteToken(token: string) {
  const decodedToken = decodeScanRouteToken(token);
  return decodedToken.startsWith("referral:") ? extractReferralCode(decodedToken.slice("referral:".length)) : null;
}

export default async function ScanResultPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string; issued?: string; redeemed?: string; undone?: string; share?: string }>;
}) {
  const user = await getCurrentUser();
  const { token } = await params;
  const qs = await searchParams;

  if (!user) redirect("/login");
  if (user.role !== "STAFF" && user.role !== "BRANCH_MANAGER" && user.role !== "BUSINESS_OWNER") redirect(roleHomePath[user.role]);
  if (!user.businessId) redirect(roleHomePath[user.role]);
  if (!hasActiveBusinessAccess(user)) redirect("/business-inactive");
  const authUser = user as typeof user & { businessId: number };

  const scannerSoundSettings = await prisma.businessScannerSettings.findUnique({
    where: { businessId: authUser.businessId },
    select: { soundEffectsEnabled: true },
  });
  const scannerSoundEffectsEnabled = scannerSoundSettings?.soundEffectsEnabled ?? true;

  const scanTimestamp = new Date();
  const scannerBranch = authUser.branchId
    ? await prisma.branch.findFirst({
        where: { id: authUser.branchId, businessId: authUser.businessId },
        select: { id: true, name: true, status: true },
      })
    : null;

  if (!(await hasUsableSubscription(authUser.businessId))) {
    return <ScanMessage user={user} title={SUBSCRIPTION_REQUIRED_MESSAGE} soundEffectsEnabled={scannerSoundEffectsEnabled} />;
  }

  if ((authUser.role === "STAFF" || authUser.role === "BRANCH_MANAGER") && scannerBranch?.status !== "ACTIVE") {
    return <ScanMessage user={user} title={BRANCH_INACTIVE_MESSAGE} soundEffectsEnabled={scannerSoundEffectsEnabled} />;
  }

  const scanToken = decodeScanRouteToken(token);
  const referralCode = referralCodeFromScanRouteToken(token);
  if (referralCode) {
    const referrer = await resolveReferralLandingReferrer(referralCode);
    if (!referrer) {
      return <ScanMessage user={user} title="Referral not available." description="This referral link is unavailable or has been disabled." soundEffectsEnabled={scannerSoundEffectsEnabled} />;
    }

    if (referrer.businessId !== authUser.businessId) {
      return <CrossBusinessScanMessage user={user} soundEffectsEnabled={scannerSoundEffectsEnabled} />;
    }

    return (
      <ReferralInvitationScanScreen
        user={authUser}
        referralCode={referralCode}
        businessName={referrer.business.name}
        referrerName={`${referrer.globalCustomer.firstName} ${referrer.globalCustomer.lastName ?? ""}`.trim() || "Customer"}
        referrerTier={fromStoredTier(referrer.currentTier)}
        soundEffectsEnabled={scannerSoundEffectsEnabled}
      />
    );
  }

  const programMembership = await prisma.customerProgramMembership.findUnique({
    where: { scanToken },
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
    const cardMembership = await prisma.businessCustomerMembership.findUnique({
      where: { cardToken: token },
      include: {
        globalCustomer: true,
        business: true,
        createdBranch: true,
        programMemberships: {
          where: {
            status: "ACTIVE",
            scanStatus: "ACTIVE",
            loyaltyProgram: { active: true },
          },
          include: { loyaltyProgram: true },
          orderBy: { enrolledAt: "desc" },
        },
      },
    });

    if (!cardMembership) {
      await logScan("INVALID");
      return <ScanMessage user={user} title="Invalid Customer" description="Invalid loyalty QR code." soundEffectsEnabled={scannerSoundEffectsEnabled} />;
    }

    if (cardMembership.businessId !== authUser.businessId) {
      await logScan("WRONG_BUSINESS");
      return <CrossBusinessScanMessage user={user} soundEffectsEnabled={scannerSoundEffectsEnabled} />;
    }

    if (isOutOfAssignedBranch(authUser, cardMembership)) {
      await logScan("INVALID");
      return <OutOfBranchScanMessage user={user} soundEffectsEnabled={scannerSoundEffectsEnabled} />;
    }

    if (cardMembership.cardStatus !== "ACTIVE" || cardMembership.status !== "ACTIVE") {
      await logScan("DISABLED");
      return <ScanMessage user={user} title="Disabled Card" description="This customer card is disabled and cannot be used for scanning." soundEffectsEnabled={scannerSoundEffectsEnabled} />;
    }

    const activePrograms = cardMembership.programMemberships;
    if (activePrograms.length === 1) {
      redirect(`/scan/${activePrograms[0].scanToken}`);
    }

    if (activePrograms.length > 1) {
      return (
        <ProgramSelectionScreen
          user={authUser}
          membership={cardMembership}
          programs={activePrograms}
          soundEffectsEnabled={scannerSoundEffectsEnabled}
        />
      );
    }

    await logScan("INVALID");
    return <ScanMessage user={user} title="No Active Program" description="This customer is not enrolled in an active loyalty program." soundEffectsEnabled={scannerSoundEffectsEnabled} />;
  }

  const businessMembership = programMembership.businessCustomerMembership;

  if (businessMembership.businessId !== authUser.businessId) {
    await logScan("WRONG_BUSINESS", programMembership.id);
    return <CrossBusinessScanMessage user={user} soundEffectsEnabled={scannerSoundEffectsEnabled} />;
  }

  if (isOutOfAssignedBranch(authUser, businessMembership)) {
    await logScan("INVALID", programMembership.id);
    return <OutOfBranchScanMessage user={user} soundEffectsEnabled={scannerSoundEffectsEnabled} />;
  }

  if (programMembership.scanStatus !== "ACTIVE") {
    await logScan("DISABLED", programMembership.id);
    return <ScanMessage user={user} title="Disabled Card" description="This customer card is disabled and cannot be used for scanning." soundEffectsEnabled={scannerSoundEffectsEnabled} />;
  }

  if (
    programMembership.status !== "ACTIVE" ||
    !programMembership.loyaltyProgram.active ||
    businessMembership.status !== "ACTIVE"
  ) {
    await logScan("INVALID", programMembership.id);
    return <ScanMessage user={user} title="Invalid Customer" description="Invalid or unavailable loyalty QR." soundEffectsEnabled={scannerSoundEffectsEnabled} />;
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
  const customerName = (customer.firstName + " " + (customer.lastName ?? "")).trim();
  const program = programMembership.loyaltyProgram;
  const progress = progressValue(programMembership.earnedStamps, programMembership.bonusStamps);
  const cardUrl = await getCardUrl(businessMembership.cardToken);
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
          issuedByUser: true,
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
  const undoEligibility = issuedTransaction
    ? await getStampUndoEligibility({
        stampTransaction: {
          id: issuedTransaction.id,
          businessId: issuedTransaction.businessId,
          customerProgramMembershipId: issuedTransaction.customerProgramMembershipId,
          issuedByUserId: issuedTransaction.issuedByUserId,
          createdAt: issuedTransaction.createdAt,
        },
        user: authUser,
      })
    : { allowed: false, reason: "No stamp transaction selected." };
  const cardNumber = businessMembership.cardToken.length > 12 ? `${businessMembership.cardToken.slice(0, 8)}...${businessMembership.cardToken.slice(-4)}` : businessMembership.cardToken;
  const soundEvent = qs.error
    ? "invalid"
    : issuedTransaction
      ? "stamp-added"
      : redemption
        ? null
        : "valid";

  return (
    <DashboardShell user={authUser} eyebrow={roleEyebrow(authUser.role)} title="Scan result" hideWelcomeMessage>
      <ScannerSoundFeedback event={soundEvent} enabled={scannerSoundEffectsEnabled} />
      <ScanStatusBanner tone="green" title="Valid Customer" description="This loyalty QR belongs to your business and is ready for service." />

      <ActionSummarySection
        customerName={customerName}
        phone={customer.normalizedPhone}
        tier={fromStoredTier(businessMembership.currentTier) ?? "Bronze"}
        status={businessMembership.status}
        businessName={businessMembership.business.name}
        branchName={scannerBranch?.name ?? businessMembership.createdBranch?.name ?? "Unassigned"}
        programName={program.name}
        progress={progress}
        requiredStamps={program.requiredStamps}
        rewardReady={rewardReady}
        rewardName={program.rewardName}
      />

      {!redemption ? (
        <QuickScanActions
          token={scanToken}
          rewardReady={rewardReady}
          canRedeem={["BUSINESS_OWNER", "BRANCH_MANAGER", "STAFF"].includes(authUser.role)}
        />
      ) : null}

      {qs.error ? (
        <ScanStatusBanner tone="red" title="Action blocked" description={qs.error} />
      ) : null}

      {issuedTransaction ? (
        <StampUndoPanel
          token={scanToken}
          transactionId={issuedTransaction.id}
          quantity={issuedTransaction.quantity}
          canUndo={undoEligibility.allowed}
          unavailableReason={undoEligibility.reason}
          sharePrompt={
            qs.share === "whatsapp" && successProgress !== null ? (
              <StampWhatsAppSharePrompt
                cardUrl={cardUrl}
                businessName={businessMembership.business.name}
                customerName={customerName}
                recipientPhone={customer.normalizedPhone}
                auditMembershipUuid={businessMembership.uuid}
                currentVisits={successProgress}
                requiredVisits={program.requiredStamps}
                autoOpen
              />
            ) : null
          }
        />
      ) : null}

      {qs.undone ? (
        <ScanStatusBanner tone="orange" title="Stamp undone" description="The last stamp was removed from customer progress and permanently recorded in audit history." />
      ) : null}

      {redemption ? (
        <ScanStatusBanner tone="green" title="Reward redeemed successfully" description={`Progress has been reset to 0 / ${program.requiredStamps}.`} />
      ) : null}

      <DetailPageLayout>
      <section className="grid gap-3">
        <DetailAccordion title="Customer Details">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Info label="Card number" value={cardNumber} />
            <Info label="Join date" value={formatDateTime(businessMembership.joinedAt)} />
            <Info label="Last Visit" value={lastVisit ? `${formatDateTime(lastVisit.createdAt)}${lastVisit.branch?.name ? ` at ${lastVisit.branch.name}` : ""}` : "No visits yet"} />
            <Info label="Phone" value={maskPhoneNumber(customer.normalizedPhone)} />
            <Info label="Business membership status" value={<StatusBadge status={businessMembership.status} />} />
          </div>
        </DetailAccordion>

        <DetailAccordion title="Program Details">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Info label="Program name" value={program.name} />
            <Info label="Reward description" value={program.rewardDescription} />
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
          </div>
        </DetailAccordion>

        <DetailAccordion title="Scan Details">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Info label="Staff member" value={authUser.name} />
            <Info label="Branch" value={scannerBranch?.name ?? businessMembership.createdBranch?.name ?? "Unassigned"} />
            <Info label="Timestamp" value={formatDateTime(scanTimestamp)} />
          </div>
        </DetailAccordion>
      </section>
      {!rewardReady && !redemption ? (
        <AdvancedStampOptions
          token={scanToken}
          progress={progress}
          requiredStamps={program.requiredStamps}
          canOverrideCooldown={authUser.role !== "STAFF"}
        />
      ) : null}
      </DetailPageLayout>
    </DashboardShell>
  );
}

function ActionSummarySection({
  customerName,
  phone,
  tier,
  status,
  businessName,
  branchName,
  programName,
  progress,
  requiredStamps,
  rewardReady,
  rewardName,
}: {
  customerName: string;
  phone: string;
  tier: string;
  status: string;
  businessName: string;
  branchName: string;
  programName: string;
  progress: number;
  requiredStamps: number;
  rewardReady: boolean;
  rewardName: string;
}) {
  const remaining = Math.max(0, requiredStamps - progress);

  return (
    <SectionCard className="border-[#FED7AA]">
      <ScannerResultCard
        customerName={customerName}
        tier={tier}
        programName={programName}
        current={progress}
        required={requiredStamps}
        rewardReady={rewardReady}
      />
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Phone" value={maskPhoneNumber(phone)} />
        <MetricCard label="Workspace" value={businessName} helper={branchName} />
        <MetricCard label="Status" value={<StatusBadge status={status} />} />
        <MetricCard label="Reward" value={rewardName} helper={rewardReady ? "Reward Ready" : remaining + " visits remaining"} tone={rewardReady ? "success" : "neutral"} />
      </div>
      <div className="mt-4 rounded-md border border-[#E2E8F0] bg-white p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#0F172A]">{progress} / {requiredStamps} Visits</p>
            <p className="mt-1 text-sm text-[#64748B]">{rewardReady ? "Reward Ready" : remaining + " Visits Remaining"}</p>
          </div>
          <span className="rounded-md px-2 py-1 text-xs font-semibold business-bg-soft business-text">{programName}</span>
        </div>
        <ProgressBar value={progress} max={requiredStamps} className="mt-4" barClassName="business-button" />
      </div>
    </SectionCard>
  );
}

function QuickScanActions({ token, rewardReady, canRedeem }: { token: string; rewardReady: boolean; canRedeem: boolean }) {
  return (
    <section className="rounded-md border border-[#E5E7EB] bg-white p-4 shadow-sm">
      {rewardReady ? (
        canRedeem ? (
          <form action={redeemRewardAction}>
            <CsrfInput scope="scan:redemption" />
            <IdempotencyInput scope="redemption" />
            <input type="hidden" name="scanToken" value={token} />
            <ConfirmSubmitButton
              title="Redeem reward?"
              message="This will redeem the customer's available reward and reset progress for this program."
              confirmLabel="Redeem Reward"
              cancelLabel="Cancel"
              className="min-h-12 w-full rounded-md bg-emerald-600 px-5 text-base font-semibold text-white shadow-sm transition hover:bg-emerald-700"
            >
              Redeem Reward
            </ConfirmSubmitButton>
          </form>
        ) : (
          <p className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
            Reward ready. Redeem the reward before adding another stamp.
          </p>
        )
      ) : (
        <div className="grid gap-3">
          <form action={issueStampAction}>
            <CsrfInput scope="scan:stamp" />
            <IdempotencyInput scope="stamp" />
            <input type="hidden" name="scanToken" value={token} />
            <input type="hidden" name="quantity" value="1" />
            <ConfirmSubmitButton
              title="Issue stamp?"
              message="This will add 1 visit to the customer's selected program."
              confirmLabel="Issue Stamp"
              cancelLabel="Cancel"
              className="business-button min-h-12 w-full rounded-md bg-[#F97316] px-5 text-base font-semibold text-white shadow-sm transition"
            >
              Issue Stamp
            </ConfirmSubmitButton>
          </form>
          <form action={issueStampAction}>
            <CsrfInput scope="scan:stamp" />
            <IdempotencyInput scope="stamp-share" />
            <input type="hidden" name="scanToken" value={token} />
            <input type="hidden" name="quantity" value="1" />
            <input type="hidden" name="shareAfterStamp" value="whatsapp" />
            <ConfirmSubmitButton
              title="Issue stamp and share updated card?"
              message="This will add 1 visit, then prepare a WhatsApp message with the customer's updated loyalty card."
              confirmLabel="Issue Stamp & Share"
              cancelLabel="Cancel"
              className="min-h-12 w-full rounded-md border border-[#E5E7EB] bg-white px-5 text-base font-semibold text-[#111827] shadow-sm transition business-hover"
            >
              Issue Stamp &amp; Share via WhatsApp
            </ConfirmSubmitButton>
          </form>
        </div>
      )}
    </section>
  );
}

function StampUndoPanel({
  token,
  transactionId,
  quantity,
  canUndo,
  unavailableReason,
  sharePrompt,
}: {
  token: string;
  transactionId: number;
  quantity: number;
  canUndo: boolean;
  unavailableReason: string | null;
  sharePrompt?: React.ReactNode;
}) {
  return (
    <section className={`rounded-md border p-5 ${quantity >= 3 ? "border-orange-200 bg-orange-50 text-orange-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Stamp added successfully</h2>
          <p className="mt-2 text-sm leading-6">
            {quantity >= 3
              ? "Multiple stamps were issued in one transaction. This may create an alert for Business Owner review."
              : "The customer stamp progress was updated."}
          </p>
          {!canUndo && unavailableReason ? <p className="mt-2 text-xs font-semibold opacity-80">Undo unavailable: {unavailableReason}</p> : null}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row lg:justify-end">
          {canUndo ? (
            <form action={undoStampAction} className="grid gap-2 sm:min-w-60">
              <CsrfInput scope="scan:stamp-undo" />
              <input type="hidden" name="scanToken" value={token} />
              <input type="hidden" name="stampTransactionId" value={transactionId} />
              <label className="text-xs font-bold uppercase tracking-wide" htmlFor="undoReason">Reason</label>
              <select id="undoReason" name="undoReason" required className="min-h-10 rounded-md border border-[#CBD5E1] bg-white px-3 text-sm font-semibold text-[#0F172A]">
                <option value="">Select reason</option>
                {stampUndoReasons.map((reason) => <option key={reason} value={reason}>{reason}</option>)}
              </select>
              <ConfirmSubmitButton
                title="Undo last stamp?"
                message="This will remove the last loyalty stamp issued to this customer and will be permanently recorded in the audit history."
                confirmLabel="Undo Stamp"
                cancelLabel="Cancel"
                className="min-h-10 rounded-md border border-orange-300 bg-white px-4 text-sm font-bold text-orange-700 transition hover:bg-orange-100"
              >
                Undo Stamp
              </ConfirmSubmitButton>
            </form>
          ) : null}
          <ButtonLink href={`/scan/${token}`} variant="outline" className="min-h-10">
            Done
          </ButtonLink>
        </div>
      </div>
      {sharePrompt ? <div className="mt-4">{sharePrompt}</div> : null}
    </section>
  );
}

function DetailAccordion({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="rounded-md border border-[#E5E7EB] bg-white shadow-sm">
      <summary className="cursor-pointer list-none px-4 py-4 text-sm font-semibold text-[#111827] marker:hidden">
        <span className="flex items-center justify-between gap-3">
          {title}
          <span className="text-xs font-semibold text-[#6B7280]">Open</span>
        </span>
      </summary>
      <div className="border-t border-[#E5E7EB] p-4">{children}</div>
    </details>
  );
}

function AdvancedStampOptions({
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
    <details className="rounded-md border border-orange-100 bg-white shadow-sm">
      <summary className="cursor-pointer list-none px-4 py-4 text-sm font-semibold text-[#111827] marker:hidden">
        <span className="flex items-center justify-between gap-3">
          Advanced stamp options
          <span className="text-xs font-semibold text-[#6B7280]">Open</span>
        </span>
      </summary>
      <div className="border-t border-orange-100 p-4">
        <div className="mb-4 rounded-md border border-orange-200 bg-orange-50 p-3 text-sm text-orange-900">
          <p className="font-semibold">Suspicious Activity Alert</p>
          <p className="mt-1">
            Use these options when issuing multiple stamps or when repeated stamp activity needs a reason.
          </p>
        </div>
        <StampIssuanceSection
          token={token}
          progress={progress}
          requiredStamps={requiredStamps}
          canOverrideCooldown={canOverrideCooldown}
        />
      </div>
    </details>
  );
}
function ReferralInvitationScanScreen({
  user,
  referralCode,
  businessName,
  referrerName,
  referrerTier,
  soundEffectsEnabled,
}: {
  user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>> & { businessId: number };
  referralCode: string;
  businessName: string;
  referrerName: string;
  referrerTier: string | null;
  soundEffectsEnabled: boolean;
}) {
  const enrollmentHref = referralEnrollmentHref(user.role, referralCode);
  const displayReferralId = friendlyReferralId(referralCode);

  return (
    <DashboardShell user={user} eyebrow={roleEyebrow(user.role)} title="Referral invitation found" hideWelcomeMessage>
      <ScannerSoundFeedback event="valid" enabled={soundEffectsEnabled} />
      <ScanStatusBanner tone="green" title="Referral invitation found" description="This referral belongs to your business. Enroll the new customer to attach the referral." />

      <section className="rounded-md border border-[#E5E7EB] bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <Info label="Business" value={businessName} />
          <Info label="Referred by" value={referrerName} />
          <Info label="Tier" value={referrerTier ? `${referrerTier} member` : "Not assigned"} />
          <Info label="Referral ID" value={displayReferralId} />
        </div>
        <div className="mt-5 rounded-md border border-orange-200 bg-orange-50 p-4 text-sm leading-6 text-orange-800 business-bg-soft business-border-soft business-text-strong">
          Referral rewards are not issued now. They are activated after the referred customer completes their first valid loyalty stamp.
        </div>
        <Link href={enrollmentHref} className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-md business-button px-5 text-sm font-semibold text-white sm:w-auto">
          Enroll New Customer With Referral
        </Link>
      </section>
    </DashboardShell>
  );
}

function referralEnrollmentHref(role: string, referralCode: string) {
  const encoded = encodeURIComponent(referralCode);
  if (role === "STAFF") return `/staff/customers/new?ref=${encoded}`;
  if (role === "BRANCH_MANAGER") return `/branch/customers/new?ref=${encoded}`;
  return `/dashboard/customers/new?ref=${encoded}`;
}

function friendlyReferralId(referralCode: string) {
  let hash = 0;
  for (const character of referralCode) {
    hash = (hash * 31 + character.charCodeAt(0)) % 10000;
  }
  return `RF-${hash.toString().padStart(4, "0")}`;
}
function CrossBusinessScanMessage({
  user,
  soundEffectsEnabled,
}: {
  user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
  soundEffectsEnabled: boolean;
}) {
  return (
    <DashboardShell user={user} eyebrow={roleEyebrow(user.role)} title="Scan result" hideWelcomeMessage>
      <ScannerSoundFeedback event="invalid" enabled={soundEffectsEnabled} />
      <ScanStatusBanner tone="red" title={CROSS_BUSINESS_SCAN_TITLE} description={CROSS_BUSINESS_SCAN_DESCRIPTION} />
      <p className="rounded-md border border-red-100 bg-white px-4 py-3 text-sm text-[#6B7280]">{CROSS_BUSINESS_SCAN_HELPER}</p>
      <Link href={scannerPathForRole(user.role)} className="inline-flex min-h-12 w-full items-center justify-center rounded-md bg-[#111827] px-5 text-sm font-semibold text-white sm:w-auto">
        Back to Scanner
      </Link>
    </DashboardShell>
  );
}
function OutOfBranchScanMessage({
  user,
  soundEffectsEnabled,
}: {
  user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
  soundEffectsEnabled: boolean;
}) {
  return <ScanMessage user={user} title="Access Denied" description={OUT_OF_BRANCH_SCAN_DESCRIPTION} soundEffectsEnabled={soundEffectsEnabled} />;
}

function ScanMessage({
  user,
  title,
  description,
  soundEffectsEnabled = true,
}: {
  user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
  title: string;
  description?: string;
  soundEffectsEnabled?: boolean;
}) {
  return (
    <DashboardShell user={user} eyebrow={roleEyebrow(user.role)} title="Scan result" hideWelcomeMessage>
      <ScannerSoundFeedback event="invalid" enabled={soundEffectsEnabled} />
      <EmptyState title={title} description={description ?? "Ask the customer to show a current loyalty QR for this business."} />
      <ButtonLink href={scannerPathForRole(user.role)} variant="outline" className="w-full sm:w-auto">
        Back to Scanner
      </ButtonLink>
    </DashboardShell>
  );
}

function ProgramSelectionScreen({
  user,
  membership,
  programs,
  soundEffectsEnabled,
}: {
  user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>> & { businessId: number };
  membership: {
    cardToken: string;
    globalCustomer: { firstName: string; lastName: string | null; normalizedPhone: string };
    business: { name: string };
    createdBranch: { name: string } | null;
  };
  programs: Array<{
    id: number;
    scanToken: string;
    earnedStamps: number;
    bonusStamps: number;
    loyaltyProgram: {
      name: string;
      requiredStamps: number;
      rewardName: string;
    };
  }>;
  soundEffectsEnabled: boolean;
}) {
  const customer = membership.globalCustomer;
  const customerName = `${customer.firstName} ${customer.lastName ?? ""}`.trim();
  const cardNumber = membership.cardToken.length > 12 ? `${membership.cardToken.slice(0, 8)}...${membership.cardToken.slice(-4)}` : membership.cardToken;

  return (
    <DashboardShell user={user} eyebrow={roleEyebrow(user.role)} title="Choose loyalty program" hideWelcomeMessage>
      <ScannerSoundFeedback event="valid" enabled={soundEffectsEnabled} />
      <ScanStatusBanner tone="green" title="Valid Customer" description="This customer belongs to your business. Choose which loyalty program receives the stamp." />

      <section className="rounded-md border border-[#E5E7EB] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#F97316] business-text">Customer validation</p>
            <h2 className="mt-2 text-2xl font-semibold text-[#111827]">{customerName}</h2>
            <p className="mt-1 text-sm text-[#6B7280]">{membership.business.name} � {membership.createdBranch?.name ?? "Unassigned"}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <SummaryItem label="Card Number" value={cardNumber} />
            <SummaryItem label="Programs Found" value={programs.length.toString()} />
            <SummaryItem label="Next Step" value="Select program" />
          </div>
        </div>
      </section>

      <section className="rounded-md border border-[#E5E7EB] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#F97316] business-text">Program selection required</p>
            <h2 className="mt-1 text-xl font-semibold text-[#111827]">Which program should receive this scan?</h2>
          </div>
          <p className="text-sm text-[#6B7280]">Only the selected program will be updated.</p>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {programs.map((programMembership) => {
            const progress = progressValue(programMembership.earnedStamps, programMembership.bonusStamps);
            const required = programMembership.loyaltyProgram.requiredStamps;
            const progressPercent = Math.min(100, Math.round((progress / required) * 100));
            const rewardReady = progress >= required;
            return (
              <Link
                key={programMembership.id}
                href={`/scan/${programMembership.scanToken}`}
                className="rounded-md border border-[#E5E7EB] bg-white p-4 shadow-sm transition business-hover"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-[#111827]">{programMembership.loyaltyProgram.name}</h3>
                    <p className="mt-1 text-sm text-[#6B7280]">Reward: {programMembership.loyaltyProgram.rewardName}</p>
                  </div>
                  <span className={`rounded-md px-2 py-1 text-xs font-semibold ${rewardReady ? "bg-emerald-50 text-emerald-700" : "business-bg-soft business-text"}`}>
                    {rewardReady ? "Reward Ready" : "Active"}
                  </span>
                </div>
                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-[#111827]">{progress} / {required}</span>
                    <span className="text-[#6B7280]">{progressPercent}%</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full business-bg-soft">
                    <div className="h-2 rounded-full business-button" style={{ width: `${progressPercent}%` }} />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-[#F97316] business-text">Select this program</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
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
          Reason for multiple stamps or repeated stamps
          <textarea
            name="reason"
            rows={3}
            className="rounded-md border border-[#E5E7EB] px-3 py-2 text-sm font-normal outline-none focus:border-[#F97316] focus:ring-4 focus:ring-orange-100"
            placeholder="Required for multiple stamps or repeated stamps in a short time. Reason: customer purchased multiple items."
          />
        </label>
        <ConfirmSubmitButton
          message="Issue this stamp to this customer and selected program?"
          className="h-12 rounded-md bg-[#F97316] px-6 text-base font-semibold text-white shadow-sm transition hover:bg-orange-600"
        >
          Add Stamp
        </ConfirmSubmitButton>
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

function scannerPathForRole(role: string) {
  if (role === "STAFF") return "/staff/scanner";
  if (role === "BRANCH_MANAGER") return "/branch/scanner";
  return "/dashboard/scanner";
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




