import "server-only";

import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { createAbuseAlert, getAlertRule } from "@/lib/alert-engine";
import type { Prisma } from "@prisma/client";
import { applyCashbackDelta, CASHBACK_NOT_JOINED_MESSAGE, canSpendCashback, computeCashbackEarn, formatAed } from "@/lib/cashback";
import { syncGoogleWalletAfterCashbackChange } from "@/lib/google-wallet/service";
import { qualifyReferral } from "@/lib/referrals";
import { syncAppleWalletAfterCashbackChange } from "@/lib/walletwallet/service";

/**
 * Shared cashback wallet money movements.
 *
 * Both the owner dashboard and the staff scan flow go through these two
 * functions, so the money rules live in exactly one audited place: the balance
 * and the ledger row always move together inside one transaction, under a row
 * lock, the balance can never go negative, a replay of the same idempotency key
 * is a no-op, every movement writes an audit event, and the optional
 * per-transaction caps are enforced here rather than in each caller.
 *
 * Only customers who joined the cashback program (cashbackJoinedAt set) can
 * earn or spend; that check also lives here so no caller can skip it.
 *
 * The caller is responsible only for authorization (who may act) and for
 * resolving which customer is being acted on; these functions trust the
 * businessId / membershipId they are given.
 */

/** A rule the user can fix: cap exceeded, nothing to earn, or insufficient balance. */
export class CashbackError extends Error {}
/** The same idempotency key was already used - the movement already happened. */
export class DuplicateCashbackError extends Error {}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: string }).code === "P2002"
  );
}

type LedgerTx = Prisma.TransactionClient;

async function cashbackNames(tx: LedgerTx, membershipId: number, actorUserId: number | null) {
  const [customer, actor] = await Promise.all([
    tx.businessCustomerMembership.findUnique({ where: { id: membershipId }, select: { firstName: true, lastName: true } }),
    actorUserId ? tx.user.findUnique({ where: { id: actorUserId }, select: { name: true } }) : null,
  ]);
  return {
    customerName: customer ? `${customer.firstName} ${customer.lastName ?? ""}`.trim() : "A customer",
    staffName: actor?.name ?? "A staff member",
  };
}

