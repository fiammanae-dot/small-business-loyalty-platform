import "server-only";

import packageJson from "../../package.json";
import { checkDatabaseHealth } from "@/lib/database-health";
import { getEnvironmentStatus } from "@/lib/env";
import { isGoogleWalletConfigured } from "@/lib/google-wallet/config";
import { isSentryConfigured } from "@/lib/monitoring";
import { prisma } from "@/lib/prisma";

type LatestMigration = {
  migration_name: string;
  finished_at: Date | null;
};

async function getLatestMigration() {
  try {
    const rows = await prisma.$queryRaw<LatestMigration[]>`
      SELECT migration_name, finished_at
      FROM "_prisma_migrations"
      ORDER BY finished_at DESC NULLS LAST
      LIMIT 1
    `;
    return rows[0] ?? null;
  } catch (error) {
    console.error("Platform health: failed to read migration history", error);
    return null;
  }
}

export async function getPlatformHealth() {
  const [database, latestMigration] = await Promise.all([
    checkDatabaseHealth(),
    getLatestMigration(),
  ]);

  const environment = getEnvironmentStatus();
  const serverStartedAt = new Date(Date.now() - process.uptime() * 1000);

  return {
    build: {
      appVersion: packageJson.version,
      gitCommit: process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.SENTRY_RELEASE ?? null,
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
      nodeVersion: process.version,
      serverStartedAt: serverStartedAt.toISOString(),
    },
    database,
    migration: latestMigration
      ? { name: latestMigration.migration_name, appliedAt: latestMigration.finished_at?.toISOString() ?? null }
      : null,
    googleWallet: { configured: isGoogleWalletConfigured() },
    environmentValidation: environment,
    sentry: { configured: isSentryConfigured() },
    backgroundJobs: {
      configured: false,
      note: "No background job/queue system is part of this platform today.",
    },
    storage: {
      configured: false,
      note: "No internal file storage service. Branding/logo assets are referenced by external URL.",
    },
  };
}

export type PlatformHealth = Awaited<ReturnType<typeof getPlatformHealth>>;
