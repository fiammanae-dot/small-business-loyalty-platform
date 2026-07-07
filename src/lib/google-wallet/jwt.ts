import "server-only";

import { createSign } from "crypto";
import type { GoogleWalletConfig } from "@/lib/google-wallet/config";

type SaveToWalletClaims = {
  iss: string;
  aud: "google";
  typ: "savetowallet";
  iat: number;
  origins: string[];
  payload: {
    loyaltyObjects: Array<Record<string, unknown>>;
  };
};

export function signSaveToGoogleWalletJwt({
  config,
  loyaltyObject,
}: {
  config: GoogleWalletConfig;
  loyaltyObject: Record<string, unknown>;
}) {
  const claims: SaveToWalletClaims = {
    iss: config.serviceAccountEmail,
    aud: "google",
    typ: "savetowallet",
    iat: Math.floor(Date.now() / 1000),
    origins: [new URL(config.appUrl).origin],
    payload: {
      loyaltyObjects: [loyaltyObject],
    },
  };

  const header = {
    alg: "RS256",
    typ: "JWT",
  };

  const encodedHeader = base64UrlJson(header);
  const encodedPayload = base64UrlJson(claims);
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;
  const signature = createSign("RSA-SHA256").update(unsignedToken).sign(config.privateKey, "base64url");

  return `${unsignedToken}.${signature}`;
}

export function buildSaveToGoogleWalletUrl(token: string) {
  return `https://pay.google.com/gp/v/save/${token}`;
}

function base64UrlJson(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}
