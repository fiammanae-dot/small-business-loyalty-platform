import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { getSessionSecret } from "@/lib/secrets";

const CSRF_TTL_SECONDS = 60 * 60;
const CSRF_FIELD = "csrfToken";

type CsrfPayload = {
  scope: string;
  nonce: string;
  exp: number;
};

function encode(value: string) {
  return Buffer.from(value).toString("base64url");
}

function decode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(value: string) {
  return createHmac("sha256", getSessionSecret()).update(value).digest("base64url");
}

export function createCsrfToken(scope: string) {
  const payload: CsrfPayload = {
    scope,
    nonce: randomBytes(18).toString("base64url"),
    exp: Math.floor(Date.now() / 1000) + CSRF_TTL_SECONDS,
  };
  const encodedPayload = encode(JSON.stringify(payload));
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function verifyCsrfToken(token: string | null | undefined, scope: string) {
  if (!token) return false;

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return false;

  const expected = sign(encodedPayload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return false;
  }

  try {
    const payload = JSON.parse(decode(encodedPayload)) as CsrfPayload;
    return payload.scope === scope && payload.exp >= Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export function validateCsrfForm(formData: FormData, scope: string) {
  const value = formData.get(CSRF_FIELD);
  if (!verifyCsrfToken(typeof value === "string" ? value : null, scope)) {
    throw new Error("Invalid security token.");
  }
}

export function csrfFieldName() {
  return CSRF_FIELD;
}
