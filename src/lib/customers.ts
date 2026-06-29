import "server-only";

import { redirect } from "next/navigation";
import { z } from "zod";
import type { AuthUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { normalizePhone } from "@/lib/phone";
import { generateCardToken } from "@/lib/customer-cards";
import { createPendingReferralForEnrollment, extractReferralCode, findActiveReferralReferrerByPhone, generateReferralCode } from "@/lib/referrals";

export const customerSourceLabels = {
  STAFF: "Staff",
  OWNER: "Owner",
  IMPORT: "Import",
  SELF_SIGNUP: "Self signup",
} as const;

export const customerStatusLabels = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  BLOCKED: "blocked",
} as const;

export const customerSourceValues = ["STAFF", "OWNER", "IMPORT", "SELF_SIGNUP"] as const;
export const customerStatusValues = ["ACTIVE", "INACTIVE", "BLOCKED"] as const;

export const customerIdentitySchema = z.object({
  firstName: z.string().trim().min(1, "First name is required."),
  lastName: z.string().trim().optional(),
  phone: z.string().trim().min(1, "Phone is required."),
  email: z.string().trim().email("Email format is invalid.").optional().or(z.literal("")),
  birthday: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((value) => !value || new Date(value) <= new Date(), "Birthday cannot be a future date."),
});

export const customerMembershipSchema = z.object({
  marketingConsent: z.boolean(),
  createdBranchId: z.coerce.number().int().positive().optional(),
  source: z.enum(customerSourceValues),
  status: z.enum(customerStatusValues),
  notes: z.string().trim().optional(),
});

