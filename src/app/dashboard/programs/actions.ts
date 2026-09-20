"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { requireBusinessOwner } from "@/lib/business-owner";
import { logAuditEvent } from "@/lib/audit";
import { validateCsrfForm } from "@/lib/csrf";
import { requireUsableSubscription } from "@/lib/commercial-access";
import { createEngagementEventIfAllowed } from "@/lib/engagement";
import { scheduleWelcomeCardMessage } from "@/lib/whatsapp/send-welcome-card";
import { prisma } from "@/lib/prisma";
import { asCardDesignInput, getIndustryDefaultCardTheme } from "@/lib/card-design";
import { buildProgramCardDesign, getCardThemeForDesignStudioTemplate, parseDesignStudioForm } from "@/lib/design-studio";
import { getStartingBonusStampsForEvent, parseProgramDate, programSchema } from "@/lib/programs";
import {
  buildProgramRewardRows,
  checkMilestones,
  programMilestoneSchema,
  readMilestoneFormRows,
  type ProgramMilestoneInput,
  type ProgramRewardRow,
} from "@/lib/program-rewards";
import { generateScanToken } from "@/lib/scan";
import { commerciallyUsableStatuses, limitReachedMessage } from "@/lib/subscriptions";
import { summarizeWalletSyncForUser, syncWalletProvidersForProgram } from "@/lib/wallet-sync";
import { hasWalletRelevantProgramChange } from "@/lib/wallet-sync/change-detection";
import { enqueueWalletSync } from "@/lib/wallet-sync/enqueue";

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
    stampEmoji: getString(formData, "stampEmoji") || null,
    walletHeroStyle: getString(formData, "walletHeroStyle") || "STAMPS",
    walletPhotoUrl: getString(formData, "walletPhotoUrl") || null,
    rewardName: getString(formData, "rewardName"),
    rewardDescription: getString(formData, "rewardDescription"),
    active: getString(formData, "active") === "true",
    startDate: getString(formData, "startDate"),
    endDate: getString(formData, "endDate"),
  });

  return parsed;
}

/**
 * Parses and validates the repeatable milestone rows, failing with a sentence
 * rather than letting the database's unique constraint surface as a 500.
 */
function milestonesFromForm(formData: FormData, requiredStamps: number, path: string): ProgramMilestoneInput[] {
  const milestones: ProgramMilestoneInput[] = [];
  for (const row of readMilestoneFormRows(formData)) {
    const parsed = programMilestoneSchema.safeParse(row);
    if (!parsed.success) fail(path, parsed.error.issues[0]?.message ?? "A milestone reward is invalid.");
    milestones.push(parsed.data);
  }
  const problem = checkMilestones(milestones, requiredStamps);
  if (problem) fail(path, problem);
  return milestones;
}

/**
 * Rewrites a program's rewards to match the form exactly.
 *
 * Deletes what is gone, upserts what remains, in one transaction with the
 * program itself - a program whose rewards half-saved would show customers a
 * card that does not exist. Rewards are matched by atStamp, which is also the
 * database's unique key, so an owner moving a milestone from visit 5 to 6 is a
 * delete plus an insert rather than a silent duplicate.
 */
