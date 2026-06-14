import { randomBytes } from "crypto";

export function IdempotencyInput({ scope }: { scope: string }) {
  const token = `${scope}_${randomBytes(24).toString("base64url")}`;
  return <input type="hidden" name="idempotencyKey" value={token} />;
}
