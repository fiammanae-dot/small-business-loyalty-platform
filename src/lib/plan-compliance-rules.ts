/**
 * Plan compliance rules: is a business using more than it pays for? Pure
 * functions over counts (no database), shared by the owner dashboard and the
 * System Administrator's business list.
 *
 * Two kinds of finding:
 * - OVER_LIMIT: hard counts above the plan (more branches or active staff
 *   logins than allowed). Certain.
 * - REVIEW: signs that one branch may be used in more than one shop - activity
 *   at more branches than the plan allows, many scanner devices, scans from
 *   several cities, or scans from two cities within minutes. These are signals
 *   for a person to look at, never proof: phones on mobile data can appear in
 *   a neighbouring emirate.
 */
export type ComplianceStatus = "COMPLIANT" | "REVIEW" | "OVER_LIMIT";

export type ComplianceFacts = {
  maxBranches: number;
  maxStaff: number;
  branchCount: number;
  activeStaffCount: number;
  /** Branches with stamps, scans, joins or redemptions in the last 30 days. */
  activityBranchCount: number;
  /** Branches that active Staff / Branch Managers are assigned to. */
  assignedBranchCount: number;
  missingAssignmentCount: number;
  /** Different browsers (device id cookie) that scanned in the last 30 days. */
  scannerDeviceCount: number;
  /** Cities the scanners' IPs mapped to in the last 30 days. */
  scanCities: string[];
  /** Times two scans of the same branch came from different cities within 30 minutes. */
  cityJumps: number;
};

export type ComplianceResult = {
  status: ComplianceStatus;
  score: number;
  issues: string[];
};

/** Scans from two cities within this many minutes count as a "jump". */
export const CITY_JUMP_MINUTES = 30;
/** This many jumps in 30 days is worth a look. */
export const CITY_JUMP_REVIEW_THRESHOLD = 3;

/** Scanner devices a business can reasonably use: one per staff login plus one per branch for the owner. */
export function scannerDeviceAllowance(maxStaff: number, maxBranches: number) {
  return maxStaff + maxBranches;
}

const plural = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;

export function evaluatePlanCompliance(facts: ComplianceFacts): ComplianceResult {
  const overLimit: string[] = [];
  const review: string[] = [];

  if (facts.branchCount > facts.maxBranches) {
    overLimit.push(`${plural(facts.branchCount, "branch", "branches")} set up; the plan allows ${facts.maxBranches}.`);
  }
  if (facts.activeStaffCount > facts.maxStaff) {
    overLimit.push(`${plural(facts.activeStaffCount, "active staff login")}; the plan allows ${facts.maxStaff}.`);
  }

  if (facts.activityBranchCount > facts.maxBranches) {
    review.push(`Activity at ${plural(facts.activityBranchCount, "branch", "branches")} in the last 30 days; the plan allows ${facts.maxBranches}.`);
  }
  if (facts.assignedBranchCount > facts.maxBranches) {
    review.push(`Staff are assigned to ${plural(facts.assignedBranchCount, "branch", "branches")}; the plan allows ${facts.maxBranches}.`);
  }
  const deviceAllowance = scannerDeviceAllowance(facts.maxStaff, facts.maxBranches);
  if (facts.scannerDeviceCount > deviceAllowance) {
    review.push(`${plural(facts.scannerDeviceCount, "different scanner device")} in the last 30 days (about ${deviceAllowance} expected).`);
  }
  if (facts.cityJumps >= CITY_JUMP_REVIEW_THRESHOLD) {
    review.push(`${plural(facts.cityJumps, "time")} in 30 days, one branch scanned from two cities within ${CITY_JUMP_MINUTES} minutes.`);
  }
  if (facts.scanCities.length > facts.maxBranches + 1) {
    review.push(`Scans came from ${facts.scanCities.length} cities: ${facts.scanCities.join(", ")}.`);
  }
  if (facts.missingAssignmentCount > 0) {
    review.push(`${plural(facts.missingAssignmentCount, "staff login")} without a branch.`);
  }

  const issues = [...overLimit, ...review];
  return {
    status: overLimit.length > 0 ? "OVER_LIMIT" : review.length > 0 ? "REVIEW" : "COMPLIANT",
    score: Math.max(0, 100 - issues.length * 25),
    issues,
  };
}

export function complianceStatusLabel(status: ComplianceStatus) {
  return status === "OVER_LIMIT" ? "Over plan limit" : status === "REVIEW" ? "Needs review" : "Within plan";
}
