"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { BusinessType, RecordStatus, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { requireBusinessOwner } from "@/lib/business-owner";
import { validateCsrfForm } from "@/lib/csrf";
import { requireUsableSubscription } from "@/lib/commercial-access";
import { commerciallyUsableStatuses, limitReachedMessage } from "@/lib/subscriptions";
import {
  customerIdentitySchema,
  customerMembershipSchema,
  enrollCustomerForBusiness,
  getCheckbox,
  getString as getCustomerString,
  parseBirthday,
} from "@/lib/customers";

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
}

export async function updateBrandingAction() {
  await requireBusinessOwner();
  redirect("/dashboard");
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

export async function createCustomerAction(formData: FormData) {
  validateActionSecurity(formData, "dashboard:customers", "/dashboard/customers/new");
  const user = await requireBusinessOwner();
  await requireUsableSubscription(user.businessId).catch((error) => fail("/dashboard/customers/new", error.message));
  const customer = await enrollCustomerForBusiness({
    user,
    formData,
    path: "/dashboard/customers/new",
    forcedSource: "OWNER",
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/customers");
  redirect(`/dashboard/customers/${customer.uuid}?success=Customer enrolled successfully.`);
}

export async function updateCustomerAction(formData: FormData) {
  validateActionSecurity(formData, "dashboard:customers", "/dashboard/customers");
  const user = await requireBusinessOwner();
  const membershipUuid = getString(formData, "membershipUuid");
  const path = `/dashboard/customers/${membershipUuid}/edit`;
  const identity = customerIdentitySchema.omit({ phone: true }).safeParse({
    firstName: getCustomerString(formData, "firstName"),
    lastName: getCustomerString(formData, "lastName"),
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

  const existing = await prisma.businessCustomerMembership.findFirst({
    where: { uuid: membershipUuid, businessId: user.businessId },
    select: { id: true, globalCustomerId: true },
  });
  if (!existing) fail("/dashboard/customers", "Customer not found.");

  await prisma.$transaction([
    prisma.globalCustomer.update({
      where: { id: existing.globalCustomerId },
      data: {
        firstName: identity.data.firstName,
        lastName: identity.data.lastName || null,
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
