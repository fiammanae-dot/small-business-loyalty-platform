import "server-only";

import * as Sentry from "@sentry/nextjs";

export function isSentryConfigured() {
  return Boolean(process.env.SENTRY_DSN?.trim());
}

// Attaches only internal, non-PII identifiers to the current request's error scope so
// crash reports can be filtered by tenant/role. Never pass email, name, or phone here -
// those are the fields most likely to end up in a Sentry breadcrumb or error message.
export function attachMonitoringContext(
  user: { id: number; role: string; businessId: number | null } | null,
) {
  if (!isSentryConfigured()) return;

  if (!user) {
    Sentry.setUser(null);
    return;
  }

  Sentry.setUser({ id: String(user.id) });
  Sentry.setTag("userRole", user.role);
  Sentry.setTag("businessId", user.businessId ? String(user.businessId) : "none");
}
