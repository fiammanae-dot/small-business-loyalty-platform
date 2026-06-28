import { LoyaltyWalletCard, type LoyaltyWalletCardProps } from "@/components/public-card/LoyaltyWalletCard";

export function LoyaltyCardExport({ wallet }: { wallet: Omit<LoyaltyWalletCardProps, "exportMode"> }) {
  return (
    <div className="w-[360px] bg-transparent">
      <LoyaltyWalletCard {...wallet} exportMode />
    </div>
  );
}
