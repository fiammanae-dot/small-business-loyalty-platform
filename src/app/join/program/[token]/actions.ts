"use server";

import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createEngagementEventIfAllowed } from "@/lib/engagement";
import { generateCardToken } from "@/lib/customer-cards";
import { normalizePhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { getStartingBonusStampsForEvent } from "@/lib/programs";
import { generateReferralCode } from "@/lib/referrals";
import { generateScanToken } from "@/lib/scan";

const joinProgramSchema = z.object({
  token: z.string().trim().uuid("Program link is invalid."),
  firstName: z.string().trim().min(1, "First name is required."),
  lastName: z.string().trim().optional(),
  phone: z.string().trim().min(1, "Phone number is required."),
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
  });

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
        email: null,
        birthday: null,
        marketingConsent: false,
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
