import type { ReactNode } from "react";
import { Button, ButtonLink } from "@/components/ui";

export function StaffActionButtons({
  resetPassword,
  disable,
  profileHref,
}: {
  resetPassword?: ReactNode;
  disable?: ReactNode;
  profileHref?: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {profileHref ? <ButtonLink href={profileHref} variant="outline" size="sm">View</ButtonLink> : null}
      {resetPassword ?? <Button variant="outline" size="sm">Reset Password</Button>}
      {disable ?? <Button variant="danger" size="sm">Disable</Button>}
    </div>
  );
}
