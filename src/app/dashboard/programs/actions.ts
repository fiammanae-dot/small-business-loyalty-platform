"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { requireBusinessOwner } from "@/lib/business-owner";
import { logAuditEvent } from "@/lib/audit";
import { validateCsrfForm } from "@/lib/csrf";
import { requireUsableSubscription } from "@/lib/commercial-access";
import { createEngagementEventIfAllowed } from "@/lib/engagement";
import { prisma } from "@/lib/prisma";
import { getIndustryDefaultCardTheme } from "@/lib/card-design";
import { buildProgramCardDesign, getCardThemeForDesignStudioTemplate, parseDesignStudioForm } from "@/lib/design-studio";
import { getStartingBonusStampsForEvent, parseProgramDate, programSchema } from "@/lib/programs";
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

function programData(formData: FormData, businessType: string, defaultCardTheme = "BUSINESS_DEFAULT") {
  const parsed = programSchema.safeParse({
    name: getString(formData, "name"),
    businessType,
    productOrServiceName: getString(formData, "productOrServiceName"),
    description: getString(formData, "description"),
    requiredStamps: getString(formData, "requiredStamps"),
    startingBonusStamps: getString(formData, "startingBonusStamps") || "0",
    startingStampPolicy: getString(formData, "startingStampPolicy") || "FIRST_ENROLLMENT_ONLY",
    referralRewardBonusStamps: getString(formData, "referralRewardBonusStamps") || "1",
    cardTheme: getString(formData, "cardTheme") || defaultCardTheme,
    rewardName: getString(formData, "rewardName"),
    rewardDescription: getString(formData, "rewardDescription"),
    active: getString(formData, "active") === "true",
    startDate: getString(formData, "startDate"),
    endDate: getString(formData, "endDate"),
  });

  return parsed;
}

async function getBusinessTypeForProgramAction(businessId: number, path: string) {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { businessType: true },
  });
  if (!business) fail(path, "Business not found.");
  return business.businessType;
}

export async function createProgramAction(formData: FormData) {
  validateActionSecurity(formData, "dashboard:programs", "/dashboard/programs/new");
  const user = await requireBusinessOwner();
  await requireUsableSubscription(user.businessId).catch((error) => fail("/dashboard/programs/new", error.message));
  const path = "/dashboard/programs/new";
  const businessType = await getBusinessTypeForProgramAction(user.businessId, path);
  const parsed = programData(formData, businessType, getIndustryDefaultCardTheme(businessType));
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
      businessType: parsed.data.businessType,
      productOrServiceName: parsed.data.productOrServiceName,
      description: parsed.data.description || null,
      requiredStamps: parsed.data.requiredStamps,
      startingBonusStamps: parsed.data.startingBonusStamps,
      startingStampPolicy: parsed.data.startingStampPolicy,
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
  redirect(`/dashboard/programs/${program.uuid}/design-studio?success=Program created. Customize this card in Design Studio.`);
}

