import { Avatar, Card, CardContent, StatusBadge } from "@/components/ui";

export function CustomerSummaryCard({
  name,
  phone,
  tier,
  status,
  cardNumber,
}: {
  name: string;
  phone?: string | null;
  tier?: string | null;
  status?: string | null;
  cardNumber?: string | null;
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3">
        <Avatar name={name} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-[#0F172A]">{name}</h3>
          {phone ? <p className="mt-1 text-sm text-[#64748B]">{phone}</p> : null}
          <div className="mt-3 flex flex-wrap gap-2">
            {tier ? <StatusBadge tone="brand">{tier}</StatusBadge> : null}
            {status ? <StatusBadge tone={status === "ACTIVE" ? "success" : "neutral"}>{status}</StatusBadge> : null}
          </div>
          {cardNumber ? <p className="mt-3 text-xs text-[#64748B]">Card {cardNumber}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}
