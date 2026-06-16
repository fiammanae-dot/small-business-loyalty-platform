export const subscriptionPlans = [
  {
    code: "STARTER",
    name: "Starter",
    maxBranches: 1,
    maxLoyaltyPrograms: 1,
    monthlyPrice: "100.00",
    annualPrice: "1000.00",
    billingCycleSupport: ["MONTHLY", "YEARLY"],
  },
  {
    code: "GROWTH",
    name: "Growth",
    maxBranches: 3,
    maxLoyaltyPrograms: 5,
    monthlyPrice: "200.00",
    annualPrice: "2000.00",
    billingCycleSupport: ["MONTHLY", "YEARLY"],
  },
  {
    code: "MULTI_BRANCH",
    name: "Multi Branch",
    maxBranches: 10,
    maxLoyaltyPrograms: 15,
    monthlyPrice: "0.00",
    annualPrice: "1000.00",
    billingCycleSupport: ["YEARLY"],
  },
];
