"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { InvoiceStatus, PaymentMethod } from "@prisma/client";
import { validateCsrfForm } from "@/lib/csrf";
import { blockDemoModeExternalAction } from "@/lib/platform-settings";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { paymentMethods } from "@/lib/billing";

const paymentSchema = z.object({
  invoiceUuid: z.string().uuid(),
  amount: z.coerce.number().positive("Payment amount must be greater than zero."),
  currency: z.string().trim().min(1, "Currency is required.").max(3, "Use a 3-letter currency code."),
  paymentMethod: z.enum(paymentMethods),
  paymentReference: z.string().trim().optional(),
  paidAt: z.string().trim().min(1, "Paid at is required."),
  notes: z.string().trim().optional(),
});

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function validateSecurity(formData: FormData, path: string) {
  try {
    validateCsrfForm(formData, "platform:invoices");
  } catch {
    fail(path, "Security check failed. Please refresh and try again.");
  }
}

export async function updateInvoiceStatusAction(formData: FormData) {
  validateSecurity(formData, "/platform/invoices");
  const user = await requireRole("PLATFORM_OWNER");
  const invoiceUuid = getString(formData, "invoiceUuid");
  const nextStatus = getString(formData, "nextStatus") as InvoiceStatus;
  const path = invoiceUuid ? `/platform/invoices/${invoiceUuid}` : "/platform/invoices";

  if (!invoiceUuid || !["ISSUED", "PAID", "CANCELLED"].includes(nextStatus)) {
    fail(path, "Invoice action is invalid.");
  }

  const invoice = await prisma.invoice.findUnique({
    where: { uuid: invoiceUuid },
    select: { id: true, businessId: true, status: true },
  });
  if (!invoice) fail("/platform/invoices", "Invoice not found.");
  if (invoice.status === "CANCELLED") fail(path, "Cancelled invoices cannot be changed.");
  if (nextStatus === "PAID") {
    const blocked = await blockDemoModeExternalAction({
      actorUserId: user.id,
      businessId: invoice.businessId,
      attemptedAction: "INVOICE_MARK_PAID",
      entityType: "invoice",
      entityId: invoice.id,
      metadata: { invoiceUuid, previousStatus: invoice.status, nextStatus },
    });
    if (blocked) {
      fail(path, "Safety Mode is active. Payment processing is restricted.");
    }
  }

  const action = nextStatus === "ISSUED" ? "INVOICE_ISSUED" : nextStatus === "PAID" ? "INVOICE_PAID" : "INVOICE_CANCELLED";

  await prisma.$transaction([
    prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: nextStatus },
    }),
    prisma.invoiceAuditLog.create({
      data: {
        invoiceId: invoice.id,
        businessId: invoice.businessId,
        userId: user.id,
        action,
        previousStatus: invoice.status,
        newStatus: nextStatus,
      },
    }),
  ]);

  revalidatePath("/platform/invoices");
  revalidatePath(path);
  redirect(`${path}?success=Invoice updated.`);
}

export async function recordPaymentAction(formData: FormData) {
  validateSecurity(formData, `/platform/invoices/${getString(formData, "invoiceUuid")}`);
  const user = await requireRole("PLATFORM_OWNER");
  const parsed = paymentSchema.safeParse({
    invoiceUuid: getString(formData, "invoiceUuid"),
    amount: getString(formData, "amount"),
    currency: getString(formData, "currency") || "AED",
    paymentMethod: getString(formData, "paymentMethod"),
    paymentReference: getString(formData, "paymentReference"),
    paidAt: getString(formData, "paidAt"),
    notes: getString(formData, "notes"),
  });
  const path = `/platform/invoices/${getString(formData, "invoiceUuid")}`;
  if (!parsed.success) fail(path, parsed.error.issues[0]?.message ?? "Validation failed.");

  const data = parsed.data;
  const invoice = await prisma.invoice.findUnique({
    where: { uuid: data.invoiceUuid },
    include: { payments: { select: { amount: true } } },
  });
  if (!invoice) fail("/platform/invoices", "Invoice not found.");
  if (invoice.status === "CANCELLED") fail(path, "Cancelled invoices cannot receive payments.");
  const blocked = await blockDemoModeExternalAction({
    actorUserId: user.id,
    businessId: invoice.businessId,
    attemptedAction: "PAYMENT_RECORDED",
    entityType: "invoice",
    entityId: invoice.id,
    metadata: { invoiceUuid: data.invoiceUuid, paymentMethod: data.paymentMethod, amount: data.amount, currency: data.currency.toUpperCase() },
  });
  if (blocked) {
    fail(path, "Safety Mode is active. Payment processing is restricted.");
  }

  const existingPaid = invoice.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const nextPaid = existingPaid + data.amount;
  const nextStatus: InvoiceStatus = nextPaid >= Number(invoice.amount) ? "PAID" : "ISSUED";

  await prisma.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        businessId: invoice.businessId,
        invoiceId: invoice.id,
        amount: data.amount,
        currency: data.currency.toUpperCase(),
        paymentMethod: data.paymentMethod as PaymentMethod,
        paymentReference: data.paymentReference || null,
        paidAt: new Date(data.paidAt),
        recordedByUserId: user.id,
        notes: data.notes || null,
      },
    });

    await tx.invoiceAuditLog.create({
      data: {
        invoiceId: invoice.id,
        businessId: invoice.businessId,
        userId: user.id,
        action: "PAYMENT_RECORDED",
        previousStatus: invoice.status,
        newStatus: nextStatus,
        notes: `Payment recorded: ${data.currency.toUpperCase()} ${data.amount.toFixed(2)}`,
      },
    });

    if (invoice.status !== nextStatus) {
      await tx.invoice.update({
        where: { id: invoice.id },
        data: { status: nextStatus },
      });

      if (nextStatus === "PAID") {
        await tx.invoiceAuditLog.create({
          data: {
            invoiceId: invoice.id,
            businessId: invoice.businessId,
            userId: user.id,
            action: "INVOICE_PAID",
            previousStatus: invoice.status,
            newStatus: "PAID",
          },
        });
      }
    }
  });

  revalidatePath("/platform/invoices");
  revalidatePath(path);
  redirect(`${path}?success=Payment recorded.`);
}