export function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export function getCheckbox(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

export function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

export function success(path: string, message: string): never {
  redirect(`${path}?success=${encodeURIComponent(message)}`);
}

export function parseBirthday(value?: string) {
  return value ? new Date(`${value}T00:00:00.000Z`) : null;
}

export async function getBusinessCustomerOrRedirect(uuid: string, businessId: number, branchId?: number) {
  const membership = await prisma.businessCustomerMembership.findFirst({
    where: {
      uuid,
      businessId,
      ...(branchId ? { createdBranchId: branchId } : {}),
    },
    include: {
      globalCustomer: true,
      business: true,
      createdBranch: true,
      createdByUser: { select: { id: true, name: true, email: true, role: true } },
      programMemberships: {
        include: { loyaltyProgram: true },
        orderBy: { enrolledAt: "desc" },
      },
    },
  });

  if (!membership) {
    redirect(branchId ? "/branch/customers" : "/dashboard/customers");
  }

  return membership;
}

export async function assertBranchBelongsToBusiness(branchId: number | undefined, businessId: number) {
  if (!branchId) return null;

  const branch = await prisma.branch.findFirst({
    where: { id: branchId, businessId },
    select: { id: true },
  });

  return branch;
}

export async function enrollCustomerForBusiness({
  user,
  formData,
  path,
  forcedBranchId,
  forcedSource,
}: {
  user: AuthUser & { businessId: number };
  formData: FormData;
  path: string;
  forcedBranchId?: number;
  forcedSource?: "STAFF" | "OWNER";
}) {
  const identity = customerIdentitySchema.safeParse({
    firstName: getString(formData, "firstName"),
    lastName: getString(formData, "lastName"),
    phone: getString(formData, "phone"),
    email: getString(formData, "email"),
    birthday: getString(formData, "birthday"),
  });
  const membership = customerMembershipSchema.safeParse({
    marketingConsent: getCheckbox(formData, "marketingConsent"),
    createdBranchId: forcedBranchId ?? (getString(formData, "createdBranchId") || undefined),
    source: forcedSource ?? (getString(formData, "source") || "OWNER"),
    status: getString(formData, "status") || "ACTIVE",
    notes: getString(formData, "notes"),
  });

  if (!identity.success) fail(path, identity.error.issues[0]?.message ?? "Validation failed.");
  if (!membership.success) fail(path, membership.error.issues[0]?.message ?? "Validation failed.");

  const branch = await assertBranchBelongsToBusiness(membership.data.createdBranchId, user.businessId);
  if (membership.data.createdBranchId && !branch) fail(path, "Created branch must belong to your business.");

  const normalizedPhone = normalizePhone(identity.data.phone);
  if (!normalizedPhone) {
    fail(path, "Enter a valid UAE mobile number such as 0501234567 or +971501234567.");
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const globalCustomer =
        (await tx.globalCustomer.findUnique({
          where: { normalizedPhone },
          select: { id: true },
        })) ??
        (await tx.globalCustomer.create({
          data: {
            firstName: identity.data.firstName,
            lastName: identity.data.lastName || null,
            phone: normalizedPhone,
            normalizedPhone,
            email: identity.data.email || null,
            birthday: parseBirthday(identity.data.birthday),
          },
          select: { id: true },
        }));

      const existingMembership = await tx.businessCustomerMembership.findUnique({
        where: {
          businessId_globalCustomerId: {
            businessId: user.businessId,
            globalCustomerId: globalCustomer.id,
          },
        },
        select: { id: true },
      });

      if (existingMembership) return { duplicate: true, uuid: null, cardToken: null };

      const business = await tx.business.findUnique({
        where: { id: user.businessId },
        select: { name: true },
      });
      if (!business) fail(path, "Business not found.");

      const referralCode = await generateReferralCode({
        tx,
        businessId: user.businessId,
        businessName: business.name,
        customerFirstName: identity.data.firstName,
      });

      const created = await tx.businessCustomerMembership.create({
        data: {
          globalCustomerId: globalCustomer.id,
          businessId: user.businessId,
          createdBranchId: membership.data.createdBranchId ?? null,
          createdByUserId: user.id,
          marketingConsent: membership.data.marketingConsent,
          source: membership.data.source,
          status: membership.data.status,
          cardToken: generateCardToken(),
          referralCode,
          referralEnabled: true,
          cardStatus: "ACTIVE",
          cardCreatedAt: new Date(),
          notes: membership.data.notes || null,
        },
        select: { id: true, uuid: true, cardToken: true },
      });

      await logAuditEvent({
        tx,
        actorUserId: user.id,
        businessId: user.businessId,
        branchId: membership.data.createdBranchId ?? null,
        action: "CUSTOMER_CREATED",
        entityType: "business_customer_membership",
        entityId: created.id,
        metadata: {
          source: membership.data.source,
          marketingConsent: membership.data.marketingConsent,
        },
      });

      const referralCodeFromInput = extractReferralCode(getString(formData, "referralCode"));
      const referredByPhoneNumber = getString(formData, "referredByPhoneNumber");
      let referralCodeForEnrollment = referralCodeFromInput;

      if (!referralCodeForEnrollment && referredByPhoneNumber.trim()) {
        const phoneLookup = await findActiveReferralReferrerByPhone({
          tx,
          businessId: user.businessId,
          phone: referredByPhoneNumber,
        });

        if (phoneLookup.status === "INVALID_PHONE") {
          fail(path, "Enter a valid referred-by UAE mobile number such as 0501234567 or +971501234567.");
        }
        if (phoneLookup.status === "NOT_FOUND" || !phoneLookup.referrer?.referralCode) {
          fail(path, "No active customer was found for the referred-by phone number.");
        }

        referralCodeForEnrollment = phoneLookup.referrer.referralCode;
      }

      await createPendingReferralForEnrollment({
        tx,
        businessId: user.businessId,
        referredGlobalCustomerId: globalCustomer.id,
        referredMembershipId: created.id,
        referralCode: referralCodeForEnrollment,
      });

      return { duplicate: false, uuid: created.uuid, cardToken: created.cardToken };
    });

    if (result.duplicate) fail(path, "This customer is already enrolled in your business.");
    return { uuid: result.uuid as string, cardToken: result.cardToken as string };
  } catch (error) {
    console.error("Customer enrollment failed", error);
    fail(path, "Customer enrollment failed. Please try again.");
  }
}
