import "server-only";

import { prisma } from "@/lib/prisma";
import { parseReferralSettingsInput, toView, type ReferralSettingsView } from "@/lib/referral-settings-rules";

export type { ReferralSettingsView } from "@/lib/referral-settings-rules";
export { parseReferralSettingsInput, describeReferralReward, toView } from "@/lib/referral-settings-rules";

/**
 * The business's referral reward. One per business, whatever program the
 * friend's first activity lands in. A business without a row rewards nothing
 * (the migration gave every existing business the reward it already had).
 */
export async function getReferralSettings(businessId: number): Promise<ReferralSettingsView> {
  const row = await prisma.businessReferralSettings.findUnique({
    where: { businessId },
    include: { stampProgram: { select: { id: true, name: true, active: true, isMembership: true } } },
  });
  return toView(row);
}

/** Stamp programs the reward can be attached to: active and not a package. */
export async function listReferralRewardPrograms(businessId: number) {
  return prisma.loyaltyProgram.findMany({
    where: { businessId, active: true, isMembership: false },
    select: { id: true, name: true },
    orderBy: { id: "asc" },
  });
}

export async function saveReferralSettings(businessId: number, input: Record<string, string>) {
  const [programs, cashback] = await Promise.all([
    listReferralRewardPrograms(businessId),
    prisma.businessCashbackSettings.findUnique({ where: { businessId }, select: { enabled: true } }),
  ]);
  const parsed = parseReferralSettingsInput(input, { programIds: programs.map((program) => program.id), cashbackEnabled: Boolean(cashback?.enabled) });
  if (!parsed.ok) return parsed;
  await prisma.businessReferralSettings.upsert({
    where: { businessId },
    create: { businessId, ...parsed.data },
    update: parsed.data,
  });
  return parsed;
}
