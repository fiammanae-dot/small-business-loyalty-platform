"use server";

import bcrypt from "bcryptjs";
import { randomInt } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { BusinessType, RecordStatus, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { requireBusinessOwner } from "@/lib/business-owner";
import { validateCsrfForm } from "@/lib/csrf";
import { requireUsableSubscription } from "@/lib/commercial-access";
import { createFormFailure, isFormActionError, type PreservedFormState } from "@/lib/form-state";
import { commerciallyUsableStatuses, limitReachedMessage } from "@/lib/subscriptions";
import {
  customerIdentitySchema,
  customerMembershipSchema,
  enrollCustomerForBusiness,
  getCheckbox,
  getString as getCustomerString,
  parseBirthday,
} from "@/lib/customers";
import { normalizePhone } from "@/lib/phone";

const profileSchema = z.object({
  name: z.string().trim().min(1, "Business name is required."),
  businessType: z.enum([
    "COFFEE_SHOP",
    "RESTAURANT",
    "BARBERSHOP",
    "BEAUTY_SALON",
    "CAR_CARE_CENTER",
    "OTHER",
  ]),
});

const branchSchema = z.object({
  branchId: z.coerce.number().int().positive().optional(),
  name: z.string().trim().min(1, "Branch name is required."),
  country: z.string().trim().min(1, "Country is required."),
  city: z.string().trim().min(1, "City is required."),
  address: z.string().trim().min(1, "Address is required."),
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

const staffSchema = z.object({
  name: z.string().trim().min(1, "Staff name is required."),
  email: z.string().trim().email("Staff email is required."),
  password: z.string().min(8, "Staff password is required."),
  role: z.enum(["BRANCH_MANAGER", "STAFF"]),
  branchId: z.coerce.number().int().positive("Assigned branch is required."),
});

const staffPasswordResetSchema = z.object({
  staffUserId: z.coerce.number().int().positive("Staff user not found."),
});

const cooldownRuleSchema = z.object({
  minimumMinutesBetweenStamps: z.coerce.number().int().min(0, "Minimum minutes cannot be negative."),
  maximumStampsPerTransaction: z.coerce.number().int().min(1, "Maximum stamps must be at least 1.").max(5, "Maximum stamps cannot exceed 5."),
  maximumStampsPerCustomerPerDay: z.coerce.number().int().min(1).optional(),
  maximumStampsPerStaffPerDay: z.coerce.number().int().min(1).optional(),
  generateAlert: z.boolean(),
});

const abusePolicySchema = z.object({
  policyId: z.coerce.number().int().positive("Policy not found."),
  thresholdValue: z.coerce.number().int().min(0, "Threshold cannot be negative."),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  enabled: z.boolean(),
});

const scannerSettingsSchema = z.object({
  soundEffectsEnabled: z.boolean(),
});

const customerTierSettingsSchema = z
  .object({
    tierQualificationWindow: z.enum(["LIFETIME", "DAYS_30", "DAYS_60", "DAYS_90", "MONTHS_12"]),
    tierMaintenanceMode: z.enum(["PERMANENT", "DYNAMIC"]),
    silverVisitRequirement: z.coerce.number().int().positive("Silver visits must be greater than 0."),
    goldVisitRequirement: z.coerce.number().int().positive("Gold visits must be greater than 0."),
    vipVisitRequirement: z.coerce.number().int().positive("VIP visits must be greater than 0."),
  })
  .superRefine((data, ctx) => {
    if (data.goldVisitRequirement <= data.silverVisitRequirement) {
      ctx.addIssue({ code: "custom", path: ["goldVisitRequirement"], message: "Gold visits must be greater than Silver visits." });
    }
    if (data.vipVisitRequirement <= data.goldVisitRequirement) {
      ctx.addIssue({ code: "custom", path: ["vipVisitRequirement"], message: "VIP visits must be greater than Gold visits." });
    }
  });

const manualStampCorrectionSchema = z
  .object({
    membershipUuid: z.string().uuid("Customer not found."),
    programMembershipUuid: z.string().uuid("Program membership not found."),
    adjustment: z.coerce.number().int().min(-50, "Correction is too large.").max(50, "Correction is too large."),
    reason: z.string().trim().min(5, "Correction reason is required.").max(500, "Correction reason is too long."),
  })
  .refine((data) => data.adjustment !== 0, {
    message: "Correction must add or remove at least 1 stamp.",
    path: ["adjustment"],
  });

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function validateActionSecurity(formData: FormData, scope: string, path: string) {
  try {
    validateCsrfForm(formData, scope);
  } catch {
    fail(path, "Security check failed. Please refresh and try again.");
  }
}

const customerCreateFormFields = [
  "firstName",
  "lastName",
  "phone",
  "email",
  "birthday",
  "createdBranchId",
  "marketingConsent",
  "selectedProgramUuid",
  "referredBySearch",
  "referredByPhoneNumber",
  "referralCode",
  "notes",
];

function customerCreateFailure(formData: FormData, message: string, fieldErrors?: Record<string, string>): PreservedFormState {
  return createFormFailure({
    formData,
    fields: customerCreateFormFields,
    checkboxFields: ["marketingConsent"],
    message,
    fieldErrors,
  });
}

function generateTemporaryPassword() {
  const groups = [
    "ABCDEFGHJKLMNPQRSTUVWXYZ",
    "abcdefghijkmnopqrstuvwxyz",
    "23456789",
    "!@#$%^&*",
  ];
  const allCharacters = groups.join("");
  const characters = [
    ...groups.map((group) => group[randomInt(group.length)]),
    ...Array.from({ length: 12 }, () => allCharacters[randomInt(allCharacters.length)]),
  ];

  for (let index = characters.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1);
    [characters[index], characters[swapIndex]] = [characters[swapIndex], characters[index]];
  }

  return characters.join("");
}

export async function updateBusinessProfileAction(formData: FormData) {
  validateActionSecurity(formData, "dashboard:business-profile", "/dashboard/profile");
  const user = await requireBusinessOwner();
  const parsed = profileSchema.safeParse({
    name: getString(formData, "name"),
    businessType: getString(formData, "businessType"),
  });

  if (!parsed.success) fail("/dashboard/profile", parsed.error.issues[0]?.message ?? "Validation failed.");

  await prisma.business.update({
    where: { id: user.businessId },
    data: {
      name: parsed.data.name,
      businessType: parsed.data.businessType as BusinessType,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/profile");
  redirect("/dashboard/profile?success=Business profile updated.");
}

export async function saveBranchAction(formData: FormData) {
  validateActionSecurity(formData, "dashboard:branches", "/dashboard/branches");
  const user = await requireBusinessOwner();
  await requireUsableSubscription(user.businessId).catch((error) => fail("/dashboard/branches", error.message));
  const parsed = branchSchema.safeParse({
    branchId: getString(formData, "branchId") || undefined,
    name: getString(formData, "name"),
    country: getString(formData, "country"),
    city: getString(formData, "city"),
    address: getString(formData, "address"),
    status: getString(formData, "status") || "ACTIVE",
  });

  if (!parsed.success) fail("/dashboard/branches", parsed.error.issues[0]?.message ?? "Validation failed.");

  const data = parsed.data;
  const activePlan = await prisma.businessSubscription.findFirst({
    where: { businessId: user.businessId, status: { in: commerciallyUsableStatuses } },
    orderBy: { createdAt: "desc" },
    include: { subscriptionPlan: true },
  });
  const maxBranches = activePlan?.subscriptionPlan.maxBranches ?? 1;

  if (data.branchId) {
    const branch = await prisma.branch.findFirst({
      where: { id: data.branchId, businessId: user.businessId },
      select: { id: true },
    });
    if (!branch) fail("/dashboard/branches", "Branch not found.");

    await prisma.branch.update({
      where: { id: data.branchId },
      data: {
        name: data.name,
        country: data.country,
        city: data.city,
        address: data.address,
        status: data.status as RecordStatus,
      },
    });
    await logAuditEvent({
      actorUserId: user.id,
      businessId: user.businessId,
      branchId: data.branchId,
      action: "BRANCH_UPDATED",
      entityType: "branch",
      entityId: data.branchId,
      metadata: { status: data.status },
    });
  } else {
    const branchCount = await prisma.branch.count({ where: { businessId: user.businessId } });
    if (branchCount >= maxBranches) {
      fail("/dashboard/branches", limitReachedMessage("branch", maxBranches));
    }

    const createdBranch = await prisma.branch.create({
      data: {
        businessId: user.businessId,
        name: data.name,
        country: data.country,
        city: data.city,
        address: data.address,
        status: data.status as RecordStatus,
      },
      select: { id: true },
    });
    await logAuditEvent({
      actorUserId: user.id,
      businessId: user.businessId,
      branchId: createdBranch.id,
      action: "BRANCH_CREATED",
      entityType: "branch",
      entityId: createdBranch.id,
      metadata: { status: data.status },
    });
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/branches");
  redirect("/dashboard/branches?success=Branch saved.");
}

export async function toggleBranchStatusAction(formData: FormData) {
  validateActionSecurity(formData, "dashboard:branches", "/dashboard/branches");
  const user = await requireBusinessOwner();
  const branchId = Number(getString(formData, "branchId"));
  const nextStatus = getString(formData, "nextStatus") as RecordStatus;

  if (!branchId || !["ACTIVE", "INACTIVE"].includes(nextStatus)) {
    fail("/dashboard/branches", "Branch not found.");
  }

  const branch = await prisma.branch.findFirst({
    where: { id: branchId, businessId: user.businessId },
    select: { id: true },
  });
  if (!branch) fail("/dashboard/branches", "Branch not found.");

  await prisma.branch.update({
    where: { id: branchId },
    data: { status: nextStatus },
  });
  await logAuditEvent({
    actorUserId: user.id,
    businessId: user.businessId,
    branchId,
    action: "BRANCH_UPDATED",
    entityType: "branch",
    entityId: branchId,
    metadata: { status: nextStatus },
  });

  revalidatePath("/dashboard/branches");
  redirect(`/dashboard/branches?success=Branch ${nextStatus === "ACTIVE" ? "enabled" : "disabled"}.`);
}

export async function createStaffUserAction(formData: FormData) {
  validateActionSecurity(formData, "dashboard:staff", "/dashboard/staff");
  const user = await requireBusinessOwner();
  const parsed = staffSchema.safeParse({
    name: getString(formData, "name"),
    email: getString(formData, "email").toLowerCase(),
    password: getString(formData, "password"),
    role: getString(formData, "role"),
    branchId: getString(formData, "branchId"),
  });

  if (!parsed.success) fail("/dashboard/staff", parsed.error.issues[0]?.message ?? "Validation failed.");

  const data = parsed.data;
  const [branch, existingUser] = await Promise.all([
    prisma.branch.findFirst({
      where: { id: data.branchId, businessId: user.businessId },
      select: { id: true },
    }),
    prisma.user.findUnique({
      where: { email: data.email },
      select: { id: true },
    }),
  ]);

  if (!branch) fail("/dashboard/staff", "Assigned branch is required.");
  if (existingUser) fail("/dashboard/staff", "Staff email is already in use.");

  const passwordHash = await bcrypt.hash(data.password, 12);

  const createdStaff = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash,
      role: data.role as UserRole,
      businessId: user.businessId,
      branchId: data.branchId,
      status: "ACTIVE",
    },
    select: { id: true },
  });
  await logAuditEvent({
    actorUserId: user.id,
    businessId: user.businessId,
    branchId: data.branchId,
    action: "STAFF_CREATED",
    entityType: "user",
    entityId: createdStaff.id,
    metadata: { role: data.role },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/staff");
  redirect("/dashboard/staff?success=Staff user created.");
}

export async function toggleStaffStatusAction(formData: FormData) {
  validateActionSecurity(formData, "dashboard:staff", "/dashboard/staff");
  const user = await requireBusinessOwner();
  const staffUserId = Number(getString(formData, "staffUserId"));
  const nextStatus = getString(formData, "nextStatus") as RecordStatus;

  if (!staffUserId || !["ACTIVE", "INACTIVE"].includes(nextStatus)) {
    fail("/dashboard/staff", "Staff user not found.");
  }

  const staffUser = await prisma.user.findFirst({
    where: {
      id: staffUserId,
      businessId: user.businessId,
      role: { in: ["BRANCH_MANAGER", "STAFF"] },
    },
    select: { id: true, branchId: true },
  });
  if (!staffUser) fail("/dashboard/staff", "Staff user not found.");

  await prisma.user.update({
    where: { id: staffUserId },
    data: { status: nextStatus },
  });
  await logAuditEvent({
    actorUserId: user.id,
    businessId: user.businessId,
    branchId: staffUser.branchId,
    action: "STAFF_UPDATED",
    entityType: "user",
    entityId: staffUserId,
    metadata: { status: nextStatus },
  });

  revalidatePath("/dashboard/staff");
  redirect(`/dashboard/staff?success=Staff user ${nextStatus === "ACTIVE" ? "enabled" : "disabled"}.`);
}

export type StaffPasswordResetState = {
  error?: string;
  temporaryPassword?: string;
  targetName?: string;
  targetEmail?: string;
};

export async function resetStaffPasswordAction(
  _state: StaffPasswordResetState,
  formData: FormData,
): Promise<StaffPasswordResetState> {
  try {
    validateCsrfForm(formData, "dashboard:staff");
  } catch {
    return { error: "Security check failed. Please refresh and try again." };
  }

  const owner = await requireBusinessOwner();
  const parsed = staffPasswordResetSchema.safeParse({
    staffUserId: getString(formData, "staffUserId"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Staff user not found." };
  }

  const staffUser = await prisma.user.findFirst({
    where: {
      id: parsed.data.staffUserId,
      businessId: owner.businessId,
      role: { in: ["BRANCH_MANAGER", "STAFF"] },
    },
    select: { id: true, name: true, email: true, role: true, branchId: true },
  });

  if (!staffUser) {
    return { error: "Only Branch Managers and Staff Users in your business can be reset." };
  }

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await bcrypt.hash(temporaryPassword, 12);
  const changedAt = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: staffUser.id },
      data: {
        passwordHash,
        forcePasswordChange: true,
        passwordChangedAt: changedAt,
        sessionVersion: { increment: 1 },
      },
    });

    await logAuditEvent({
      tx,
      actorUserId: owner.id,
      businessId: owner.businessId,
      branchId: staffUser.branchId,
      action: "STAFF_PASSWORD_RESET",
      entityType: "user",
      entityId: staffUser.id,
      metadata: {
        targetRole: staffUser.role,
        targetEmail: staffUser.email,
        forcedLogout: true,
        forcePasswordChange: true,
        temporaryPasswordDisplayedOnce: true,
      },
    });
  });

  revalidatePath("/dashboard/staff");
  revalidatePath(`/dashboard/staff/${staffUser.id}`);

  return {
    temporaryPassword,
    targetName: staffUser.name,
    targetEmail: staffUser.email,
  };
}

export async function updateBrandingAction() {
  await requireBusinessOwner();
  redirect("/dashboard");
}

export async function saveScannerSettingsAction(formData: FormData) {
  validateActionSecurity(formData, "dashboard:scanner-settings", "/dashboard/settings");
  const user = await requireBusinessOwner();
  const parsed = scannerSettingsSchema.safeParse({
    soundEffectsEnabled: getCheckbox(formData, "soundEffectsEnabled"),
  });

  if (!parsed.success) fail("/dashboard/settings", parsed.error.issues[0]?.message ?? "Validation failed.");

  const settings = await prisma.businessScannerSettings.upsert({
    where: { businessId: user.businessId },
    create: {
      businessId: user.businessId,
      soundEffectsEnabled: parsed.data.soundEffectsEnabled,
    },
    update: { soundEffectsEnabled: parsed.data.soundEffectsEnabled },
    select: { id: true },
  });

  await logAuditEvent({
    actorUserId: user.id,
    businessId: user.businessId,
    action: "SCANNER_SETTINGS_UPDATED",
    entityType: "business_scanner_settings",
    entityId: settings.id,
    metadata: { soundEffectsEnabled: parsed.data.soundEffectsEnabled },
  });

  revalidatePath("/dashboard/settings");
  redirect("/dashboard/settings?tab=scanner&success=Scanner settings saved.");
}

export async function saveCustomerTierSettingsAction(formData: FormData) {
  validateActionSecurity(formData, "dashboard:customer-tiers", "/dashboard/settings");
  const user = await requireBusinessOwner();
  const parsed = customerTierSettingsSchema.safeParse({
    tierQualificationWindow: getString(formData, "tierQualificationWindow") || "DAYS_90",
    tierMaintenanceMode: getString(formData, "tierMaintenanceMode") || "DYNAMIC",
    silverVisitRequirement: getString(formData, "silverVisitRequirement") || "5",
    goldVisitRequirement: getString(formData, "goldVisitRequirement") || "15",
    vipVisitRequirement: getString(formData, "vipVisitRequirement") || "30",
  });

  if (!parsed.success) fail("/dashboard/settings", parsed.error.issues[0]?.message ?? "Validation failed.");

  const tierData = {
    criteria: "VISITS_ONLY" as const,
    tierQualificationWindow: parsed.data.tierQualificationWindow,
    tierMaintenanceMode: parsed.data.tierMaintenanceMode,
    silverVisitRequirement: parsed.data.silverVisitRequirement,
    goldVisitRequirement: parsed.data.goldVisitRequirement,
    vipVisitRequirement: parsed.data.vipVisitRequirement,
  };

  const setting = await prisma.customerTierSetting.upsert({
    where: { businessId: user.businessId },
    create: {
      businessId: user.businessId,
      ...tierData,
    },
    update: tierData,
    select: { id: true },
  });

  await logAuditEvent({
    actorUserId: user.id,
    businessId: user.businessId,
    action: "CUSTOMER_TIER_SETTINGS_UPDATED",
    entityType: "customer_tier_setting",
    entityId: setting.id,
    metadata: tierData,
  });

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/customers");
  redirect("/dashboard/settings?success=Customer tier settings saved.");
}

export async function saveCooldownRuleAction(formData: FormData) {
  validateActionSecurity(formData, "dashboard:cooldowns", "/dashboard/settings");
  const user = await requireBusinessOwner();
  const parsed = cooldownRuleSchema.safeParse({
    minimumMinutesBetweenStamps: getString(formData, "minimumMinutesBetweenStamps") || "0",
    maximumStampsPerTransaction: getString(formData, "maximumStampsPerTransaction") || "5",
    maximumStampsPerCustomerPerDay: getString(formData, "maximumStampsPerCustomerPerDay") || undefined,
    maximumStampsPerStaffPerDay: getString(formData, "maximumStampsPerStaffPerDay") || undefined,
    generateAlert: getCheckbox(formData, "generateAlert"),
  });

  if (!parsed.success) fail("/dashboard/settings", parsed.error.issues[0]?.message ?? "Validation failed.");

  const existingRule = await prisma.cooldownRule.findFirst({
    where: { businessId: user.businessId, active: true },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });

  const data = {
    minimumMinutesBetweenStamps: parsed.data.minimumMinutesBetweenStamps,
    maximumStampsPerTransaction: parsed.data.maximumStampsPerTransaction,
    maximumStampsPerCustomerPerDay: parsed.data.maximumStampsPerCustomerPerDay ?? null,
    maximumStampsPerStaffPerDay: parsed.data.maximumStampsPerStaffPerDay ?? null,
    generateAlert: parsed.data.generateAlert,
  };

  const rule = existingRule
    ? await prisma.cooldownRule.update({
        where: { id: existingRule.id },
        data,
        select: { id: true },
      })
    : await prisma.cooldownRule.create({
        data: {
          businessId: user.businessId,
          name: "Default cooldown policy",
          active: true,
          ...data,
        },
        select: { id: true },
      });

  await logAuditEvent({
    actorUserId: user.id,
    businessId: user.businessId,
    action: "COOLDOWN_RULE_UPDATED",
    entityType: "cooldown_rule",
    entityId: rule.id,
    metadata: data,
  });

  revalidatePath("/dashboard/settings");
  redirect("/dashboard/settings?success=Cooldown policy saved.");
}

export async function saveAbusePolicyAction(formData: FormData) {
  validateActionSecurity(formData, "dashboard:abuse-policies", "/dashboard/settings");
  const user = await requireBusinessOwner();
  const parsed = abusePolicySchema.safeParse({
    policyId: getString(formData, "policyId"),
    thresholdValue: getString(formData, "thresholdValue") || "0",
    severity: getString(formData, "severity") || "LOW",
    enabled: getCheckbox(formData, "enabled"),
  });

  if (!parsed.success) fail("/dashboard/settings", parsed.error.issues[0]?.message ?? "Validation failed.");

  const policy = await prisma.abusePolicy.findFirst({
    where: { id: parsed.data.policyId, businessId: user.businessId },
    select: { id: true, ruleType: true },
  });
  if (!policy) fail("/dashboard/settings", "Policy not found.");

  await prisma.abusePolicy.update({
    where: { id: policy.id },
    data: {
      thresholdValue: parsed.data.thresholdValue,
      severity: parsed.data.severity,
      enabled: parsed.data.enabled,
    },
  });

  await logAuditEvent({
    actorUserId: user.id,
    businessId: user.businessId,
    action: "ABUSE_POLICY_UPDATED",
    entityType: "abuse_policy",
    entityId: policy.id,
    metadata: {
      ruleType: policy.ruleType,
      thresholdValue: parsed.data.thresholdValue,
      severity: parsed.data.severity,
      enabled: parsed.data.enabled,
    },
  });

  revalidatePath("/dashboard/settings");
  redirect("/dashboard/settings?success=Alert policy saved.");
}

export async function createCustomerAction(_prevState: PreservedFormState, formData: FormData): Promise<PreservedFormState> {
  try {
    validateCsrfForm(formData, "dashboard:customers");
  } catch {
    return customerCreateFailure(formData, "Security check failed. Please refresh and try again.");
  }
  const user = await requireBusinessOwner();
  let customer: Awaited<ReturnType<typeof enrollCustomerForBusiness>>;
  try {
    await requireUsableSubscription(user.businessId);
    customer = await enrollCustomerForBusiness({
      user,
      formData,
      path: "/dashboard/customers/new",
      forcedSource: "OWNER",
      selectedProgramUuid: getString(formData, "selectedProgramUuid") || undefined,
      programEnrollmentSource: "OWNER",
      preserveFormState: true,
    });
  } catch (error) {
    if (isFormActionError(error)) {
      return customerCreateFailure(formData, error.message, error.fieldErrors);
    }
    if (error instanceof Error) {
      return customerCreateFailure(formData, error.message);
    }
    return customerCreateFailure(formData, "Customer enrollment failed. Please try again.");
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/customers");
  const message =
    customer.programEnrollmentStatus === "ENROLLED"
      ? "Customer created and enrolled successfully."
      : "Customer created successfully. No active loyalty program is available for enrollment.";
  redirect(`/dashboard/customers/${customer.uuid}?success=${encodeURIComponent(message)}`);
}

export async function updateCustomerAction(formData: FormData) {
  validateActionSecurity(formData, "dashboard:customers", "/dashboard/customers");
  const user = await requireBusinessOwner();
  const membershipUuid = getString(formData, "membershipUuid");
  const path = `/dashboard/customers/${membershipUuid}/edit`;
  const identity = customerIdentitySchema.safeParse({
    firstName: getCustomerString(formData, "firstName"),
    lastName: getCustomerString(formData, "lastName"),
    phone: getCustomerString(formData, "phone"),
    email: getCustomerString(formData, "email"),
    birthday: getCustomerString(formData, "birthday"),
  });
  const membership = customerMembershipSchema.pick({
    marketingConsent: true,
    status: true,
    notes: true,
  }).safeParse({
    marketingConsent: getCheckbox(formData, "marketingConsent"),
    status: getCustomerString(formData, "status") || "ACTIVE",
    notes: getCustomerString(formData, "notes"),
  });

  if (!membershipUuid) fail("/dashboard/customers", "Customer not found.");
  if (!identity.success) fail(path, identity.error.issues[0]?.message ?? "Validation failed.");
  if (!membership.success) fail(path, membership.error.issues[0]?.message ?? "Validation failed.");
  const normalizedPhone = normalizePhone(identity.data.phone);
  if (!normalizedPhone) {
    fail(path, "Enter a valid UAE mobile number such as 0501234567 or +971501234567.");
  }

  const existing = await prisma.businessCustomerMembership.findFirst({
    where: { uuid: membershipUuid, businessId: user.businessId },
    select: { id: true, globalCustomerId: true },
  });
  if (!existing) fail("/dashboard/customers", "Customer not found.");

  const phoneOwner = await prisma.globalCustomer.findUnique({
    where: { normalizedPhone },
    select: { id: true },
  });
  if (phoneOwner && phoneOwner.id !== existing.globalCustomerId) {
    const existingBusinessMembership = await prisma.businessCustomerMembership.findUnique({
      where: {
        businessId_globalCustomerId: {
          businessId: user.businessId,
          globalCustomerId: phoneOwner.id,
        },
      },
      select: { id: true },
    });
    fail(path, existingBusinessMembership ? "This phone number is already enrolled in your business." : "This phone number is already used by another customer.");
  }

  await prisma.$transaction([
    prisma.globalCustomer.update({
      where: { id: existing.globalCustomerId },
      data: {
        firstName: identity.data.firstName,
        lastName: identity.data.lastName || null,
        phone: normalizedPhone,
        normalizedPhone,
        email: identity.data.email || null,
        birthday: parseBirthday(identity.data.birthday),
      },
    }),
    prisma.businessCustomerMembership.update({
      where: { id: existing.id },
      data: {
        marketingConsent: membership.data.marketingConsent,
        status: membership.data.status,
        notes: membership.data.notes || null,
      },
    }),
  ]);
  await logAuditEvent({
    actorUserId: user.id,
    businessId: user.businessId,
    action: "CUSTOMER_UPDATED",
    entityType: "business_customer_membership",
    entityId: existing.id,
    metadata: { status: membership.data.status, marketingConsent: membership.data.marketingConsent },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/customers");
  revalidatePath(`/dashboard/customers/${membershipUuid}`);
  redirect(`/dashboard/customers/${membershipUuid}?success=Customer updated.`);
}

export async function toggleCustomerCardAction(formData: FormData) {
  validateActionSecurity(formData, "dashboard:customers", "/dashboard/customers");
  const user = await requireBusinessOwner();
  const membershipUuid = getString(formData, "membershipUuid");
  const nextStatus = getString(formData, "nextStatus");

  if (!membershipUuid || !["ACTIVE", "DISABLED"].includes(nextStatus)) {
    fail("/dashboard/customers", "Customer card not found.");
  }

  const membership = await prisma.businessCustomerMembership.findFirst({
    where: { uuid: membershipUuid, businessId: user.businessId },
    select: { id: true },
  });
  if (!membership) fail("/dashboard/customers", "Customer card not found.");

  await prisma.businessCustomerMembership.update({
    where: { id: membership.id },
    data: { cardStatus: nextStatus as "ACTIVE" | "DISABLED" },
  });
  await logAuditEvent({
    actorUserId: user.id,
    businessId: user.businessId,
    action: "CARD_STATUS_UPDATED",
    entityType: "business_customer_membership",
    entityId: membership.id,
    metadata: { cardStatus: nextStatus },
  });

  revalidatePath(`/dashboard/customers/${membershipUuid}`);
  redirect(`/dashboard/customers/${membershipUuid}?success=Customer card updated.`);
}

export async function toggleProgramScanTokenAction(formData: FormData) {
  validateActionSecurity(formData, "dashboard:customers", "/dashboard/customers");
  const user = await requireBusinessOwner();
  const membershipUuid = getString(formData, "membershipUuid");
  const programMembershipUuid = getString(formData, "programMembershipUuid");
  const nextStatus = getString(formData, "nextStatus");

  if (!membershipUuid || !programMembershipUuid || !["ACTIVE", "DISABLED"].includes(nextStatus)) {
    fail("/dashboard/customers", "Scan token not found.");
  }

  const programMembership = await prisma.customerProgramMembership.findFirst({
    where: {
      uuid: programMembershipUuid,
      businessCustomerMembership: {
        uuid: membershipUuid,
        businessId: user.businessId,
      },
    },
    select: { id: true },
  });
  if (!programMembership) fail(`/dashboard/customers/${membershipUuid}`, "Scan token not found.");

  await prisma.customerProgramMembership.update({
    where: { id: programMembership.id },
    data: { scanStatus: nextStatus as "ACTIVE" | "DISABLED" },
  });
  await logAuditEvent({
    actorUserId: user.id,
    businessId: user.businessId,
    action: "SCAN_TOKEN_STATUS_UPDATED",
    entityType: "customer_program_membership",
    entityId: programMembership.id,
    metadata: { scanStatus: nextStatus, membershipUuid },
  });

  revalidatePath(`/dashboard/customers/${membershipUuid}`);
  redirect(`/dashboard/customers/${membershipUuid}?success=Scan token updated.`);
}

export async function manualStampCorrectionAction(formData: FormData) {
  validateActionSecurity(formData, "dashboard:stamp-correction", "/dashboard/customers");
  const user = await requireBusinessOwner();
  const parsed = manualStampCorrectionSchema.safeParse({
    membershipUuid: getString(formData, "membershipUuid"),
    programMembershipUuid: getString(formData, "programMembershipUuid"),
    adjustment: getString(formData, "adjustment"),
    reason: getString(formData, "correctionReason"),
  });

  const fallbackMembershipUuid = getString(formData, "membershipUuid");
  const redirectPath = fallbackMembershipUuid ? `/dashboard/customers/${fallbackMembershipUuid}` : "/dashboard/customers";
  if (!parsed.success) fail(redirectPath, parsed.error.issues[0]?.message ?? "Correction validation failed.");

  const data = parsed.data;
  await requireUsableSubscription(user.businessId).catch((error) => fail(`/dashboard/customers/${data.membershipUuid}`, error.message));

  const programMembership = await prisma.customerProgramMembership.findFirst({
    where: {
      uuid: data.programMembershipUuid,
      businessCustomerMembership: {
        uuid: data.membershipUuid,
        businessId: user.businessId,
      },
    },
    include: {
      loyaltyProgram: true,
      businessCustomerMembership: {
        include: {
          globalCustomer: true,
          createdBranch: true,
        },
      },
    },
  });
  if (!programMembership) fail(`/dashboard/customers/${data.membershipUuid}`, "Program membership not found.");

  const previousEarnedStamps = programMembership.earnedStamps;
  const nextEarnedStamps = Math.max(0, previousEarnedStamps + data.adjustment);
  const appliedAdjustment = nextEarnedStamps - previousEarnedStamps;
  if (appliedAdjustment === 0) fail(`/dashboard/customers/${data.membershipUuid}`, "Correction did not change customer progress.");

  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "customer_program_memberships" WHERE id = ${programMembership.id} FOR UPDATE`;
    const lockedMembership = await tx.customerProgramMembership.findFirst({
      where: {
        id: programMembership.id,
        businessCustomerMembership: { businessId: user.businessId },
      },
      include: {
        loyaltyProgram: true,
        businessCustomerMembership: { include: { globalCustomer: true } },
      },
    });
    if (!lockedMembership) fail(`/dashboard/customers/${data.membershipUuid}`, "Program membership not found.");

    const lockedNextEarnedStamps = Math.max(0, lockedMembership.earnedStamps + data.adjustment);
    const lockedAppliedAdjustment = lockedNextEarnedStamps - lockedMembership.earnedStamps;
    if (lockedAppliedAdjustment === 0) fail(`/dashboard/customers/${data.membershipUuid}`, "Correction did not change customer progress.");

    await tx.customerProgramMembership.update({
      where: { id: lockedMembership.id },
      data: { earnedStamps: lockedNextEarnedStamps },
    });

    await logAuditEvent({
      tx,
      actorUserId: user.id,
      businessId: user.businessId,
      branchId: lockedMembership.businessCustomerMembership.createdBranchId,
      action: "STAMP_MANUAL_CORRECTION",
      entityType: "customer_program_membership",
      entityId: lockedMembership.id,
      metadata: {
        requestedAdjustment: data.adjustment,
        appliedAdjustment: lockedAppliedAdjustment,
        previousEarnedStamps: lockedMembership.earnedStamps,
        newEarnedStamps: lockedNextEarnedStamps,
        reason: data.reason,
        customerName: `${lockedMembership.businessCustomerMembership.globalCustomer.firstName} ${lockedMembership.businessCustomerMembership.globalCustomer.lastName ?? ""}`.trim(),
        programName: lockedMembership.loyaltyProgram.name,
      },
    });
  });

  revalidatePath(`/dashboard/customers/${data.membershipUuid}`);
  redirect(`/dashboard/customers/${data.membershipUuid}?success=Manual stamp correction recorded.`);
}
