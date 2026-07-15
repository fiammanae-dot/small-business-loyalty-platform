"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { BillingCycle, BusinessType, RecordStatus } from "@prisma/client";
import { validateCsrfForm } from "@/lib/csrf";
import { createFormFailure, getFirstZodMessage, getZodFieldErrors, type PreservedFormState } from "@/lib/form-state";
import { prisma } from "@/lib/prisma";
import { createDefaultAbusePolicies } from "@/lib/alert-engine";
import { logAuditEvent } from "@/lib/audit";
import { requireRole } from "@/lib/session";
import { getSubscriptionPeriodEnd, isBillingCycleSupported } from "@/lib/subscription-plans";

const colorSchema = z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/, "Use a hex color like #F97316.");

// Accepts uploaded logos (site-relative /uploads/logos/... paths), legacy
// absolute URLs saved before uploads existed, or empty (no logo).
const logoUrlSchema = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || value.startsWith("/uploads/logos/") || /^https?:\/\/\S+$/i.test(value),
    "Upload a logo image or provide a valid logo URL.",
  )
  .optional();

const createBusinessSchema = z.object({
  name: z.string().trim().min(1, "Business name is required."),
  businessType: z.enum([
    "COFFEE_SHOP",
    "RESTAURANT",
    "BARBERSHOP",
    "BEAUTY_SALON",
    "CAR_CARE_CENTER",
    "OTHER",
  ]),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  branchName: z.string().trim().min(1, "Branch name is required."),
  country: z.string().trim().min(1, "Country is required."),
  city: z.string().trim().min(1, "City is required."),
  address: z.string().trim().min(1, "Address is required."),
  ownerName: z.string().trim().min(1, "Owner name is required."),
  ownerEmail: z.string().trim().email("Owner email must be valid."),
  temporaryPassword: z.string().min(8, "Temporary password must be at least 8 characters."),
  subscriptionPlanId: z.coerce.number().int().positive("Subscription plan is required."),
  billingCycle: z.enum(["MONTHLY", "YEARLY"]),
  logoUrl: logoUrlSchema,
  primaryColor: colorSchema.default("#000000"),
  secondaryColor: colorSchema.default("#FFFFFF"),
  backgroundColor: colorSchema.default("#FFFFFF"),
  textColor: colorSchema.default("#111827"),
  buttonColor: colorSchema.default("#000000"),
  whatsappEnabled: z.boolean().default(false),
  smsEnabled: z.boolean().default(false),
  emailEnabled: z.boolean().default(false),
  preferredDefaultChannel: z.enum(["WHATSAPP", "SMS", "EMAIL", "NONE"]).default("NONE"),
  whatsappBusinessNumber: z.string().trim().optional(),
  senderEmail: z.string().trim().email("Sender email must be valid.").optional().or(z.literal("")),
  senderName: z.string().trim().optional(),
});

const archiveBusinessSchema = z.object({
  businessId: z.coerce.number().int().positive(),
  businessUuid: z.string().trim().min(1),
  archiveReason: z.string().trim().min(1, "A reason is required to archive a business."),
});

