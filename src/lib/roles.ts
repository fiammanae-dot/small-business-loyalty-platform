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

/**
 * The single list of business categories, in the order they are offered.
 *
 * Every form that validates a category reads this. Before it existed the list
 * was retyped in four places, so adding a category made it selectable in one
 * screen and rejected on save in another.
 */
export const businessTypeValues = [
  "COFFEE_SHOP",
  "RESTAURANT",
  "BARBERSHOP",
  "BEAUTY_SALON",
  "CAR_CARE_CENTER",
  "AESTHETIC_CLINIC",
  "OTHER",
] as const;

export const businessTypeLabels: Record<(typeof businessTypeValues)[number], string> = {
  COFFEE_SHOP: "Coffee Shop",
  RESTAURANT: "Restaurant",
  BARBERSHOP: "Barbershop",
  BEAUTY_SALON: "Beauty Salon",
  CAR_CARE_CENTER: "Car Care Center",
  AESTHETIC_CLINIC: "Aesthetic Clinic",
  OTHER: "Other",
} as const;
