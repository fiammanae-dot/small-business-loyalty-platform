export const subscriptionPlans = [
  {
    name: "Starter",
    maxBranches: 1,
    maxLoyaltyPrograms: 1,
    features: ["Basic customer database", "QR loyalty card", "WhatsApp reminder"],
    priceMonthly: "29.00",
  },
  {
    name: "Growth",
    maxBranches: 3,
    maxLoyaltyPrograms: 10,
    features: [
      "Multiple loyalty programs",
      "Referral program",
      "Customer segments",
      "Birthday rewards",
      "Basic analytics",
    ],
    priceMonthly: "79.00",
  },
  {
    name: "Multi-Branch",
    maxBranches: 10,
    maxLoyaltyPrograms: 25,
    features: [
      "Multiple branches",
      "Multiple loyalty programs",
      "Referral program support (future)",
      "Birthday rewards (future)",
      "Multi-branch reporting (future)",
    ],
    priceMonthly: "0.00",
  },
  {
    name: "Premium",
    maxBranches: 25,
    maxLoyaltyPrograms: 50,
    features: [
      "Everything in Multi-Branch",
      "Advanced reporting (future)",
      "Priority support (future)",
    ],
    priceMonthly: "0.00",
  },
];