const updateBusinessSchema = z.object({
  businessId: z.coerce.number().int().positive(),
  name: z.string().trim().min(1, "Business name is required."),
  businessType: z.enum([
    "COFFEE_SHOP",
    "RESTAURANT",
    "BARBERSHOP",
    "BEAUTY_SALON",
    "CAR_CARE_CENTER",
    "OTHER",
  ]),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  subscriptionPlanId: z.coerce.number().int().positive("Subscription plan is required."),
  billingCycle: z.enum(["MONTHLY", "YEARLY"]),
  logoUrl: logoUrlSchema,
  primaryColor: colorSchema,
  secondaryColor: colorSchema,
  backgroundColor: colorSchema,
  textColor: colorSchema,
  buttonColor: colorSchema,
  whatsappEnabled: z.boolean().default(false),
  smsEnabled: z.boolean().default(false),
  emailEnabled: z.boolean().default(false),
  preferredDefaultChannel: z.enum(["WHATSAPP", "SMS", "EMAIL", "NONE"]).default("NONE"),
  whatsappBusinessNumber: z.string().trim().optional(),
  senderEmail: z.string().trim().email("Sender email must be valid.").optional().or(z.literal("")),
  senderName: z.string().trim().optional(),
});

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function redirectWithError(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function validateSecurity(formData: FormData, path: string) {
  try {
    validateCsrfForm(formData, "platform:businesses");
  } catch {
    redirectWithError(path, "Security check failed. Please refresh and try again.");
  }
}

const createBusinessFormFields = [
  "name",
  "businessType",
  "status",
  "branchName",
  "country",
  "city",
  "address",
  "ownerName",
  "ownerEmail",
  "temporaryPassword",
  "subscriptionPlanId",
  "billingCycle",
  "logoUrl",
  "primaryColor",
  "secondaryColor",
  "backgroundColor",
  "textColor",
  "buttonColor",
  "whatsappEnabled",
  "smsEnabled",
  "emailEnabled",
  "preferredDefaultChannel",
  "whatsappBusinessNumber",
  "senderEmail",
  "senderName",
];

function createBusinessFailure(formData: FormData, message: string, fieldErrors?: Record<string, string>): PreservedFormState {
  return createFormFailure({
    formData,
    fields: createBusinessFormFields,
    checkboxFields: ["whatsappEnabled", "smsEnabled", "emailEnabled"],
    passwordFields: ["temporaryPassword"],
    message,
    fieldErrors,
  });
}

export async function createBusinessAction(_prevState: PreservedFormState, formData: FormData): Promise<PreservedFormState> {
  try {
    validateCsrfForm(formData, "platform:businesses");
  } catch {
    return createBusinessFailure(formData, "Security check failed. Please refresh and try again.");
  }
  const platformUser = await requireRole("PLATFORM_OWNER");

  const parsed = createBusinessSchema.safeParse({
    name: getString(formData, "name"),
    businessType: getString(formData, "businessType"),
    status: getString(formData, "status"),
    branchName: getString(formData, "branchName"),
    country: getString(formData, "country"),
    city: getString(formData, "city"),
    address: getString(formData, "address"),
    ownerName: getString(formData, "ownerName"),
    ownerEmail: getString(formData, "ownerEmail").toLowerCase(),
    temporaryPassword: getString(formData, "temporaryPassword"),
    subscriptionPlanId: getString(formData, "subscriptionPlanId"),
    billingCycle: getString(formData, "billingCycle") || "YEARLY",
    logoUrl: getString(formData, "logoUrl"),
    primaryColor: getString(formData, "primaryColor") || "#000000",
    secondaryColor: getString(formData, "secondaryColor") || "#FFFFFF",
    backgroundColor: getString(formData, "backgroundColor") || "#FFFFFF",
    textColor: getString(formData, "textColor") || "#111827",
    buttonColor: getString(formData, "buttonColor") || "#000000",
    whatsappEnabled: formData.has("whatsappEnabled"),
    smsEnabled: formData.has("smsEnabled"),
    emailEnabled: formData.has("emailEnabled"),
    preferredDefaultChannel: getString(formData, "preferredDefaultChannel") || "NONE",
    whatsappBusinessNumber: getString(formData, "whatsappBusinessNumber"),
    senderEmail: getString(formData, "senderEmail"),
    senderName: getString(formData, "senderName"),
  });

  if (!parsed.success) {
    return createBusinessFailure(formData, getFirstZodMessage(parsed.error), getZodFieldErrors(parsed.error));
  }

  const data = parsed.data;
  const ownerExists = await prisma.user.findUnique({
    where: { email: data.ownerEmail },
    select: { id: true },
  });

  if (ownerExists) {
    return createBusinessFailure(formData, "Owner email is already in use.", { ownerEmail: "Owner email is already in use." });
  }

  const plan = await prisma.subscriptionPlan.findUnique({
    where: { id: data.subscriptionPlanId },
    select: { id: true, code: true, billingCycleSupport: true },
  });

  if (!plan) {
    return createBusinessFailure(formData, "Subscription plan is required.", { subscriptionPlanId: "Subscription plan is required." });
  }

  if (!isBillingCycleSupported(plan, data.billingCycle as BillingCycle)) {
    return createBusinessFailure(formData, "Selected billing cycle is not supported by this plan.", { billingCycle: "Selected billing cycle is not supported by this plan." });
  }

  const passwordHash = await bcrypt.hash(data.temporaryPassword, 12);

  const business = await prisma.$transaction(async (tx) => {
    const createdBusiness = await tx.business.create({
      data: {
        name: data.name,
        businessType: data.businessType as BusinessType,
        status: data.status as RecordStatus,
      },
    });

    const branch = await tx.branch.create({
      data: {
        businessId: createdBusiness.id,
        name: data.branchName,
        country: data.country,
        city: data.city,
        address: data.address,
        status: data.status as RecordStatus,
      },
    });

    await tx.businessBranding.create({
      data: {
        businessId: createdBusiness.id,
        logoUrl: data.logoUrl || null,
        primaryColor: data.primaryColor,
        secondaryColor: data.secondaryColor,
        backgroundColor: data.backgroundColor,
        textColor: data.textColor,
        buttonColor: data.buttonColor,
      },
    });

    await tx.businessCommunicationSettings.create({
      data: {
        businessId: createdBusiness.id,
        whatsappEnabled: data.whatsappEnabled,
        smsEnabled: data.smsEnabled,
        emailEnabled: data.emailEnabled,
        preferredDefaultChannel: data.preferredDefaultChannel,
        whatsappBusinessNumber: data.whatsappBusinessNumber || null,
        senderEmail: data.senderEmail || null,
        senderName: data.senderName || null,
      },
    });

    await createDefaultAbusePolicies(tx, createdBusiness.id);

    const now = new Date();
    const renewalDate = getSubscriptionPeriodEnd(now, data.billingCycle as BillingCycle);

    const subscription = await tx.businessSubscription.create({
      data: {
        businessId: createdBusiness.id,
        subscriptionPlanId: data.subscriptionPlanId,
        billingCycle: data.billingCycle as BillingCycle,
        status: "ACTIVE",
        startDate: now,
        expiryDate: renewalDate,
        renewalDate,
      },
    });

    await tx.subscriptionAuditLog.create({
      data: {
        businessId: createdBusiness.id,
        businessSubscriptionId: subscription.id,
        userId: platformUser.id,
        action: "STATUS_CHANGED",
        previousValue: null,
        newValue: "ACTIVE",
      },
    });

    await tx.user.create({
      data: {
        name: data.ownerName,
        email: data.ownerEmail,
        passwordHash,
        role: "BUSINESS_OWNER",
        businessId: createdBusiness.id,
        branchId: branch.id,
        status: "ACTIVE",
      },
    });

    return createdBusiness;
  });

  revalidatePath("/platform");
  revalidatePath("/platform/businesses");
  revalidatePath("/platform/users");
  redirect(`/platform/businesses/${business.uuid}`);
}

export async function updateBusinessAction(formData: FormData) {
  validateSecurity(formData, "/platform/businesses");
  const platformUser = await requireRole("PLATFORM_OWNER");
  const businessUuid = getString(formData, "businessUuid");

  const parsed = updateBusinessSchema.safeParse({
    businessId: getString(formData, "businessId"),
    name: getString(formData, "name"),
    businessType: getString(formData, "businessType"),
    status: getString(formData, "status"),
    subscriptionPlanId: getString(formData, "subscriptionPlanId"),
    billingCycle: getString(formData, "billingCycle") || "YEARLY",
    logoUrl: getString(formData, "logoUrl"),
    primaryColor: getString(formData, "primaryColor"),
    secondaryColor: getString(formData, "secondaryColor"),
    backgroundColor: getString(formData, "backgroundColor"),
    textColor: getString(formData, "textColor"),
    buttonColor: getString(formData, "buttonColor"),
    whatsappEnabled: formData.has("whatsappEnabled"),
    smsEnabled: formData.has("smsEnabled"),
    emailEnabled: formData.has("emailEnabled"),
    preferredDefaultChannel: getString(formData, "preferredDefaultChannel") || "NONE",
    whatsappBusinessNumber: getString(formData, "whatsappBusinessNumber"),
    senderEmail: getString(formData, "senderEmail"),
    senderName: getString(formData, "senderName"),
  });

  if (!parsed.success) {
    redirectWithError(
      `/platform/businesses/${businessUuid}/edit`,
      parsed.error.issues[0]?.message ?? "Validation failed.",
    );
  }

  const data = parsed.data;
  const plan = await prisma.subscriptionPlan.findUnique({
    where: { id: data.subscriptionPlanId },
    select: { id: true, code: true, billingCycleSupport: true },
  });

  if (!plan) {
    redirectWithError(`/platform/businesses/${businessUuid}/edit`, "Subscription plan is required.");
  }

  if (!isBillingCycleSupported(plan, data.billingCycle as BillingCycle)) {
    redirectWithError(`/platform/businesses/${businessUuid}/edit`, "Selected billing cycle is not supported by this plan.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.business.update({
      where: { id: data.businessId },
      data: {
        name: data.name,
        businessType: data.businessType,
        status: data.status,
      },
    });

    await tx.businessBranding.upsert({
      where: { businessId: data.businessId },
      update: {
        logoUrl: data.logoUrl || null,
        primaryColor: data.primaryColor,
        secondaryColor: data.secondaryColor,
        backgroundColor: data.backgroundColor,
        textColor: data.textColor,
        buttonColor: data.buttonColor,
      },
      create: {
        businessId: data.businessId,
        logoUrl: data.logoUrl || null,
        primaryColor: data.primaryColor,
        secondaryColor: data.secondaryColor,
        backgroundColor: data.backgroundColor,
        textColor: data.textColor,
        buttonColor: data.buttonColor,
      },
    });

    await tx.businessCommunicationSettings.upsert({
      where: { businessId: data.businessId },
      update: {
        whatsappEnabled: data.whatsappEnabled,
        smsEnabled: data.smsEnabled,
        emailEnabled: data.emailEnabled,
        preferredDefaultChannel: data.preferredDefaultChannel,
        whatsappBusinessNumber: data.whatsappBusinessNumber || null,
        senderEmail: data.senderEmail || null,
        senderName: data.senderName || null,
      },
      create: {
        businessId: data.businessId,
        whatsappEnabled: data.whatsappEnabled,
        smsEnabled: data.smsEnabled,
        emailEnabled: data.emailEnabled,
        preferredDefaultChannel: data.preferredDefaultChannel,
        whatsappBusinessNumber: data.whatsappBusinessNumber || null,
        senderEmail: data.senderEmail || null,
        senderName: data.senderName || null,
      },
    });

    const currentSubscription = await tx.businessSubscription.findFirst({
      where: { businessId: data.businessId, status: { in: ["TRIAL", "ACTIVE"] } },
      orderBy: { createdAt: "desc" },
      select: { id: true, subscriptionPlanId: true, billingCycle: true },
    });

    if (!currentSubscription) {
      const now = new Date();
      const periodEnd = getSubscriptionPeriodEnd(now, data.billingCycle as BillingCycle);
      const createdSubscription = await tx.businessSubscription.create({
        data: {
          businessId: data.businessId,
          subscriptionPlanId: data.subscriptionPlanId,
          billingCycle: data.billingCycle as BillingCycle,
          status: "ACTIVE",
          startDate: now,
          expiryDate: periodEnd,
          renewalDate: periodEnd,
        },
      });
      await tx.subscriptionAuditLog.create({
        data: {
          businessId: data.businessId,
          businessSubscriptionId: createdSubscription.id,
          userId: platformUser.id,
          action: "STATUS_CHANGED",
          previousValue: null,
          newValue: "ACTIVE",
        },
      });
    } else if (currentSubscription.subscriptionPlanId !== data.subscriptionPlanId || currentSubscription.billingCycle !== data.billingCycle) {
      await tx.businessSubscription.update({
        where: { id: currentSubscription.id },
        data: { status: "CANCELLED", endDate: new Date() },
      });
      await tx.subscriptionAuditLog.create({
        data: {
          businessId: data.businessId,
          businessSubscriptionId: currentSubscription.id,
          userId: platformUser.id,
          action: "PLAN_CHANGED",
          previousValue: `${currentSubscription.subscriptionPlanId}:${currentSubscription.billingCycle}`,
          newValue: `${data.subscriptionPlanId}:${data.billingCycle}`,
        },
      });
      const now = new Date();
      const periodEnd = getSubscriptionPeriodEnd(now, data.billingCycle as BillingCycle);
      const newSubscription = await tx.businessSubscription.create({
        data: {
          businessId: data.businessId,
          subscriptionPlanId: data.subscriptionPlanId,
          billingCycle: data.billingCycle as BillingCycle,
          status: "ACTIVE",
          startDate: now,
          expiryDate: periodEnd,
          renewalDate: periodEnd,
        },
      });
      await tx.subscriptionAuditLog.create({
        data: {
          businessId: data.businessId,
          businessSubscriptionId: newSubscription.id,
          userId: platformUser.id,
          action: "STATUS_CHANGED",
          previousValue: null,
          newValue: "ACTIVE",
        },
      });
    }
  });

  revalidatePath("/platform/businesses");
  revalidatePath(`/platform/businesses/${businessUuid}`);
  redirect(`/platform/businesses/${businessUuid}`);
}

