/**
 * Copy one value from .env to the clipboard without printing it.
 *
 *   node scripts/wallet/copy-env-value.mjs TWO_FACTOR_ENCRYPTION_KEY
 *
 * Uses PowerShell's Set-Clipboard on Windows (clip.exe can silently no-op when
 * another process holds the clipboard, or mangle text via the console code page).
 * Verifies by reading the clipboard back.
 */
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const name = process.argv[2];
if (!name) {
  console.error("Usage: node scripts/wallet/copy-env-value.mjs <VARIABLE_NAME>");
  process.exit(1);
}

const value = readFileSync(".env", "utf8")
  .match(new RegExp(`^${name}="?([^"\\n\\r]+)"?$`, "m"))?.[1];

if (!value) { console.error(`${name} not found in .env`); process.exit(1); }
console.log(`${name} found in .env, length ${value.length}`);

if (process.platform !== "win32") {
  const r = spawnSync("xclip", ["-selection", "clipboard"], { input: value });
  console.log(r.status === 0 ? "copied (xclip)" : "xclip failed");
  process.exit(r.status === 0 ? 0 : 1);
}

// Set-Clipboard reads stdin when given -Value from the pipeline.
const set = spawnSync("powershell.exe",
  ["-NoProfile", "-Command", "$text = [Console]::In.ReadToEnd(); Set-Clipboard -Value $text"],
  { input: value, encoding: "utf8" });

if (set.status !== 0) {
  console.error("PowerShell Set-Clipboard failed:", set.stderr?.trim() || `exit ${set.status}`);
  process.exit(1);
}

// Read it back to prove it actually landed.
const get = spawnSync("powershell.exe",
  ["-NoProfile", "-Command", "Get-Clipboard -Raw"],
  { encoding: "utf8" });
const onClipboard = (get.stdout ?? "").replace(/\r?\n$/, "");

if (onClipboard === value) {
  console.log("\nVERIFIED on the clipboard - paste into Vercel with Ctrl+V.");
} else {
  console.error("\nClipboard does NOT match. Length on clipboard:", onClipboard.length, "expected:", value.length);
  console.error("Do not rely on it - tell Claude and we will set the variable a different way.");
  process.exit(1);
}
