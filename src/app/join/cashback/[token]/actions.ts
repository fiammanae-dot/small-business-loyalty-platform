"use server";

import { Prisma } from "@prisma/client";
import { redirect, unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { enrollInCashback } from "@/lib/cashback-enrollment";
import { generateCardToken } from "@/lib/customer-cards";
import { customerIdentitySchema, getCheckbox, parseBirthday, readVehicleFormFields, vehicleColumnsFrom, withVehicleChecks } from "@/lib/customers";
import { normalizePhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { isPublicActionRateLimited, recordPublicActionAttempt } from "@/lib/rate-limit";
import { createPendingReferralForEnrollment, extractReferralCode, findActiveReferralReferrerByPhone, generateReferralCode } from "@/lib/referrals";
import { getRequestInfo } from "@/lib/request-info";
import { scheduleWelcomeCardMessage } from "@/lib/whatsapp/send-welcome-card";

/**
 * Public self-join for the cashback program - the cashback twin of
 * /join/program/<token>. A new phone number gets a customer profile and card;
 * an existing customer of the business is simply enrolled in cashback.
 */

const JOIN_CASHBACK_RATE_LIMIT_SCOPE = "public_join_cashback" as const;

const joinCashbackSchema = withVehicleChecks(
  customerIdentitySchema.extend({
    token: z.string().trim().uuid("Cashback link is invalid."),
  }),
);

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function fail(token: string, message: string): never {
  redirect(`/join/cashback/${encodeURIComponent(token)}?error=${encodeURIComponent(message)}`);
}

export async function joinCashbackProgramAction(formData: FormData) {
  const token = getString(formData, "token");
  const parsed = joinCashbackSchema.safeParse({
    token,
    firstName: getString(formData, "firstName"),
    lastName: getString(formData, "lastName"),
    phone: getString(formData, "phone"),
    email: getString(formData, "email"),
    birthday: getString(formData, "birthday"),
    ...readVehicleFormFields(formData),
  });
  const marketingConsent = getCheckbox(formData, "marketingConsent");
  if (!parsed.success) fail(token, parsed.error.issues[0]?.message ?? "Joining failed.");

  const normalizedPhone = normalizePhone(parsed.data.phone);
  if (!normalizedPhone) fail(token, "Enter a valid UAE mobile number such as 0501234567 or +971501234567.");

  const settings = await prisma.businessCashbackSettings.findUnique({
    where: { joinToken: parsed.data.token },
    include: { business: { select: { id: true, name: true, status: true } } },
  });
  if (!settings?.enabled || settings.business.status !== "ACTIVE") {
    fail(parsed.data.token, "This cashback program is not available for public enrollment.");
  }
  const businessId = settings.business.id;

  const { ipAddress } = await getRequestInfo();
  if (await isPublicActionRateLimited({ scope: JOIN_CASHBACK_RATE_LIMIT_SCOPE, ipAddress, identifier: parsed.data.token })) {
    fail(parsed.data.token, "Too many attempts. Please wait a few minutes and try again.");
  }
  await recordPublicActionAttempt({
    scope: JOIN_CASHBACK_RATE_LIMIT_SCOPE,
    ipAddress,
    identifier: parsed.data.token,
    outcome: "ATTEMPTED",
  });

  // Same referral rules as the program join page: a referral code / link, or a
  // referrer's phone number. Resolved before the transaction so a bad referrer
  // redirects with its real message.
  const referralLookupInput = getString(formData, "referralCode") || getString(formData, "referredBySearch");
  let referralCodeForEnrollment = extractReferralCode(referralLookupInput);
  if (!referralCodeForEnrollment && referralLookupInput.trim()) {
    const phoneLookup = await findActiveReferralReferrerByPhone({ tx: prisma, businessId, phone: referralLookupInput });
    if (phoneLookup.status === "INVALID_PHONE") fail(parsed.data.token, "Check the referrer and select a matching customer before submitting.");
    if (phoneLookup.status === "NOT_FOUND" || !phoneLookup.referrer?.referralCode) fail(parsed.data.token, "No matching referrer found.");
    referralCodeForEnrollment = phoneLookup.referrer.referralCode;
  }

  let result: { cardToken: string; welcomeMembershipId: number | null };
  try {
    result = await prisma.$transaction(async (tx) => {
      const existing = await tx.businessCustomerMembership.findUnique({
        where: { businessId_normalizedPhone: { businessId, normalizedPhone } },
        select: { id: true, cardToken: true, status: true, cashbackJoinedAt: true },
      });

      if (existing) {
        if (existing.status !== "ACTIVE") fail(parsed.data.token, "This customer account is not available for public enrollment.");
        const joined = await enrollInCashback({ tx, businessId, membershipId: existing.id, actorUserId: null, source: "SELF_SIGNUP" });
        return { cardToken: existing.cardToken, welcomeMembershipId: joined ? existing.id : null };
      }

      if (parsed.data.email) {
        const duplicateEmail = await tx.businessCustomerMembership.findFirst({
          where: { businessId, email: { equals: parsed.data.email, mode: "insensitive" } },
          select: { id: true },
        });
        if (duplicateEmail) fail(parsed.data.token, "This customer is already enrolled in your business.");
      }

      const globalCustomer =
        (await tx.globalCustomer.findUnique({ where: { normalizedPhone }, select: { id: true } })) ??
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

      const referralCode = await generateReferralCode({
        tx,
        businessId,
        businessName: settings.business.name,
        customerFirstName: parsed.data.firstName,
      });

      const created = await tx.businessCustomerMembership.create({
        data: {
          globalCustomerId: globalCustomer.id,
          businessId,
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
          ...vehicleColumnsFrom(parsed.data),
        },
        select: { id: true, cardToken: true },
      });
      await enrollInCashback({ tx, businessId, membershipId: created.id, actorUserId: null, source: "SELF_SIGNUP" });
      // The referral qualifies on this customer's first cashback purchase.
      await createPendingReferralForEnrollment({
        tx,
        businessId,
        referredGlobalCustomerId: globalCustomer.id,
        referredMembershipId: created.id,
        referralCode: referralCodeForEnrollment,
      });
      return { cardToken: created.cardToken, welcomeMembershipId: created.id };
    });
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await prisma.businessCustomerMembership.findFirst({
        where: { businessId, normalizedPhone, status: "ACTIVE", cashbackJoinedAt: { not: null } },
        select: { cardToken: true },
      });
      if (existing) redirect(`/join/cashback/${encodeURIComponent(parsed.data.token)}?card=${encodeURIComponent(existing.cardToken)}`);
    }
    fail(parsed.data.token, "Joining could not be completed. Please try again.");
  }

  if (result.welcomeMembershipId !== null) {
    scheduleWelcomeCardMessage({ businessId, membershipId: result.welcomeMembershipId });
  }
  redirect(`/join/cashback/${encodeURIComponent(parsed.data.token)}?card=${encodeURIComponent(result.cardToken)}`);
}
