import "server-only";

const DEVELOPMENT_SESSION_SECRET = "development-session-secret-change-me";

export function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (secret) return secret;

  // Only explicit development mode may fall back to a shared secret. Anything else
  // (production, staging, an unset NODE_ENV, or a misconfigured deploy) fails hard
  // instead of silently signing sessions with a publicly-known value.
  if (process.env.NODE_ENV !== "development") {
    throw new Error("SESSION_SECRET is required and was not set.");
  }

  return DEVELOPMENT_SESSION_SECRET;
}
