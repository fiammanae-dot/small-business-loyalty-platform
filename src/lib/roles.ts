import type { UserRole } from "@prisma/client";

export const roleLabels: Record<UserRole, string> = {
  PLATFORM_OWNER: "System Administrator",
  BUSINESS_OWNER: "Business Owner",
  BRANCH_MANAGER: "Branch Manager",
  STAFF: "Staff",
};

export function getDisplayUserName(user: { name: string; role?: UserRole | string }) {
  const legacySeedName = ["platform", "owner"].join(" ");

  if (user.role === "PLATFORM_OWNER" && user.name.trim().toLowerCase() === legacySeedName) {
    return roleLabels.PLATFORM_OWNER;
  }

  return user.name;
}

export const roleHomePath: Record<UserRole, string> = {
  PLATFORM_OWNER: "/platform",
  BUSINESS_OWNER: "/dashboard",
  BRANCH_MANAGER: "/branch",
  STAFF: "/staff",
};

export const businessTypeLabels = {
  COFFEE_SHOP: "Coffee Shop",
  RESTAURANT: "Restaurant",
  BARBERSHOP: "Barbershop",
  BEAUTY_SALON: "Beauty Salon",
  CAR_CARE_CENTER: "Car Care Center",
  OTHER: "Other",
} as const;
