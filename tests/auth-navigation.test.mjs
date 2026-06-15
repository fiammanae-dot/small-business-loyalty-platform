import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

test("authenticated root and login requests redirect through role home paths", () => {
  const home = read("src/app/page.tsx");
  const login = read("src/app/login/page.tsx");
  const session = read("src/lib/session.ts");
  const roles = read("src/lib/roles.ts");

  assert.match(home, /await redirectAuthenticatedUser\(\)/);
  assert.match(login, /await redirectAuthenticatedUser\(\)/);
  assert.match(session, /redirect\(roleHomePath\[user\.role\]\)/);

  for (const expected of [
    'PLATFORM_OWNER: "/platform"',
    'BUSINESS_OWNER: "/dashboard"',
    'BRANCH_MANAGER: "/branch"',
    'STAFF: "/staff"',
  ]) {
    assert.match(roles, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("authenticated shell logo navigates to the current role dashboard", () => {
  const shell = read("src/components/DashboardShell.tsx");

  assert.match(shell, /roleHomePath/);
  assert.match(shell, /href=\{roleHomePath\[user\.role\]\}/);
  assert.doesNotMatch(shell, /<Link href="\/" className="flex items-center gap-2">/);
});

test("logout clears session and prevents cached authenticated pages", () => {
  const logout = read("src/app/logout/route.ts");
  const session = read("src/lib/session.ts");

  assert.match(logout, /await destroySession\(\)/);
  assert.match(logout, /NextResponse\.redirect\(new URL\("\/login", request\.url\), \{ status: 303 \}\)/);
  assert.match(logout, /Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate"/);
  assert.match(logout, /Clear-Site-Data", '"cache"'/);
  assert.match(session, /sessionVersion: \{ increment: 1 \}/);
  assert.match(session, /cookieStore\.set\(SESSION_COOKIE, ""/);
  assert.match(session, /maxAge: 0/);
});

test("protected app routes emit no-store cache headers", () => {
  const proxy = read("src/proxy.ts");

  for (const expected of [
    '"/dashboard"',
    '"/platform"',
    '"/branch"',
    '"/staff"',
    '"/scan"',
    '"/change-password"',
    '"/dashboard/:path*"',
    '"/platform/:path*"',
    '"/branch/:path*"',
    '"/staff/:path*"',
    '"/scan/:path*"',
    '"/change-password"',
  ]) {
    assert.match(proxy, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.match(proxy, /export function proxy\(request: NextRequest\)/);
  assert.match(proxy, /Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate"/);
  assert.match(proxy, /Pragma", "no-cache"/);
  assert.match(proxy, /Expires", "0"/);
  assert.match(proxy, /Surrogate-Control", "no-store"/);
});
