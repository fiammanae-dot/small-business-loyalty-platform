import type { BusinessType, RecordStatus } from "@prisma/client";
import { businessTypeLabels } from "@/lib/roles";

export const businessTypeOptions: Array<{ value: BusinessType; label: string }> = [
  { value: "COFFEE_SHOP", label: businessTypeLabels.COFFEE_SHOP },
  { value: "RESTAURANT", label: businessTypeLabels.RESTAURANT },
  { value: "BARBERSHOP", label: businessTypeLabels.BARBERSHOP },
  { value: "BEAUTY_SALON", label: businessTypeLabels.BEAUTY_SALON },
  { value: "CAR_CARE_CENTER", label: businessTypeLabels.CAR_CARE_CENTER },
  { value: "OTHER", label: businessTypeLabels.OTHER },
];

export const statusOptions: Array<{ value: RecordStatus; label: string }> = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];