export async function updateProgramAction(formData: FormData) {
  validateActionSecurity(formData, "dashboard:programs", "/dashboard/programs");
  const user = await requireBusinessOwner();
  const uuid = getString(formData, "programUuid");
  const path = `/dashboard/programs/${uuid}/edit`;
  if (!uuid) fail("/dashboard/programs", "Program not found.");
  const businessType = await getBusinessTypeForProgramAction(user.businessId, path);
  const parsed = programData(formData, businessType);
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
      businessType: parsed.data.businessType,
      productOrServiceName: parsed.data.productOrServiceName,
      description: parsed.data.description || null,
      requiredStamps: parsed.data.requiredStamps,
      startingBonusStamps: parsed.data.startingBonusStamps,
      startingStampPolicy: parsed.data.startingStampPolicy,
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

export async function updateProgramDesignStudioAction(formData: FormData) {
  validateActionSecurity(formData, "dashboard:program-design-studio", "/dashboard/programs");
  const user = await requireBusinessOwner();
  const uuid = getString(formData, "programUuid");
  const path = `/dashboard/programs/${uuid}/design-studio`;
  if (!uuid) fail("/dashboard/programs", "Program not found.");

  const program = await prisma.loyaltyProgram.findFirst({
    where: { uuid, businessId: user.businessId },
    select: { id: true, uuid: true, businessType: true, cardDesign: true },
  });
  if (!program) fail("/dashboard/programs", "Program not found.");

  const parsed = parseDesignStudioForm(formData, program.businessType);
  if (!parsed.success) fail(path, parsed.error.issues[0]?.message ?? "Design selection is invalid.");

  const cardDesign = buildProgramCardDesign(parsed.data, program.cardDesign);
  await prisma.loyaltyProgram.update({
    where: { id: program.id },
    data: {
      cardDesign: cardDesign as unknown as Prisma.InputJsonValue,
      cardTheme: getCardThemeForDesignStudioTemplate(parsed.data.layoutStyle),
    },
  });
  await logAuditEvent({
    actorUserId: user.id,
    businessId: user.businessId,
    action: "PROGRAM_DESIGN_UPDATED",
    entityType: "loyalty_program",
    entityId: program.uuid,
    metadata: {
      layoutStyle: cardDesign.layoutStyle,
      stampJourneyStyle: cardDesign.stampJourneyStyle,
      stampIcon: cardDesign.stampIcon,
    },
  });

  revalidatePath(`/dashboard/programs/${uuid}`);
  revalidatePath(path);
  redirect(`${path}?success=Design Studio settings saved.`);
}

export async function saveBusinessDesignPresetAction(formData: FormData) {
  validateActionSecurity(formData, "dashboard:program-design-studio", "/dashboard/programs");
  const user = await requireBusinessOwner();
  const uuid = getString(formData, "programUuid");
  const path = `/dashboard/programs/${uuid}/design-studio`;
  const name = getString(formData, "presetName").trim();
  if (!uuid) fail("/dashboard/programs", "Program not found.");
  if (!name) fail(path, "Preset name is required.");
  if (name.length > 80) fail(path, "Preset name must be 80 characters or fewer.");

  const program = await prisma.loyaltyProgram.findFirst({
    where: { uuid, businessId: user.businessId },
    select: { id: true, uuid: true, businessType: true, cardDesign: true },
  });
  if (!program) fail("/dashboard/programs", "Program not found.");

  const parsed = parseDesignStudioForm(formData, program.businessType);
  if (!parsed.success) fail(path, parsed.error.issues[0]?.message ?? "Design selection is invalid.");
  const cardDesign = buildProgramCardDesign(parsed.data, program.cardDesign);

  try {
    await prisma.businessDesignPreset.create({
      data: {
        businessId: user.businessId,
        name,
        cardDesign: cardDesign as unknown as Prisma.InputJsonValue,
      },
    });
  } catch {
    fail(path, "A preset with this name already exists.");
  }

  await logAuditEvent({
    actorUserId: user.id,
    businessId: user.businessId,
    action: "BUSINESS_DESIGN_PRESET_CREATED",
    entityType: "business_design_preset",
    metadata: { name },
  });
  revalidatePath(path);
  redirect(`${path}?success=Business preset saved.`);
}

export async function renameBusinessDesignPresetAction(formData: FormData) {
  validateActionSecurity(formData, "dashboard:program-design-studio", "/dashboard/programs");
  const user = await requireBusinessOwner();
  const programUuid = getString(formData, "programUuid");
  const presetUuid = getString(formData, "presetUuid");
  const name = (getString(formData, `renamePresetName:${presetUuid}`) || getString(formData, "renamePresetName")).trim();
  const path = `/dashboard/programs/${programUuid}/design-studio`;
  if (!programUuid) fail("/dashboard/programs", "Program not found.");
  if (!presetUuid) fail(path, "Preset not found.");
  if (!name) fail(path, "Preset name is required.");
  if (name.length > 80) fail(path, "Preset name must be 80 characters or fewer.");

  try {
    const updated = await prisma.businessDesignPreset.updateMany({
      where: { uuid: presetUuid, businessId: user.businessId },
      data: { name },
    });
    if (updated.count === 0) fail(path, "Preset not found.");
  } catch {
    fail(path, "A preset with this name already exists.");
  }

  await logAuditEvent({
    actorUserId: user.id,
    businessId: user.businessId,
    action: "BUSINESS_DESIGN_PRESET_RENAMED",
    entityType: "business_design_preset",
    entityId: presetUuid,
    metadata: { name },
  });
  revalidatePath(path);
  redirect(`${path}?success=Business preset renamed.`);
}

export async function deleteBusinessDesignPresetAction(formData: FormData) {
  validateActionSecurity(formData, "dashboard:program-design-studio", "/dashboard/programs");
  const user = await requireBusinessOwner();
  const programUuid = getString(formData, "programUuid");
  const presetUuid = getString(formData, "presetUuid");
  const path = `/dashboard/programs/${programUuid}/design-studio`;
  if (!programUuid) fail("/dashboard/programs", "Program not found.");
  if (!presetUuid) fail(path, "Preset not found.");

  const deleted = await prisma.businessDesignPreset.deleteMany({
    where: { uuid: presetUuid, businessId: user.businessId },
  });
  if (deleted.count === 0) fail(path, "Preset not found.");

  await logAuditEvent({
    actorUserId: user.id,
    businessId: user.businessId,
    action: "BUSINESS_DESIGN_PRESET_DELETED",
    entityType: "business_design_preset",
    entityId: presetUuid,
  });
  revalidatePath(path);
  redirect(`${path}?success=Business preset deleted.`);
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
    select: { id: true, name: true, rewardName: true, startingBonusStamps: true, startingStampPolicy: true },
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
        bonusStamps: getStartingBonusStampsForEvent({
          startingBonusStamps: program.startingBonusStamps,
          startingStampPolicy: program.startingStampPolicy,
          event: "INITIAL_ENROLLMENT",
        }),
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