async function syncProgramRewards(
  tx: Prisma.TransactionClient,
  programId: number,
  rows: ProgramRewardRow[],
) {
  const keep = rows.map((row) => row.atStamp);
  await tx.programReward.deleteMany({
    where: { loyaltyProgramId: programId, atStamp: { notIn: keep.length ? keep : [-1] } },
  });
  for (const row of rows) {
    await tx.programReward.upsert({
      where: { loyaltyProgramId_atStamp: { loyaltyProgramId: programId, atStamp: row.atStamp } },
      create: { loyaltyProgramId: programId, ...row },
      update: { rewardName: row.rewardName, rewardDescription: row.rewardDescription, completesCard: row.completesCard },
    });
  }
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
  const parsedDesign = parseDesignStudioForm(formData, businessType);
  if (!parsedDesign.success) fail(path, parsedDesign.error.issues[0]?.message ?? "Design selection is invalid.");
  const cardDesign = buildProgramCardDesign(parsedDesign.data);

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

  const milestones = milestonesFromForm(formData, parsed.data.requiredStamps, path);

  const program = await prisma.$transaction(async (tx) => {
    const created = await tx.loyaltyProgram.create({
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
      stampEmoji: parsed.data.stampEmoji,
      walletHeroStyle: parsed.data.walletHeroStyle,
      walletPhotoUrl: parsed.data.walletPhotoUrl,
      rewardName: parsed.data.rewardName,
      rewardDescription: parsed.data.rewardDescription,
      active: parsed.data.active,
      startDate: parseProgramDate(parsed.data.startDate),
      endDate: parseProgramDate(parsed.data.endDate),
      cardDesign: cardDesign as unknown as Prisma.InputJsonValue,
      cardTheme: getCardThemeForDesignStudioTemplate(parsedDesign.data.layoutStyle),
    },
    select: { id: true, uuid: true },
    });

    // A program without its rewards would fall back to a single completing
    // reward and quietly lose every milestone the owner just typed.
    await syncProgramRewards(
      tx,
      created.id,
      buildProgramRewardRows({
        requiredStamps: parsed.data.requiredStamps,
        rewardName: parsed.data.rewardName,
        rewardDescription: parsed.data.rewardDescription,
        milestones,
      }),
    );

    return created;
  });
  await logAuditEvent({
    actorUserId: user.id,
    businessId: user.businessId,
    action: "PROGRAM_CREATED",
    entityType: "loyalty_program",
    entityId: program.uuid,
    metadata: { active: parsed.data.active, requiredStamps: parsed.data.requiredStamps },
  });

  enqueueWalletSync({ programId: program.id, programUuid: program.uuid, businessId: user.businessId, trigger: "program-created" });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/programs");
  redirect(`/dashboard/programs/${program.uuid}?success=Program created with card design.`);
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
    select: {
      id: true,
      name: true,
      rewardName: true,
      cardTheme: true,
      stampEmoji: true,
      walletHeroStyle: true,
      walletPhotoUrl: true,
      active: true,
    },
  });
  if (!program) fail("/dashboard/programs", "Program not found.");

  const milestones = milestonesFromForm(formData, parsed.data.requiredStamps, path);

  await prisma.$transaction(async (tx) => {
    await tx.loyaltyProgram.update({
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
      stampEmoji: parsed.data.stampEmoji,
      walletHeroStyle: parsed.data.walletHeroStyle,
      walletPhotoUrl: parsed.data.walletPhotoUrl,
      rewardName: parsed.data.rewardName,
      rewardDescription: parsed.data.rewardDescription,
      active: parsed.data.active,
      startDate: parseProgramDate(parsed.data.startDate),
      endDate: parseProgramDate(parsed.data.endDate),
    },
    });

    // Same transaction as the program: a card whose rewards half-saved would
    // show customers something that does not exist.
    await syncProgramRewards(
      tx,
      program.id,
      buildProgramRewardRows({
        requiredStamps: parsed.data.requiredStamps,
        rewardName: parsed.data.rewardName,
        rewardDescription: parsed.data.rewardDescription,
        milestones,
      }),
    );
  });
  await logAuditEvent({
    actorUserId: user.id,
    businessId: user.businessId,
    action: "PROGRAM_UPDATED",
    entityType: "loyalty_program",
    entityId: program.id,
    metadata: { active: parsed.data.active, requiredStamps: parsed.data.requiredStamps },
  });

  if (
    hasWalletRelevantProgramChange(program, {
      name: parsed.data.name,
      rewardName: parsed.data.rewardName,
      cardTheme: parsed.data.cardTheme,
      stampEmoji: parsed.data.stampEmoji,
      walletHeroStyle: parsed.data.walletHeroStyle,
      walletPhotoUrl: parsed.data.walletPhotoUrl,
      active: parsed.data.active,
    })
  ) {
    enqueueWalletSync({ programId: program.id, programUuid: uuid, businessId: user.businessId, trigger: "program-settings" });
  }

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
    select: { id: true, active: true },
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

  if (program.active !== active) {
    enqueueWalletSync({ programId: program.id, programUuid: uuid, businessId: user.businessId, trigger: "program-toggle" });
  }

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

  const cardDesign = buildProgramCardDesign(parsed.data, asCardDesignInput(program.cardDesign));
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
  revalidatePath("/dashboard/customers");
  revalidatePath("/dashboard/customers/[id]", "page");
  revalidatePath("/card/[token]", "page");

  const walletOutcomes = await synchronizeWalletProvidersSafely({
    programId: program.id,
    programUuid: program.uuid,
    businessId: user.businessId,
  });
  const walletSummary = summarizeWalletSyncForUser(walletOutcomes);
  const successMessage = walletSummary ? `Design Studio settings saved. ${walletSummary}` : "Design Studio settings saved.";

  redirect(`${path}?success=${encodeURIComponent(successMessage)}`);
}

async function synchronizeWalletProvidersSafely(context: Parameters<typeof syncWalletProvidersForProgram>[0]) {
  try {
    return await syncWalletProvidersForProgram(context);
  } catch (error) {
    console.warn("[wallet-sync] unexpected failure during Design Studio save", error);
    return [];
  }
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
  const cardDesign = buildProgramCardDesign(parsed.data, asCardDesignInput(program.cardDesign));

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

  scheduleWelcomeCardMessage({ businessId: user.businessId, membershipId: membership.id });

  revalidatePath(path);
  redirect(`${path}?success=Customer enrolled.`);
}

