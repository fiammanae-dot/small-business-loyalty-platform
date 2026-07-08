import "server-only";

import { prisma } from "@/lib/prisma";

// Cleanup strategy: this codebase has no existing scheduled-job/cron runner (the
// sibling FailedLoginAudit table has the same gap — it also grows unbounded today).
// Rows here are only ever queried within the last `windowMinutes` (default 15), so
// unbounded growth is a storage/cost concern, not a correctness one. Until a job
// runner exists, expire old rows with an out-of-band scheduled query, e.g.:
//   DELETE FROM rate_limit_attempts WHERE created_at < now() - interval '30 days';
// run periodically (cron, Neon scheduled query, etc.) — safe to run anytime since
// no code path reads rows older than a few minutes.

// Shared sliding-window helper: an actor is rate-limited once `count` of their
// attempts in the last `windowMinutes` reaches `maxAttempts`. Used by both the
// login/password-reset protections (their own dedicated tables) and the generic
// public-endpoint limiter below (`RateLimitAttempt`), so the threshold logic
// only lives in one place.
export function windowStart(windowMinutes: number) {
  return new Date(Date.now() - windowMinutes * 60 * 1000);
}

export function isOverThreshold(count: number, maxAttempts: number) {
  return count >= maxAttempts;
}

const DEFAULT_WINDOW_MINUTES = 15;
const DEFAULT_MAX_ATTEMPTS = 5;

export type PublicRateLimitScope = "public_join_program";

export async function isPublicActionRateLimited({
  scope,
  ipAddress,
  identifier,
  windowMinutes = DEFAULT_WINDOW_MINUTES,
  maxAttempts = DEFAULT_MAX_ATTEMPTS,
}: {
  scope: PublicRateLimitScope;
  ipAddress: string;
  identifier?: string | null;
  windowMinutes?: number;
  maxAttempts?: number;
}) {
  const since = windowStart(windowMinutes);

  const [ipAttempts, identifierAttempts] = await Promise.all([
    prisma.rateLimitAttempt.count({
      where: { scope, ipAddress, createdAt: { gte: since } },
    }),
    identifier
      ? prisma.rateLimitAttempt.count({
          where: { scope, identifier, createdAt: { gte: since } },
        })
      : Promise.resolve(0),
  ]);

  return isOverThreshold(ipAttempts, maxAttempts) || isOverThreshold(identifierAttempts, maxAttempts);
}

export async function recordPublicActionAttempt({
  scope,
  ipAddress,
  identifier,
  outcome,
}: {
  scope: PublicRateLimitScope;
  ipAddress: string;
  identifier?: string | null;
  outcome: string;
}) {
  await prisma.rateLimitAttempt.create({
    data: {
      scope,
      ipAddress,
      identifier: identifier ?? null,
      outcome,
    },
  });
}
