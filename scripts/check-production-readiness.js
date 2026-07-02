import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import pg from "pg";

const { Client } = pg;

const requiredEnv = [
  "APP_ENV",
  "APP_URL",
  "NEXT_PUBLIC_APP_URL",
  "DATABASE_URL",
  "SESSION_SECRET",
  "ADMIN_EMAIL",
];

const findings = [];

function pass(label) {
  findings.push({ status: "PASS", label });
}

function fail(label, detail) {
  findings.push({ status: "FAIL", label, detail });
}

for (const key of requiredEnv) {
  if (process.env[key]?.trim()) {
    pass(`Environment variable ${key} is set`);
  } else {
    fail(`Environment variable ${key} is missing`);
  }
}

if (process.env.APP_ENV === "production") {
  pass("APP_ENV is production");
} else {
  fail("APP_ENV must be production", `Current value: ${process.env.APP_ENV || "not set"}`);
}

if (process.env.DEV_AUTH_FALLBACK === "true") {
  fail("Development auth fallback must be disabled in production");
} else {
  pass("Development auth fallback is disabled");
}

for (const key of ["APP_URL", "NEXT_PUBLIC_APP_URL", "NEXT_PUBLIC_SITE_URL", "AUTH_URL", "NEXTAUTH_URL", "BASE_URL"]) {
  const value = process.env[key];
  if (!value) continue;
  if (value.includes("localhost") || value.includes("127.0.0.1") || value.includes("loyalty.local")) {
    fail(`${key} must not reference a local development host`, value);
  } else {
    pass(`${key} does not reference a local development host`);
  }
}

if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length < 32) {
  fail("SESSION_SECRET must be at least 32 characters");
}

async function checkDatabase() {
  if (!process.env.DATABASE_URL) return;

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    await client.query("select 1");
    pass("Database connection is valid");
  } catch (error) {
    fail("Database connection failed", error instanceof Error ? error.message : String(error));
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function checkStorageWritable() {
  const storageDir = process.env.STORAGE_PATH || join(process.cwd(), ".production-readiness");
  const testFile = join(storageDir, "write-test.tmp");
  try {
    await mkdir(storageDir, { recursive: true });
    await writeFile(testFile, `readiness-check-${Date.now()}`);
    await rm(testFile, { force: true });
    if (!process.env.STORAGE_PATH) {
      await rm(storageDir, { force: true, recursive: true });
    }
    pass("Storage path is writable");
  } catch (error) {
    fail("Storage path is not writable", error instanceof Error ? error.message : String(error));
  }
}

await checkDatabase();
await checkStorageWritable();

const failed = findings.filter((finding) => finding.status === "FAIL");
const warned = findings.filter((finding) => finding.status === "WARN");

for (const finding of findings) {
  const detail = finding.detail ? ` - ${finding.detail}` : "";
  console.log(`[${finding.status}] ${finding.label}${detail}`);
}

console.log("");
console.log(`Production readiness: ${failed.length === 0 ? "PASS" : "FAIL"}`);
console.log(`Failures: ${failed.length}`);
console.log(`Warnings: ${warned.length}`);

if (failed.length > 0) {
  process.exitCode = 1;
}