export async function toggleBusinessStatusAction(formData: FormData) {
  validateSecurity(formData, "/platform/businesses");
  await requireRole("PLATFORM_OWNER");
  const businessUuid = getString(formData, "businessUuid");
  const businessId = Number(getString(formData, "businessId"));
  const nextStatus = getString(formData, "nextStatus") as RecordStatus;

  if (!businessId || !["ACTIVE", "INACTIVE"].includes(nextStatus)) {
    redirect("/platform/businesses");
  }

  await prisma.$transaction(async (tx) => {
    await tx.business.update({
      where: { id: businessId },
      data: { status: nextStatus },
    });

    if (nextStatus === "INACTIVE") {
      await tx.user.updateMany({
        where: {
          businessId,
          role: { in: ["BUSINESS_OWNER", "BRANCH_MANAGER", "STAFF"] },
        },
        data: { sessionVersion: { increment: 1 } },
      });
    }
  });

  revalidatePath("/platform/businesses");
  revalidatePath(`/platform/businesses/${businessUuid}`);
  redirect(`/platform/businesses?success=Business ${nextStatus === "ACTIVE" ? "enabled" : "disabled"}.`);
}

// Soft delete: archiving marks the business row instead of deleting it, so AuditEvent
// history and subscription/invoice/customer records are preserved untouched.
export async function archiveBusinessAction(formData: FormData) {
  const businessUuid = getString(formData, "businessUuid");
  validateSecurity(formData, `/platform/businesses/${businessUuid}`);
  const platformUser = await requireRole("PLATFORM_OWNER");

  const parsed = archiveBusinessSchema.safeParse({
    businessId: getString(formData, "businessId"),
    businessUuid,
    archiveReason: getString(formData, "archiveReason"),
  });

  if (!parsed.success) {
    redirectWithError(`/platform/businesses/${businessUuid}`, parsed.error.issues[0]?.message ?? "A reason is required to archive a business.");
  }

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.business.update({
      where: { id: parsed.data.businessId },
      data: {
        status: "ARCHIVED",
        deletedAt: now,
        archivedAt: now,
        archivedById: platformUser.id,
        archiveReason: parsed.data.archiveReason,
      },
    });

    await tx.user.updateMany({
      where: {
        businessId: parsed.data.businessId,
        role: { in: ["BUSINESS_OWNER", "BRANCH_MANAGER", "STAFF"] },
      },
      data: { sessionVersion: { increment: 1 } },
    });

    await logAuditEvent({
      tx,
      actorUserId: platformUser.id,
      businessId: parsed.data.businessId,
      action: "BUSINESS_ARCHIVED",
      entityType: "Business",
      entityId: parsed.data.businessId,
      metadata: { reason: parsed.data.archiveReason },
    });
  });

  revalidatePath("/platform/businesses");
  revalidatePath(`/platform/businesses/${businessUuid}`);
  redirect(`/platform/businesses?success=${encodeURIComponent("Business archived.")}`);
}

