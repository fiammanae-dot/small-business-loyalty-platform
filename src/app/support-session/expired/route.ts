import { redirect } from "next/navigation";
import { clearSupportSessionCookie } from "@/lib/support-sessions";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  const { searchParams } = new URL(request.url);
  const supportSessionId = Number(searchParams.get("supportSessionId"));

  if (user?.role === "PLATFORM_OWNER" && Number.isInteger(supportSessionId) && supportSessionId > 0) {
    await prisma.supportSession.updateMany({
      where: {
        id: supportSessionId,
        adminUserId: user.id,
        status: "ACTIVE",
        endedAt: null,
        expiresAt: { lte: new Date() },
      },
      data: { status: "EXPIRED" },
    });
  }

  await clearSupportSessionCookie();
  redirect("/platform?error=Support%20session%20expired.");
}