/** Cashback alerts after an earn: a large bill, or cashback added to the same customer often. */
async function checkCashbackEarnAlerts(
  tx: LedgerTx,
  input: { businessId: number; membershipId: number; branchId: number | null; actorUserId: number | null; billAmount: number; amount: number; currency: string; transactionId: number },
) {
  const [largeBill, frequent] = await Promise.all([
    getAlertRule(tx, input.businessId, "CASHBACK_LARGE_BILL"),
    getAlertRule(tx, input.businessId, "CASHBACK_FREQUENT_EARN"),
  ]);
  if (!largeBill.enabled && !frequent.enabled) return;
  const names = await cashbackNames(tx, input.membershipId, input.actorUserId);

  if (largeBill.enabled && input.billAmount >= largeBill.threshold) {
    await createAbuseAlert({
      tx,
      businessId: input.businessId,
      branchId: input.branchId,
      userId: input.actorUserId,
      alertType: "CASHBACK_LARGE_BILL",
      severity: largeBill.severity,
      description: `${names.staffName} added ${formatAed(input.amount, input.currency)} cashback to ${names.customerName} on a bill of ${formatAed(input.billAmount, input.currency)} (your limit is ${formatAed(largeBill.threshold, input.currency)}).`,
      dedupeScope: `cashback-bill:${input.transactionId}`,
      metadata: { cashbackTransactionId: input.transactionId, billAmount: input.billAmount, threshold: largeBill.threshold },
    });
  }

  if (frequent.enabled) {
    const earnsIn24h = await tx.cashbackTransaction.count({
      where: {
        businessId: input.businessId,
        businessCustomerMembershipId: input.membershipId,
        type: "EARN",
        billAmount: { not: null },
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });
    if (earnsIn24h >= frequent.threshold) {
      await createAbuseAlert({
        tx,
        businessId: input.businessId,
        branchId: input.branchId,
        userId: input.actorUserId,
        alertType: "CASHBACK_FREQUENT_EARN",
        severity: frequent.severity,
        description: `Cashback was added to ${names.customerName} ${earnsIn24h} times in 24 hours (your limit is ${frequent.threshold}). Latest by ${names.staffName}.`,
        dedupeScope: `cashback:${input.membershipId}`,
        metadata: { earnsIn24h, threshold: frequent.threshold, cashbackTransactionId: input.transactionId },
      });
    }
  }
}

/** Cashback alert after a spend: a large amount used in one go. */
async function checkCashbackSpendAlert(
  tx: LedgerTx,
  input: { businessId: number; membershipId: number; branchId: number | null; actorUserId: number | null; amount: number; currency: string; transactionId: number },
) {
  const rule = await getAlertRule(tx, input.businessId, "CASHBACK_LARGE_REDEMPTION");
  if (!rule.enabled || input.amount < rule.threshold) return;
  const names = await cashbackNames(tx, input.membershipId, input.actorUserId);
  await createAbuseAlert({
    tx,
    businessId: input.businessId,
    branchId: input.branchId,
    userId: input.actorUserId,
    alertType: "CASHBACK_LARGE_REDEMPTION",
    severity: rule.severity,
    description: `${names.customerName} used ${formatAed(input.amount, input.currency)} of cashback in one go, processed by ${names.staffName} (your limit is ${formatAed(rule.threshold, input.currency)}).`,
    dedupeScope: `cashback-spend:${input.transactionId}`,
    metadata: { cashbackTransactionId: input.transactionId, amount: input.amount, threshold: rule.threshold },
  });
}

export async function earnCashback(input: {
  businessId: number;
  membershipId: number;
  branchId: number | null;
  actorUserId: number | null;
  billAmount: number;
  ratePercent: number;
  /** Staff-entered invoice number this cashback was issued against (required by callers). */
  invoiceNumber: string;
  currency: string;
  /** NULL / undefined = no cap. */
  maxBillAmount?: number | null;
  idempotencyKey?: string | null;
}): Promise<{ amount: number; balanceAfter: number }> {
  if (input.maxBillAmount != null && input.billAmount > input.maxBillAmount) {
    throw new CashbackError(
      `Amount paid exceeds the maximum of ${formatAed(input.maxBillAmount, input.currency)} per transaction.`,
    );
  }

  const amount = computeCashbackEarn(input.billAmount, input.ratePercent);
  if (amount <= 0) throw new CashbackError("That amount does not earn any cashback.");

  try {
    const walletResult = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "business_customer_memberships" WHERE id = ${input.membershipId} FOR UPDATE`;
      const locked = await tx.businessCustomerMembership.findUniqueOrThrow({
        where: { id: input.membershipId },
        select: { id: true, cashbackBalance: true, cashbackJoinedAt: true },
      });
      // Cashback is a program customers join; non-members cannot earn or spend.
      if (!locked.cashbackJoinedAt) throw new CashbackError(CASHBACK_NOT_JOINED_MESSAGE);
      const balanceAfter = applyCashbackDelta(Number(locked.cashbackBalance), amount);
      await tx.businessCustomerMembership.update({
        where: { id: locked.id },
        data: { cashbackBalance: balanceAfter },
      });
      const row = await tx.cashbackTransaction.create({
        data: {
          businessId: input.businessId,
          businessCustomerMembershipId: locked.id,
          branchId: input.branchId,
          type: "EARN",
          billAmount: input.billAmount,
          ratePercent: input.ratePercent,
          amount,
          balanceAfter,
          currency: input.currency,
          invoiceNumber: input.invoiceNumber,
          issuedByUserId: input.actorUserId,
          idempotencyKey: input.idempotencyKey ?? null,
        },
        select: { id: true },
      });
      await logAuditEvent({
        tx,
        actorUserId: input.actorUserId,
        businessId: input.businessId,
        branchId: input.branchId,
        action: "CASHBACK_EARNED",
        entityType: "cashback_transaction",
        entityId: row.id,
        metadata: { billAmount: input.billAmount, ratePercent: input.ratePercent, amount, balanceAfter, invoiceNumber: input.invoiceNumber },
      });
      await checkCashbackEarnAlerts(tx, { ...input, amount, transactionId: row.id });
      // A friend's first cashback purchase qualifies their referral and pays the referrer.
      const referral = await qualifyReferral({
        tx,
        businessId: input.businessId,
        referredMembershipId: locked.id,
        activity: { kind: "CASHBACK", cashbackTransactionId: row.id },
        branchId: input.branchId,
        currency: input.currency,
        now: new Date(),
      });
      return { amount, balanceAfter, rewardedMembershipIds: referral.cashbackMembershipIds.filter((id) => id !== locked.id) };
    });
    // Refresh the wallet cashback cards so the balance updates (the referrer's too, if paid).
    await syncGoogleWalletAfterCashbackChange(input.membershipId);
    await syncAppleWalletAfterCashbackChange(input.membershipId);
    for (const membershipId of walletResult.rewardedMembershipIds) {
      await syncGoogleWalletAfterCashbackChange(membershipId);
      await syncAppleWalletAfterCashbackChange(membershipId);
    }
    return { amount: walletResult.amount, balanceAfter: walletResult.balanceAfter };
  } catch (error) {
    if (isUniqueViolation(error)) throw new DuplicateCashbackError();
    throw error;
  }
}

export async function spendCashback(input: {
  businessId: number;
  membershipId: number;
  branchId: number | null;
  actorUserId: number | null;
  amount: number;
  currency: string;
  /** NULL / undefined = no cap. */
  maxRedemption?: number | null;
  idempotencyKey?: string | null;
}): Promise<{ balanceAfter: number }> {
  if (input.maxRedemption != null && input.amount > input.maxRedemption) {
    throw new CashbackError(
      `Redemption exceeds the maximum of ${formatAed(input.maxRedemption, input.currency)} per transaction.`,
    );
  }

  try {
    const walletResult = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "business_customer_memberships" WHERE id = ${input.membershipId} FOR UPDATE`;
      const locked = await tx.businessCustomerMembership.findUniqueOrThrow({
        where: { id: input.membershipId },
        select: { id: true, cashbackBalance: true, cashbackJoinedAt: true },
      });
      // Cashback is a program customers join; non-members cannot earn or spend.
      if (!locked.cashbackJoinedAt) throw new CashbackError(CASHBACK_NOT_JOINED_MESSAGE);
      const current = Number(locked.cashbackBalance);
      if (!canSpendCashback(current, input.amount)) {
        throw new CashbackError("Not enough cashback balance.");
      }
      const balanceAfter = applyCashbackDelta(current, -input.amount);
      await tx.businessCustomerMembership.update({
        where: { id: locked.id },
        data: { cashbackBalance: balanceAfter },
      });
      const row = await tx.cashbackTransaction.create({
        data: {
          businessId: input.businessId,
          businessCustomerMembershipId: locked.id,
          branchId: input.branchId,
          type: "SPEND",
          amount: input.amount,
          balanceAfter,
          currency: input.currency,
          issuedByUserId: input.actorUserId,
          idempotencyKey: input.idempotencyKey ?? null,
        },
        select: { id: true },
      });
      await logAuditEvent({
        tx,
        actorUserId: input.actorUserId,
        businessId: input.businessId,
        branchId: input.branchId,
        action: "CASHBACK_SPENT",
        entityType: "cashback_transaction",
        entityId: row.id,
        metadata: { amount: input.amount, balanceAfter },
      });
      await checkCashbackSpendAlert(tx, { ...input, transactionId: row.id });
      return { balanceAfter };
    });
    // Refresh the customer's Google Wallet passes so the cashback row updates.
    await syncGoogleWalletAfterCashbackChange(input.membershipId);
    await syncAppleWalletAfterCashbackChange(input.membershipId);
    return walletResult;
  } catch (error) {
    if (isUniqueViolation(error)) throw new DuplicateCashbackError();
    throw error;
  }
}
