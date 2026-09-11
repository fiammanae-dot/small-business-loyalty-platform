/** Minimal shared argument parsing for the WhatsApp onboarding scripts. */
import { readFileSync } from "node:fs";

export function parseArgs(argv = process.argv.slice(2)) {
  const out = { _flags: new Set() };
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) out._flags.add(key);
    else { out[key] = next; i++; }
  }
  return out;
}

export function require_(args, name, usage) {
  const value = args[name];
  if (!value) {
    console.error(`Missing --${name}\n\n${usage}`);
    process.exit(1);
  }
  return value;
}

/** Reads a value out of .env without pulling in dotenv. */
export function fromEnvFile(key, file = ".env") {
  const text = readFileSync(file, "utf8");
  return text.match(new RegExp(`^${key}="?([^"\\n\\r]+)"?$`, "m"))?.[1] ?? null;
}

/** Reads a secret from a file. Strips a BOM (Notepad adds one) and surrounding whitespace. */
export function readSecretFile(path) {
  const value = readFileSync(path, "utf8").replace(/^﻿/, "").trim();
  if (!value) throw new Error(`${path} is empty.`);
  if (/\s/.test(value)) throw new Error(`${path} contains whitespace - check for a stray line break.`);
  if (value.startsWith('"') || value.endsWith('"')) throw new Error(`${path} has quotes around the value - paste the bare token.`);
  return value;
}

/** Imports a TypeScript source file by transpiling it in memory (repo convention, see tests/). */
export async function importTs(path) {
  const ts = (await import("typescript")).default;
  const out = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(out).toString("base64")}`);
}

/**
 * Which database the operational scripts should talk to.
 *
 * Once local .env points DATABASE_URL at a Neon *development* branch, these
 * scripts must not silently follow it - connecting a client's WhatsApp channel
 * on a dev branch looks like it worked and changes nothing in production.
 * So: use PRODUCTION_DATABASE_URL when it exists, and always say which host
 * is being used so a wrong target is visible before anything is written.
 */
export function resolveDatabaseUrl({ allowDev = false } = {}) {
  const prod = fromEnvFile("PRODUCTION_DATABASE_URL");
  const plain = fromEnvFile("DATABASE_URL");
  const url = prod ?? plain;
  if (!url) {
    console.error("Neither PRODUCTION_DATABASE_URL nor DATABASE_URL found in .env");
    process.exit(1);
  }
  const host = new URL(url).hostname;
  const source = prod ? "PRODUCTION_DATABASE_URL" : "DATABASE_URL";
  console.log(`database              : ${host}`);
  console.log(`   (from ${source})`);
  if (!prod && !allowDev) {
    console.log("   NOTE: no PRODUCTION_DATABASE_URL set - this is whatever DATABASE_URL points at.");
    console.log("   If you have moved local development onto a Neon dev branch, add");
    console.log("   PRODUCTION_DATABASE_URL to .env so these scripts keep targeting production.");
  }
  return url;
}
