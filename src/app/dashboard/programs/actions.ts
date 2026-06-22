"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { BusinessType } from "@prisma/client";
import { requireBusinessOwner } from "@/lib/business-owner";
import { logAuditEvent } from "@/lib/audit";
import { validateCsrfForm } from "@/lib/csrf";
import { requireUsableSubscription } from "@/lib/commercial-access";
import { createEngagementEventIfAllowed } from "@/lib/engagement";
import { prisma } from "@/lib/prisma";
import { parseProgramDate, programSchema } from "@/lib/programs";
import { generateScanToken } from "@/lib/scan";
import { commerciallyUsableStatuses, limitReachedMessage } from "@/lib/subscriptions";

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

function programData(formData: FormData) {
  const parsed = programSchema.safeParse({
    name: getString(formData, "name"),
    businessType: getString(formData, "businessType"),
    productOrServiceName: getString(formData, "productOrServiceName"),
    description: getString(formData, "description"),
    requiredStamps: getString(formData, "requiredStamps"),
    startingBonusStamps: getString(formData, "startingBonusStamps") || "0",
    referralRewardBonusStamps: getString(formData, "referralRewardBonusStamps") || "1",
    cardTheme: getString(formData, "cardTheme") || "BUSINESS_DEFAULT",
    rewardName: getString(formData, "rewardName"),
    rewardDescription: getString(formData, "rewardDescription"),
    active: getString(formData, "active") === "true",
    startDate: getString(formData, "startDate"),
    endDate: getString(formData, "endDate"),
  });

  return parsed;
}

