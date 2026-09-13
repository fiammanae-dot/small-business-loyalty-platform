import { z } from "zod";

/**
 * Milestones a business owner configures on a program.
 *
 * The reward that COMPLETES the card is not in this list - it is the program's
 * own rewardName at requiredStamps, which is how it has always worked and what
 * every existing screen still reads. Milestones are the extra rewards before
 * that point. Keeping the completing reward out of the editable list means an
 * owner cannot accidentally delete it, or end up with two, or with none.
 */
export const programMilestoneSchema = z.object({
  atStamp: z.coerce.number().int().min(1, "A milestone must sit on visit 1 or later."),
  rewardName: z.string().trim().min(1, "Give the milestone reward a name."),
  rewardDescription: z.string().trim().optional(),
});

export type ProgramMilestoneInput = z.infer<typeof programMilestoneSchema>;

export type ProgramRewardRow = {
  atStamp: number;
  rewardName: string;
  rewardDescription: string;
  completesCard: boolean;
};

/** Reads the repeatable milestone rows off a program form. */
export function readMilestoneFormRows(formData: FormData): Array<{ atStamp: string; rewardName: string; rewardDescription: string }> {
  const stamps = formData.getAll("milestoneAtStamp");
  const names = formData.getAll("milestoneRewardName");
  const descriptions = formData.getAll("milestoneRewardDescription");

  return stamps
    .map((value, index) => ({
      atStamp: typeof value === "string" ? value.trim() : "",
      rewardName: typeof names[index] === "string" ? (names[index] as string).trim() : "",
      rewardDescription: typeof descriptions[index] === "string" ? (descriptions[index] as string).trim() : "",
    }))
    // A row the owner cleared out is a deletion, not an error.
    .filter((row) => row.atStamp !== "" || row.rewardName !== "");
}

/**
 * Validates milestones against the card they sit on.
 *
 * Returns a message, or null. The rules exist for concrete failures seen while
 * building this: a milestone at or past requiredStamps would compete with the
 * reward that completes the card, and two at the same visit would hit the
 * database's unique constraint as a 500 rather than a sentence.
 */
export function checkMilestones(
  milestones: ProgramMilestoneInput[],
  requiredStamps: number,
): string | null {
  for (const milestone of milestones) {
    if (milestone.atStamp >= requiredStamps) {
      return `A milestone must come before the card is complete. Visit ${milestone.atStamp} is not before visit ${requiredStamps}.`;
    }
  }

  const seen = new Set<number>();
  for (const milestone of milestones) {
    if (seen.has(milestone.atStamp)) {
      return `There are two rewards on visit ${milestone.atStamp}. Each visit can carry one.`;
    }
    seen.add(milestone.atStamp);
  }

  return null;
}

/**
 * The full card: milestones in order, then the reward that completes it.
 *
 * One function builds this for both create and update, so a program's rewards
 * can never drift from the program's own requiredStamps and rewardName.
 */
export function buildProgramRewardRows({
  requiredStamps,
  rewardName,
  rewardDescription,
  milestones,
}: {
  requiredStamps: number;
  rewardName: string;
  rewardDescription: string;
  milestones: ProgramMilestoneInput[];
}): ProgramRewardRow[] {
  const rows: ProgramRewardRow[] = milestones
    .map((milestone) => ({
      atStamp: milestone.atStamp,
      rewardName: milestone.rewardName,
      rewardDescription: milestone.rewardDescription || milestone.rewardName,
      completesCard: false,
    }))
    .sort((a, b) => a.atStamp - b.atStamp);

  rows.push({
    atStamp: Math.max(1, requiredStamps),
    rewardName,
    rewardDescription,
    completesCard: true,
  });

  return rows;
}
