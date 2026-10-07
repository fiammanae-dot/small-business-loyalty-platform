import "server-only";

import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { applyCashbackDelta, canSpendCashback, computeCashbackEarn, formatAed } from "@/lib/cashback";
import { syncGoogleWalletAfterCashbackChange } from "@/lib/google-wallet/service";
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
        select: { id: true, cashbackBalance: true },
      });
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
      return { amount, balanceAfter };
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
        select: { id: true, cashbackBalance: true },
      });
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
