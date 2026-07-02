import { LoyaltyWalletCard, type LoyaltyWalletCardProps } from "@/components/public-card/LoyaltyWalletCard";
import { resolveCardDesign } from "@/lib/card-design";

export function LoyaltyCardFrontExport({ wallet }: { wallet: Omit<LoyaltyWalletCardProps, "exportMode"> }) {
  const design = resolveCardDesign(wallet.cardDesign);

  return (
    <div className="w-[360px] bg-transparent">
      <LoyaltyWalletCard {...wallet} cardDesign={design} exportMode />
    </div>
  );
}