export async function createProgramAction(formData: FormData) {
  validateActionSecurity(formData, "dashboard:programs", "/dashboard/programs/new");
  const user = await requireBusinessOwner();
  await requireUsableSubscription(user.businessId).catch((error) => fail("/dashboard/programs/new", error.message));
  const path = "/dashboard/programs/new";
  const parsed = programData(formData);
  if (!parsed.success) fail(path, parsed.error.issues[0]?.message ?? "Validation failed.");

  const subscription = await prisma.businessSubscription.findFirst({
    where: { businessId: user.businessId, status: { in: commerciallyUsableStatuses } },
    orderBy: { createdAt: "desc" },
    include: { subscriptionPlan: true },
  });
  const maxPrograms = subscription?.subscriptionPlan.maxLoyaltyPrograms ?? 1;
  const programCount = await prisma.loyaltyProgram.count({ where: { businessId: user.businessId } });
  if (programCount >= maxPrograms) {
    fail(path, limitReachedMessage("program", maxPrograms));
  }

  const program = await prisma.loyaltyProgram.create({
    data: {
      businessId: user.businessId,
      name: parsed.data.name,
      businessType: parsed.data.businessType as BusinessType,
      productOrServiceName: parsed.data.productOrServiceName,
      description: parsed.data.description || null,
      requiredStamps: parsed.data.requiredStamps,
      startingBonusStamps: parsed.data.startingBonusStamps,
      referralRewardBonusStamps: parsed.data.referralRewardBonusStamps,
      cardTheme: parsed.data.cardTheme,
      rewardName: parsed.data.rewardName,
      rewardDescription: parsed.data.rewardDescription,
      active: parsed.data.active,
      startDate: parseProgramDate(parsed.data.startDate),
      endDate: parseProgramDate(parsed.data.endDate),
    },
    select: { uuid: true },
  });
  await logAuditEvent({
    actorUserId: user.id,
    businessId: user.businessId,
    action: "PROGRAM_CREATED",
    entityType: "loyalty_program",
    entityId: program.uuid,
    metadata: { active: parsed.data.active, requiredStamps: parsed.data.requiredStamps },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/programs");
  redirect(`/dashboard/programs/${program.uuid}?success=Program created.`);
}

export async function updateProgramAction(formData: FormData) {
  validateActionSecurity(formData, "dashboard:programs", "/dashboard/programs");
  const user = await requireBusinessOwner();
  const uuid = getString(formData, "programUuid");
  const path = `/dashboard/programs/${uuid}/edit`;
  if (!uuid) fail("/dashboard/programs", "Program not found.");
  const parsed = programData(formData);
  if (!parsed.success) fail(path, parsed.error.issues[0]?.message ?? "Validation failed.");

  const program = await prisma.loyaltyProgram.findFirst({
    where: { uuid, businessId: user.businessId },
    select: { id: true },
  });
  if (!program) fail("/dashboard/programs", "Program not found.");

  await prisma.loyaltyProgram.update({
    where: { id: program.id },
    data: {
      name: parsed.data.name,
      businessType: parsed.data.businessType as BusinessType,
      productOrServiceName: parsed.data.productOrServiceName,
      description: parsed.data.description || null,
      requiredStamps: parsed.data.requiredStamps,
      startingBonusStamps: parsed.data.startingBonusStamps,
      referralRewardBonusStamps: parsed.data.referralRewardBonusStamps,
      cardTheme: parsed.data.cardTheme,
      rewardName: parsed.data.rewardName,
      rewardDescription: parsed.data.rewardDescription,
      active: parsed.data.active,
      startDate: parseProgramDate(parsed.data.startDate),
      endDate: parseProgramDate(parsed.data.endDate),
    },
  });
  await logAuditEvent({
    actorUserId: user.id,
    businessId: user.businessId,
    action: "PROGRAM_UPDATED",
    entityType: "loyalty_program",
    entityId: program.id,
    metadata: { active: parsed.data.active, requiredStamps: parsed.data.requiredStamps },
  });

  revalidatePath("/dashboard/programs");
  revalidatePath(`/dashboard/programs/${uuid}`);
  redirect(`/dashboard/programs/${uuid}?success=Program updated.`);
}

export async function toggleProgramAction(formData: FormData) {
  validateActionSecurity(formData, "dashboard:programs", "/dashboard/programs");
  const user = await requireBusinessOwner();
  const uuid = getString(formData, "programUuid");
  const active = getString(formData, "active") === "true";

  const program = await prisma.loyaltyProgram.findFirst({
    where: { uuid, businessId: user.businessId },
    select: { id: true },
  });
  if (!program) fail("/dashboard/programs", "Program not found.");

  await prisma.loyaltyProgram.update({
    where: { id: program.id },
    data: { active },
  });
  await logAuditEvent({
    actorUserId: user.id,
    businessId: user.businessId,
    action: "PROGRAM_UPDATED",
    entityType: "loyalty_program",
    entityId: program.id,
    metadata: { active },
  });

  revalidatePath("/dashboard/programs");
  revalidatePath(`/dashboard/programs/${uuid}`);
  redirect(`/dashboard/programs/${uuid}?success=Program status updated.`);
}

export async function enrollCustomerInProgramAction(formData: FormData) {
  validateActionSecurity(formData, "dashboard:program-enrollment", "/dashboard/programs");
  const user = await requireBusinessOwner();
  const programUuid = getString(formData, "programUuid");
  const membershipUuid = getString(formData, "membershipUuid");
  const path = `/dashboard/programs/${programUuid}/customers`;
  if (!programUuid || !membershipUuid) fail(path, "Customer is required.");

  const program = await prisma.loyaltyProgram.findFirst({
    where: { uuid: programUuid, businessId: user.businessId, active: true },
    select: { id: true, name: true, rewardName: true, startingBonusStamps: true },
  });
  if (!program) fail("/dashboard/programs", "Program not found.");

  const membership = await prisma.businessCustomerMembership.findFirst({
    where: { uuid: membershipUuid, businessId: user.businessId, status: "ACTIVE" },
    select: { id: true },
  });
  if (!membership) fail(path, "Customer not found.");

  try {
    await prisma.$transaction(async (tx) => {
      const programMembership = await tx.customerProgramMembership.create({
      data: {
        businessCustomerMembershipId: membership.id,
        loyaltyProgramId: program.id,
        earnedStamps: 0,
        bonusStamps: program.startingBonusStamps,
        enrollmentSource: "OWNER",
        status: "ACTIVE",
        scanToken: generateScanToken(),
        scanStatus: "ACTIVE",
        scanCreatedAt: new Date(),
      },
      select: { id: true },
    });
      await createEngagementEventIfAllowed({
        tx,
        businessId: user.businessId,
        customerId: membership.id,
        eventType: "WELCOME_CUSTOMER",
        metadata: {
          programMembershipId: programMembership.id,
          programName: program.name,
          rewardName: program.rewardName,
        },
      });
    });
  } catch {
    fail(path, "Customer is already enrolled in this program.");
  }

  revalidatePath(path);
  redirect(`${path}?success=Customer enrolled.`);
}

