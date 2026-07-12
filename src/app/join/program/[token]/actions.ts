"use server";

import { Prisma } from "@prisma/client";
import { redirect, unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { createEngagementEventIfAllowed } from "@/lib/engagement";
import { generateCardToken } from "@/lib/customer-cards";
import { customerIdentitySchema, getCheckbox, parseBirthday } from "@/lib/customers";
import { normalizePhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { getStartingBonusStampsForEvent } from "@/lib/programs";
import { isPublicActionRateLimited, recordPublicActionAttempt } from "@/lib/rate-limit";
import { createPendingReferralForEnrollment, extractReferralCode, findActiveReferralReferrerByPhone, generateReferralCode } from "@/lib/referrals";
import { getRequestInfo } from "@/lib/request-info";
import { generateScanToken } from "@/lib/scan";

const JOIN_PROGRAM_RATE_LIMIT_SCOPE = "public_join_program" as const;

const joinProgramSchema = customerIdentitySchema.extend({
  token: z.string().trim().uuid("Program link is invalid."),
});

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function fail(token: string, message: string): never {
  redirect(`/join/program/${encodeURIComponent(token)}?error=${encodeURIComponent(message)}`);
}

async function findExistingProgramCardToken(normalizedPhone: string, businessId: number, programId: number) {
  const membership = await prisma.businessCustomerMembership.findFirst({
    where: {
      businessId,
      status: "ACTIVE",
      normalizedPhone,
      programMemberships: { some: { loyaltyProgramId: programId } },
    },
    select: { cardToken: true },
  });

  return membership?.cardToken ?? null;
}
export async function joinProgramAction(formData: FormData) {
  const token = getString(formData, "token");
  const parsed = joinProgramSchema.safeParse({
    token,
    firstName: getString(formData, "firstName"),
    lastName: getString(formData, "lastName"),
    phone: getString(formData, "phone"),
    email: getString(formData, "email"),
    birthday: getString(formData, "birthday"),
  });
  const marketingConsent = getCheckbox(formData, "marketingConsent");

  if (!parsed.success) fail(token, parsed.error.issues[0]?.message ?? "Enrollment failed.");

  const normalizedPhone = normalizePhone(parsed.data.phone);
  if (!normalizedPhone) {
    fail(token, "Enter a valid UAE mobile number such as 0501234567 or +971501234567.");
  }

  const program = await prisma.loyaltyProgram.findUnique({
    where: { joinToken: parsed.data.token },
    include: { business: true },
  });
  if (!program || !program.active || program.business.status !== "ACTIVE") {
    fail(parsed.data.token, "This program is not available for public enrollment.");
  }

  const { ipAddress } = await getRequestInfo();
  const rateLimited = await isPublicActionRateLimited({
    scope: JOIN_PROGRAM_RATE_LIMIT_SCOPE,
    ipAddress,
    identifier: parsed.data.token,
  });
  if (rateLimited) {
    fail(parsed.data.token, "Too many enrollment attempts. Please wait a few minutes and try again.");
  }
  await recordPublicActionAttempt({
    scope: JOIN_PROGRAM_RATE_LIMIT_SCOPE,
    ipAddress,
    identifier: parsed.data.token,
    outcome: "ATTEMPTED",
  });

  // Same referral resolution rules as the manual enrollment engine
  // (enrollCustomerForBusiness), using the same shared helpers. Resolved before
  // the transaction so validation failures redirect with their real message.
  const explicitReferralCodeInput = getString(formData, "referralCode");
  const referredBySearch = getString(formData, "referredBySearch");
  const referralLookupInput = explicitReferralCodeInput || referredBySearch;
  let referralCodeForEnrollment = extractReferralCode(referralLookupInput);

  if (!referralCodeForEnrollment && referralLookupInput.trim()) {
    const phoneLookup = await findActiveReferralReferrerByPhone({
      tx: prisma,
      businessId: program.businessId,
      phone: referralLookupInput,
    });

    if (phoneLookup.status === "INVALID_PHONE") {
      fail(parsed.data.token, "Check the referrer and select a matching customer before submitting.");
    }
    if (phoneLookup.status === "NOT_FOUND" || !phoneLookup.referrer?.referralCode) {
      fail(parsed.data.token, "No matching referrer found.");
    }

    referralCodeForEnrollment = phoneLookup.referrer.referralCode;
  }

  let result: { cardToken: string };
  try {
    result = await prisma.$transaction(async (tx) => {
    const globalCustomer =
      (await tx.globalCustomer.findUnique({
        where: { normalizedPhone },
        select: { id: true },
      })) ??
      (await tx.globalCustomer.create({
        data: {
          firstName: parsed.data.firstName,
          lastName: parsed.data.lastName || null,
          phone: normalizedPhone,
          normalizedPhone,
          email: parsed.data.email || null,
          birthday: parseBirthday(parsed.data.birthday),
        },
        select: { id: true },
      }));

    const existingMembership = await tx.businessCustomerMembership.findUnique({
      where: {
        businessId_normalizedPhone: {
          businessId: program.businessId,
          normalizedPhone,
        },
      },
      select: {
        id: true,
        cardToken: true,
        status: true,
        programMemberships: {
          where: { loyaltyProgramId: program.id },
          select: { id: true },
          take: 1,
        },
      },
    });

    if (existingMembership) {
      if (existingMembership.status !== "ACTIVE") {
        fail(parsed.data.token, "This customer account is not available for public enrollment.");
      }

      if (existingMembership.programMemberships.length === 0) {
        const programMembership = await tx.customerProgramMembership.create({
          data: {
            businessCustomerMembershipId: existingMembership.id,
            loyaltyProgramId: program.id,
            earnedStamps: 0,
            bonusStamps: getStartingBonusStampsForEvent({
              startingBonusStamps: program.startingBonusStamps,
              startingStampPolicy: program.startingStampPolicy,
              event: "INITIAL_ENROLLMENT",
            }),
            enrollmentSource: "SELF_SIGNUP",
            status: "ACTIVE",
            scanToken: generateScanToken(),
            scanStatus: "ACTIVE",
            scanCreatedAt: new Date(),
          },
          select: { id: true },
        });

        await createEngagementEventIfAllowed({
          tx,
          businessId: program.businessId,
          customerId: existingMembership.id,
          eventType: "WELCOME_CUSTOMER",
          metadata: {
            programMembershipId: programMembership.id,
            programName: program.name,
            rewardName: program.rewardName,
          },
        });
      }

      return { cardToken: existingMembership.cardToken };
    }

    // Mirrors the manual enrollment engine's duplicate guard: an email already
    // used by another customer of this business blocks a second profile.
    if (parsed.data.email) {
      const duplicateEmailMembership = await tx.businessCustomerMembership.findFirst({
        where: {
          businessId: program.businessId,
          email: { equals: parsed.data.email, mode: "insensitive" },
        },
        select: { id: true },
      });
      if (duplicateEmailMembership) {
        fail(parsed.data.token, "This customer is already enrolled in your business.");
      }
    }

    const referralCode = await generateReferralCode({
      tx,
      businessId: program.businessId,
      businessName: program.business.name,
      customerFirstName: parsed.data.firstName,
    });

    const membership = await tx.businessCustomerMembership.create({
      data: {
        globalCustomerId: globalCustomer.id,
        businessId: program.businessId,
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName || null,
        phone: normalizedPhone,
        normalizedPhone,
        email: parsed.data.email || null,
        birthday: parseBirthday(parsed.data.birthday),
        marketingConsent,
        source: "SELF_SIGNUP",
        status: "ACTIVE",
        cardToken: generateCardToken(),
        referralCode,
        referralEnabled: true,
        cardStatus: "ACTIVE",
        cardCreatedAt: new Date(),
      },
      select: { id: true, cardToken: true },
    });

    const programMembership = await tx.customerProgramMembership.create({
      data: {
        businessCustomerMembershipId: membership.id,
        loyaltyProgramId: program.id,
        earnedStamps: 0,
        bonusStamps: getStartingBonusStampsForEvent({
              startingBonusStamps: program.startingBonusStamps,
              startingStampPolicy: program.startingStampPolicy,
              event: "INITIAL_ENROLLMENT",
            }),
        enrollmentSource: "SELF_SIGNUP",
        status: "ACTIVE",
        scanToken: generateScanToken(),
        scanStatus: "ACTIVE",
        scanCreatedAt: new Date(),
      },
      select: { id: true },
    });

    await createPendingReferralForEnrollment({
      tx,
      businessId: program.businessId,
      referredGlobalCustomerId: globalCustomer.id,
      referredMembershipId: membership.id,
      referralCode: referralCodeForEnrollment,
    });

    await createEngagementEventIfAllowed({
      tx,
      businessId: program.businessId,
      customerId: membership.id,
      eventType: "WELCOME_CUSTOMER",
      metadata: {
        programMembershipId: programMembership.id,
        programName: program.name,
        rewardName: program.rewardName,
      },
    });

    return { cardToken: membership.cardToken };
    });
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existingCardToken = await findExistingProgramCardToken(normalizedPhone, program.businessId, program.id);
      if (existingCardToken) {
        redirect(`/join/program/${encodeURIComponent(parsed.data.token)}?card=${encodeURIComponent(existingCardToken)}`);
      }
    }

    fail(parsed.data.token, "Enrollment could not be completed. Please try again.");
  }

  redirect(`/join/program/${encodeURIComponent(parsed.data.token)}?card=${encodeURIComponent(result.cardToken)}`);
}
