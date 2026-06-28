"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireActiveBranch, requireUsableSubscription } from "@/lib/commercial-access";
import { validateCsrfForm } from "@/lib/csrf";
import { createEngagementEventIfAllowed } from "@/lib/engagement";
import { prisma } from "@/lib/prisma";
import { generateScanToken } from "@/lib/scan";
import { requireRole } from "@/lib/session";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

export async function enrollBranchCustomerInProgramAction(formData: FormData) {
  try {
    validateCsrfForm(formData, "branch:program-enrollment");
  } catch {
    fail("/branch/programs", "Security check failed. Please refresh and try again.");
  }

  const user = await requireRole("BRANCH_MANAGER");
  if (!user.businessId || !user.branchId) fail("/branch/programs", "Branch assignment is required.");
  await requireUsableSubscription(user.businessId).catch((error) => fail("/branch/programs", error.message));
  await requireActiveBranch(user.branchId, user.businessId).catch((error) => fail("/branch/programs", error.message));

  const programUuid = getString(formData, "programUuid");
  const membershipUuid = getString(formData, "membershipUuid");
  const path = `/branch/programs/${programUuid}/customers`;
  if (!programUuid || !membershipUuid) fail(path, "Customer is required.");

  const program = await prisma.loyaltyProgram.findFirst({
    where: { uuid: programUuid, businessId: user.businessId, active: true },
    select: { id: true, name: true, rewardName: true, startingBonusStamps: true },
  });
  if (!program) fail("/branch/programs", "Program not found.");

  const membership = await prisma.businessCustomerMembership.findFirst({
    where: {
      uuid: membershipUuid,
      businessId: user.businessId,
      createdBranchId: user.branchId,
      status: "ACTIVE",
    },
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
          enrollmentSource: "BRANCH_MANAGER",
          status: "ACTIVE",
          scanToken: generateScanToken(),
          scanStatus: "ACTIVE",
          scanCreatedAt: new Date(),
        },
        select: { id: true },
      });
      await createEngagementEventIfAllowed({
        tx,
        businessId: user.businessId as number,
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
