import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

test("public customer card shows a card-level QR before program enrollment", () => {
  const publicCard = read("src/app/card/[token]/page.tsx");
  const customerCards = read("src/lib/customer-cards.ts");
  const walletCard = read("src/components/public-card/LoyaltyWalletCard.tsx");

  assert.match(customerCards, /export async function getCardQrDataUrl/);
  assert.match(customerCards, /QRCode\.toDataURL\(await getCardUrl\(token\)/);
  assert.match(publicCard, /const cardQrCode = await getCardQrDataUrl\(token\)/);
  assert.match(publicCard, /qrCode=\{primaryProgram\?\.qrCode \?\? cardQrCode\}/);
  assert.match(publicCard, /Show this QR code to staff to find your customer card\./);
  assert.match(walletCard, /qrHelperText\?: string/);
  assert.match(walletCard, /qrHelperText = "Scan this card"/);
  assert.doesNotMatch(publicCard, /qrCode=\{primaryProgram\?\.qrCode \?\? null\}/);
});

test("program-enrolled public card still uses program scan QR behavior", () => {
  const publicCard = read("src/app/card/[token]/page.tsx");
  const scan = read("src/lib/scan.ts");

  assert.match(publicCard, /qrCode: await getScanQrDataUrl\(programMembership\.scanToken\)/);
  assert.match(publicCard, /qrCode=\{primaryProgram\?\.qrCode \?\? cardQrCode\}/);
  assert.match(scan, /getScanUrl\(token: string\)/);
  assert.match(scan, /\/scan\/\$\{token\}/);
});

test("card-level scanner lookup for unenrolled customers remains view-only", () => {
  const scanPage = read("src/app/scan/[token]/page.tsx");

  assert.match(scanPage, /where: \{ cardToken: token \}/);
  assert.match(scanPage, /activePrograms\.length === 1/);
  assert.match(scanPage, /activePrograms\.length > 1/);
  assert.match(scanPage, /title="No Active Program"/);
  assert.match(scanPage, /This customer is not enrolled in an active loyalty program\./);
  const noProgramReturn = scanPage.indexOf('title="No Active Program"');
  const enrolledBranch = scanPage.indexOf('const businessMembership = programMembership.businessCustomerMembership');
  const firstStampActionUse = scanPage.indexOf('issueStampAction', enrolledBranch);
  assert.ok(noProgramReturn > 0, 'No Active Program state should exist.');
  assert.ok(enrolledBranch > noProgramReturn, 'No-program card scan should return before enrolled-program stamp flow.');
  assert.ok(firstStampActionUse > enrolledBranch, 'Stamp actions should only appear after program membership is resolved.');
});

