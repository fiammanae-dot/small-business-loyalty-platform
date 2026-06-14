"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { BusinessType, RecordStatus } from "@prisma/client";
import { validateCsrfForm } from "@/lib/csrf";
import { prisma } from "@/lib/prisma";
import { createDefaultAbusePolicies } from "@/lib/alert-engine";
import { requireRole } from "@/lib/session";

const colorSchema = z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/, "Use a hex color like #F97316.");

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
  logoUrl: z.string().trim().url("Logo URL must be valid.").optional().or(z.literal("")),
  primaryColor: colorSchema.default("#F97316"),
  secondaryColor: colorSchema.default("#FDBA74"),
  backgroundColor: colorSchema.default("#FFFFFF"),
  textColor: colorSchema.default("#111827"),
  buttonColor: colorSchema.default("#F97316"),
  whatsappEnabled: z.boolean().default(false),
  smsEnabled: z.boolean().default(false),
  emailEnabled: z.boolean().default(false),
  preferredDefaultChannel: z.enum(["WHATSAPP", "SMS", "EMAIL", "NONE"]).default("NONE"),
  whatsappBusinessNumber: z.string().trim().optional(),
  senderEmail: z.string().trim().email("Sender email must be valid.").optional().or(z.literal("")),
  senderName: z.string().trim().optional(),
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
  logoUrl: z.string().trim().url("Logo URL must be valid.").optional().or(z.literal("")),
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

export async function createBusinessAction(formData: FormData) {
  validateSecurity(formData, "/platform/businesses/new");
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
    logoUrl: getString(formData, "logoUrl"),
    primaryColor: getString(formData, "primaryColor") || "#F97316",
    secondaryColor: getString(formData, "secondaryColor") || "#FDBA74",
    backgroundColor: getString(formData, "backgroundColor") || "#FFFFFF",
    textColor: getString(formData, "textColor") || "#111827",
    buttonColor: getString(formData, "buttonColor") || "#F97316",
    whatsappEnabled: formData.has("whatsappEnabled"),
    smsEnabled: formData.has("smsEnabled"),
    emailEnabled: formData.has("emailEnabled"),
    preferredDefaultChannel: getString(formData, "preferredDefaultChannel") || "NONE",
    whatsappBusinessNumber: getString(formData, "whatsappBusinessNumber"),
    senderEmail: getString(formData, "senderEmail"),
    senderName: getString(formData, "senderName"),
  });

  if (!parsed.success) {
    redirectWithError("/platform/businesses/new", parsed.error.issues[0]?.message ?? "Validation failed.");
  }

  const data = parsed.data;
  const ownerExists = await prisma.user.findUnique({
    where: { email: data.ownerEmail },
    select: { id: true },
  });

  if (ownerExists) {
    redirectWithError("/platform/businesses/new", "Owner email is already in use.");
  }

  const plan = await prisma.subscriptionPlan.findUnique({
    where: { id: data.subscriptionPlanId },
    select: { id: true },
  });

  if (!plan) {
    redirectWithError("/platform/businesses/new", "Subscription plan is required.");
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
    const renewalDate = new Date(now);
    renewalDate.setFullYear(now.getFullYear() + 1);

    const subscription = await tx.businessSubscription.create({
      data: {
        businessId: createdBusiness.id,
        subscriptionPlanId: data.subscriptionPlanId,
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
    select: { id: true },
  });

  if (!plan) {
    redirectWithError(`/platform/businesses/${businessUuid}/edit`, "Subscription plan is required.");
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
      select: { id: true, subscriptionPlanId: true },
    });

    if (!currentSubscription) {
      const createdSubscription = await tx.businessSubscription.create({
        data: {
          businessId: data.businessId,
          subscriptionPlanId: data.subscriptionPlanId,
          status: "ACTIVE",
          startDate: new Date(),
          expiryDate: oneYearFromNow(),
          renewalDate: oneYearFromNow(),
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
    } else if (currentSubscription.subscriptionPlanId !== data.subscriptionPlanId) {
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
          previousValue: currentSubscription.subscriptionPlanId.toString(),
          newValue: data.subscriptionPlanId.toString(),
        },
      });
      const newSubscription = await tx.businessSubscription.create({
        data: {
          businessId: data.businessId,
          subscriptionPlanId: data.subscriptionPlanId,
          status: "ACTIVE",
          startDate: new Date(),
          expiryDate: oneYearFromNow(),
          renewalDate: oneYearFromNow(),
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

function oneYearFromNow() {
  const now = new Date();
  now.setFullYear(now.getFullYear() + 1);
  return now;
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

  await prisma.business.update({
    where: { id: businessId },
    data: { status: nextStatus },
  });

  revalidatePath("/platform/businesses");
  revalidatePath(`/platform/businesses/${businessUuid}`);
}
