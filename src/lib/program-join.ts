import "server-only";

import QRCode from "qrcode";
import { getBaseUrl } from "@/lib/customer-cards";

export async function getProgramJoinUrl(token: string) {
  return `${await getBaseUrl()}/join/program/${token}`;
}

export async function getProgramJoinQrDataUrl(token: string) {
  return QRCode.toDataURL(await getProgramJoinUrl(token), {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 260,
    color: {
      dark: "#111827",
      light: "#FFFFFF",
    },
  });
}
