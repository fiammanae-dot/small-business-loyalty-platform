import { complianceStatusLabel, type ComplianceStatus } from "@/lib/plan-compliance-rules";

const styles: Record<ComplianceStatus, string> = {
  COMPLIANT: "border-[#BFE6D6] bg-[#E8F6F0] text-[#0F6E4F]",
  REVIEW: "border-[#F3D9A4] bg-[#FCF0DC] text-[#B25E09]",
  OVER_LIMIT: "border-[#F5C2C0] bg-[#FDECEB] text-[#B42318]",
};

/** "Within plan" / "Needs review" / "Over plan limit", with the reasons as a tooltip. */
export function PlanCheckBadge({ status, issues = [] }: { status: ComplianceStatus; issues?: string[] }) {
  return (
    <span
      title={issues.length ? issues.join("\n") : undefined}
      className={`inline-flex w-fit items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${styles[status]}`}
    >
      {complianceStatusLabel(status)}
    </span>
  );
}
