import "server-only";

const DEVELOPMENT_SESSION_SECRET = "development-session-secret-change-me";

export function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;

  if (process.env.NODE_ENV === "production" && !secret) {
    throw new Error("SESSION_SECRET is required in production.");
  }

  return secret ?? DEVELOPMENT_SESSION_SECRET;
}
