import "server-only";

import { redirect } from "next/navigation";
import { z } from "zod";
import type { Prisma, StartingStampPolicy } from "@prisma/client";
import type { AuthUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { normalizePhone } from "@/lib/phone";
import {
  checkVehicleCode,
  isVehicleBrand,
  isVehicleColour,
  isVehicleEmirate,
  isVehicleSize,
  normalizePlate,
  normalizeVehicleCode,
  normalizeVehicleModel,
  normalizeVehicleNumber,
} from "@/lib/vehicles";
import { generateCardToken } from "@/lib/customer-cards";
import { createEngagementEventIfAllowed } from "@/lib/engagement";
import { scheduleWelcomeCardMessage } from "@/lib/whatsapp/send-welcome-card";
import { getFirstZodMessage, getZodFieldErrors, isFormActionError, throwFormActionError, type FormFieldErrors } from "@/lib/form-state";
import { createPendingReferralForEnrollment, extractReferralCode, findActiveReferralReferrerByPhone, generateReferralCode } from "@/lib/referrals";
import { getStartingBonusStampsForEvent } from "@/lib/programs";
import { generateScanToken } from "@/lib/scan";

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
export const customerProgramEnrollmentStatuses = ["NO_ACTIVE_PROGRAM", "ENROLLED"] as const;

type CustomerProgramEnrollmentSource = "OWNER" | "BRANCH_MANAGER";
type CustomerProgramEnrollmentStatus = typeof customerProgramEnrollmentStatuses[number];
type CustomerTransaction = Prisma.TransactionClient;

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
  // Vehicle is optional in the schema and only surfaced for CAR_CARE_CENTER
  // businesses. A walk-in without their car must still be enrollable.
  vehicleEmirate: z.string().trim().optional().or(z.literal("")),
  vehicleCode: z.string().trim().optional().or(z.literal("")),
  vehicleNumber: z.string().trim().optional().or(z.literal("")),
  vehicleBrand: z.string().trim().optional().or(z.literal("")),
  vehicleModel: z.string().trim().max(40, "Model is too long.").optional().or(z.literal("")),
  vehicleColour: z.string().trim().optional().or(z.literal("")),
  vehicleSize: z.string().trim().optional().or(z.literal("")),
});

type VehicleFields = {
  vehicleEmirate?: string;
  vehicleCode?: string;
  vehicleNumber?: string;
  vehicleBrand?: string;
  vehicleModel?: string;
  vehicleColour?: string;
  vehicleSize?: string;
};

/**
 * Everything the dropdowns produce, normalized. Unknown values become null
 * rather than an error: these fields are all optional, and a stale option in a
 * cached page must never block an enrollment at the counter.
 */
export function vehicleColumnsFrom(data: VehicleFields) {
  return {
    vehicleEmirate: isVehicleEmirate(data.vehicleEmirate) ? data.vehicleEmirate : null,
    vehicleCode: normalizeVehicleCode(data.vehicleCode),
    vehicleNumber: normalizeVehicleNumber(data.vehicleNumber),
    normalizedPlate: normalizePlate({
      emirate: data.vehicleEmirate,
      code: data.vehicleCode,
      number: data.vehicleNumber,
    }),
    vehicleBrand: isVehicleBrand(data.vehicleBrand) ? data.vehicleBrand : null,
    vehicleModel: normalizeVehicleModel(data.vehicleModel),
    vehicleColour: isVehicleColour(data.vehicleColour) ? data.vehicleColour : null,
    vehicleSize: isVehicleSize(data.vehicleSize) ? data.vehicleSize : null,
  };
}

/**
 * The plate form's field names. Every create action has to list these among
 * the fields it preserves on a validation failure, or a rejected form throws
 * the plate away and the counter has to re-enter it.
 */
export const customerVehicleFormFields = [
  "vehicleFieldsPresent",
  "vehicleEmirate",
  "vehicleCode",
  "vehicleNumber",
  "vehicleBrand",
  "vehicleModel",
  "vehicleColour",
  "vehicleSize",
];

/** Every field a plate form submits, read straight off the FormData. */
export function readVehicleFormFields(formData: FormData): VehicleFields {
  return {
    vehicleEmirate: getString(formData, "vehicleEmirate"),
    vehicleCode: getString(formData, "vehicleCode"),
    vehicleNumber: getString(formData, "vehicleNumber"),
    vehicleBrand: getString(formData, "vehicleBrand"),
    vehicleModel: getString(formData, "vehicleModel"),
    vehicleColour: getString(formData, "vehicleColour"),
    vehicleSize: getString(formData, "vehicleSize"),
  };
}

/**
 * The plate rules live here rather than inside customerIdentitySchema because
 * the join form extends that schema, and a schema carrying refinements can no
 * longer be extended. So callers compose: extend the object first, then wrap.
 */