export async function restoreBusinessAction(formData: FormData) {
  const businessUuid = getString(formData, "businessUuid");
  validateSecurity(formData, `/platform/businesses/${businessUuid}`);
  const platformUser = await requireRole("PLATFORM_OWNER");
  const businessId = Number(getString(formData, "businessId"));

  if (!businessId) {
    redirect("/platform/businesses");
  }

  await prisma.$transaction(async (tx) => {
    await tx.business.update({
      where: { id: businessId },
      data: {
        // Restored businesses come back INACTIVE, not ACTIVE: an admin must deliberately
        // re-enable customer-facing access via the existing Enable/Disable control rather
        // than a restore silently reopening the business to staff and customers.
        status: "INACTIVE",
        deletedAt: null,
        archivedAt: null,
        archivedById: null,
        archiveReason: null,
      },
    });

    await logAuditEvent({
      tx,
      actorUserId: platformUser.id,
      businessId,
      action: "BUSINESS_RESTORED",
      entityType: "Business",
      entityId: businessId,
    });
  });

  revalidatePath("/platform/businesses");
  revalidatePath(`/platform/businesses/${businessUuid}`);
  redirect(`/platform/businesses/${businessUuid}?success=${encodeURIComponent("Business restored. It is now inactive until re-enabled.")}`);
}
