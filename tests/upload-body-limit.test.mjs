/**
 * Pictures are uploaded through server actions. Next.js caps a server action
 * request at 1MB unless told otherwise, which silently failed every upload
 * larger than that ("The picture could not be uploaded") while the forms
 * promised 4MB. The limit must cover the largest upload plus form overhead.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("the server action body limit covers the largest upload the forms accept", () => {
  const config = readFileSync("next.config.ts", "utf8");
  const match = /bodySizeLimit: "(\d+)mb"/.exec(config);
  assert.ok(match, "serverActions.bodySizeLimit is set in next.config.ts");
  const storage = readFileSync("src/lib/logo-storage.ts", "utf8");
  const photoMb = Number(/WALLET_PHOTO_MAX_BYTES = (\d+) \* 1024 \* 1024/.exec(storage)?.[1]);
  assert.ok(Number(match[1]) > photoMb, `limit ${match[1]}MB must exceed the ${photoMb}MB card picture`);
});