export function withVehicleChecks<T extends z.ZodType<VehicleFields>>(schema: T) {
  return schema.superRefine((data, ctx) => {
    if (data.vehicleNumber) {
      if (!isVehicleEmirate(data.vehicleEmirate)) {
        ctx.addIssue({
          code: "custom",
          message: "Select the emirate the plate was issued in.",
          path: ["vehicleEmirate"],
        });
      }
      if (normalizeVehicleNumber(data.vehicleNumber) === null) {
        ctx.addIssue({ code: "custom", message: "Plate number must be 1-5 digits.", path: ["vehicleNumber"] });
      }
    }

    // Codes are shaped differently per emirate - Dubai letters, Abu Dhabi and
    // Sharjah numbers - so the message has to come from the emirate, not one
    // global rule.
    if (data.vehicleCode && isVehicleEmirate(data.vehicleEmirate)) {
      const problem = checkVehicleCode(data.vehicleEmirate, data.vehicleCode);
      if (problem) {
        ctx.addIssue({ code: "custom", message: problem, path: ["vehicleCode"] });
      }
    }
  });
}

/** customerIdentitySchema with the plate rules applied. Use this to parse. */
export const customerIdentityInputSchema = withVehicleChecks(customerIdentitySchema);

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

export async function findGlobalCustomerForEnrollment({
  tx,
  normalizedPhone,
  email,
}: {
  tx: CustomerTransaction;
  normalizedPhone: string;
  email?: string | null;
}) {
  const customerByPhone = await tx.globalCustomer.findUnique({
    where: { normalizedPhone },
    select: { id: true },
  });

  if (customerByPhone) return customerByPhone;

  const trimmedEmail = email?.trim();
  if (!trimmedEmail) return null;

  return tx.globalCustomer.findFirst({
    where: { email: { equals: trimmedEmail, mode: "insensitive" } },
    orderBy: { id: "asc" },
    select: { id: true },
  });
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

export function getBusinessCustomerName(customer: { firstName: string; lastName?: string | null }) {
  return `${customer.firstName} ${customer.lastName ?? ""}`.trim();
}

export async function assertBranchBelongsToBusiness(branchId: number | undefined, businessId: number) {
  if (!branchId) return null;

  const branch = await prisma.branch.findFirst({
    where: { id: branchId, businessId },
    select: { id: true },
  });

  return branch;
}

export async function createCustomerProgramMembershipForEnrollment({
  tx,
  businessId,
  businessCustomerMembershipId,
  loyaltyProgram,
  enrollmentSource,
}: {
  tx: CustomerTransaction;
  businessId: number;
  businessCustomerMembershipId: number;
  loyaltyProgram: { id: number; name: string; rewardName: string; startingBonusStamps: number; startingStampPolicy: StartingStampPolicy };
  enrollmentSource: CustomerProgramEnrollmentSource;
}) {
  const programMembership = await tx.customerProgramMembership.create({
    data: {
      businessCustomerMembershipId,
      loyaltyProgramId: loyaltyProgram.id,
      earnedStamps: 0,
      bonusStamps: getStartingBonusStampsForEvent({
        startingBonusStamps: loyaltyProgram.startingBonusStamps,
        startingStampPolicy: loyaltyProgram.startingStampPolicy,
        event: "INITIAL_ENROLLMENT",
      }),
      enrollmentSource,
      status: "ACTIVE",
      scanToken: generateScanToken(),
      scanStatus: "ACTIVE",
      scanCreatedAt: new Date(),
    },
    select: { id: true },
  });

  await createEngagementEventIfAllowed({
    tx,
    businessId,
    customerId: businessCustomerMembershipId,
    eventType: "WELCOME_CUSTOMER",
    metadata: {
      programMembershipId: programMembership.id,
      programName: loyaltyProgram.name,
      rewardName: loyaltyProgram.rewardName,
    },
  });

  scheduleWelcomeCardMessage({ businessId, membershipId: businessCustomerMembershipId });

  return programMembership;
}

export async function enrollCustomerForBusiness({
  user,
  formData,
  path,
  forcedBranchId,
  forcedSource,
  selectedProgramUuid,
  programEnrollmentSource,
  preserveFormState = false,
}: {
  user: AuthUser & { businessId: number };
  formData: FormData;
  path: string;
  forcedBranchId?: number;
  forcedSource?: "STAFF" | "OWNER";
  selectedProgramUuid?: string;
  programEnrollmentSource?: CustomerProgramEnrollmentSource;
  preserveFormState?: boolean;
}) {
  function failForForm(message: string, fieldErrors?: FormFieldErrors): never {
    if (preserveFormState) {
      throwFormActionError(message, fieldErrors);
    }
    fail(path, message);
  }

  const identity = customerIdentityInputSchema.safeParse({
    firstName: getString(formData, "firstName"),
    lastName: getString(formData, "lastName"),
    phone: getString(formData, "phone"),
    email: getString(formData, "email"),
    birthday: getString(formData, "birthday"),
    ...readVehicleFormFields(formData),
  });
  const membership = customerMembershipSchema.safeParse({
    marketingConsent: getCheckbox(formData, "marketingConsent"),
    createdBranchId: forcedBranchId ?? (getString(formData, "createdBranchId") || undefined),
    source: forcedSource ?? (getString(formData, "source") || "OWNER"),
    status: getString(formData, "status") || "ACTIVE",
    notes: getString(formData, "notes"),
  });

  if (!identity.success) failForForm(getFirstZodMessage(identity.error), getZodFieldErrors(identity.error));
  if (!membership.success) failForForm(getFirstZodMessage(membership.error), getZodFieldErrors(membership.error));

  const branch = await assertBranchBelongsToBusiness(membership.data.createdBranchId, user.businessId);
  if (membership.data.createdBranchId && !branch) failForForm("Created branch must belong to your business.", { createdBranchId: "Created branch must belong to your business." });

  const normalizedPhone = normalizePhone(identity.data.phone);
  if (!normalizedPhone) {
    failForForm("Enter a valid UAE mobile number such as 0501234567 or +971501234567.", { phone: "Enter a valid UAE mobile number such as 0501234567 or +971501234567." });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const globalCustomer =
        (await findGlobalCustomerForEnrollment({
          tx,
          normalizedPhone,
          email: identity.data.email || null,
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

      const existingMembership = await tx.businessCustomerMembership.findFirst({
        where: {
          businessId: user.businessId,
          OR: [
            { normalizedPhone },
            ...(identity.data.email ? [{ email: { equals: identity.data.email, mode: "insensitive" as const } }] : []),
          ],
        },
        select: { id: true },
      });

      if (existingMembership) return { duplicate: true, uuid: null, cardToken: null };

      const business = await tx.business.findUnique({
        where: { id: user.businessId },
        select: { name: true },
      });
      if (!business) failForForm("Business not found.");

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
          firstName: identity.data.firstName,
          lastName: identity.data.lastName || null,
          phone: normalizedPhone,
          normalizedPhone,
          email: identity.data.email || null,
          birthday: parseBirthday(identity.data.birthday),
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
          ...vehicleColumnsFrom(identity.data),
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

      const explicitReferralCodeInput = getString(formData, "referralCode");
      const referredByPhoneNumber = getString(formData, "referredByPhoneNumber");
      const referredBySearch = getString(formData, "referredBySearch");
      const referralLookupInput = explicitReferralCodeInput || referredByPhoneNumber || referredBySearch;
      const referralCodeFromInput = extractReferralCode(referralLookupInput);
      let referralCodeForEnrollment = referralCodeFromInput;

      if (!referralCodeForEnrollment && referralLookupInput.trim()) {
        const phoneLookup = await findActiveReferralReferrerByPhone({
          tx,
          businessId: user.businessId,
          phone: referralLookupInput,
        });

        if (phoneLookup.status === "INVALID_PHONE") {
          const fieldName = referredBySearch.trim() ? "referredBySearch" : "referredByPhoneNumber";
          failForForm("Check the referrer and select a matching customer before submitting.", {
            [fieldName]: "Check the referrer and select a matching customer before submitting.",
          });
        }
        if (phoneLookup.status === "NOT_FOUND" || !phoneLookup.referrer?.referralCode) {
          const fieldName = referredBySearch.trim() ? "referredBySearch" : "referredByPhoneNumber";
          failForForm("No matching referrer found.", {
            [fieldName]: "No matching referrer found.",
          });
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

      const activePrograms = await tx.loyaltyProgram.findMany({
        where: { businessId: user.businessId, active: true },
        select: { id: true, uuid: true, name: true, rewardName: true, startingBonusStamps: true, startingStampPolicy: true },
        orderBy: { createdAt: "asc" },
      });

      let programEnrollmentStatus: CustomerProgramEnrollmentStatus = "NO_ACTIVE_PROGRAM";
      if (activePrograms.length > 0) {
        const selectedProgram =
          activePrograms.length === 1
            ? activePrograms[0]
            : activePrograms.find((program) => program.uuid === selectedProgramUuid);

        if (!selectedProgram) {
          failForForm(activePrograms.length > 1 ? "Select an active loyalty program for this customer." : "Selected loyalty program is not available.", {
            selectedProgramUuid: activePrograms.length > 1 ? "Select an active loyalty program for this customer." : "Selected loyalty program is not available.",
          });
        }

        await createCustomerProgramMembershipForEnrollment({
          tx,
          businessId: user.businessId,
          businessCustomerMembershipId: created.id,
          loyaltyProgram: selectedProgram,
          enrollmentSource: programEnrollmentSource ?? "OWNER",
        });
        programEnrollmentStatus = "ENROLLED";
      }

      return { duplicate: false, uuid: created.uuid, cardToken: created.cardToken, programEnrollmentStatus };
    });

    if (result.duplicate) failForForm("This customer is already enrolled in your business.", { phone: "This customer is already enrolled in your business." });
    return {
      uuid: result.uuid as string,
      cardToken: result.cardToken as string,
      programEnrollmentStatus: result.programEnrollmentStatus as CustomerProgramEnrollmentStatus,
    };
  } catch (error) {
    if (isFormActionError(error)) {
      throw error;
    }
    console.error("Customer enrollment failed", error);
    failForForm("Customer enrollment failed. Please try again.");
  }
}
