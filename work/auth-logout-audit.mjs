import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

const { Pool } = pg;
const env = readFileSync(join(process.cwd(), ".env"), "utf8");
const envValue = (key) => env.match(new RegExp(`^${key}=(.+)$`, "m"))?.[1]?.trim().replace(/^"|"$/g, "");
process.env.DATABASE_URL = envValue("DATABASE_URL");
const sessionSecret = envValue("SESSION_SECRET") ?? "development-session-secret-change-me";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const baseUrl = "https://app.yourdomain.com";
const roleHomePath = {
  PLATFORM_OWNER: "/platform",
  BUSINESS_OWNER: "/dashboard",
  BRANCH_MANAGER: "/branch",
  STAFF: "/staff",
};

function sign(value) {
  return createHmac("sha256", sessionSecret).update(value).digest("base64url");
}

function sessionCookie(user) {
  const exp = Math.floor(Date.now() / 1000) + 60 * 60;
  const payload = Buffer.from(JSON.stringify({
    userId: user.id,
    role: user.role,
    sessionVersion: user.session_version,
    exp,
  })).toString("base64url");
  return `loyalty_session=${payload}.${sign(payload)}`;
}

async function request(path, cookie, method = "GET") {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    redirect: "manual",
    headers: cookie ? { cookie } : undefined,
  });
  return {
    status: response.status,
    location: response.headers.get("location"),
    setCookie: response.headers.get("set-cookie") ?? "",
    text: await response.text(),
  };
}

try {
  const users = await pool.query(`
    select distinct on (role)
      id,
      email,
      role,
      session_version
    from users
    where status = 'ACTIVE'
      and role in ('PLATFORM_OWNER', 'BUSINESS_OWNER', 'BRANCH_MANAGER', 'STAFF')
    order by role, id
  `);

  const results = [];
  for (const user of users.rows) {
    const cookie = sessionCookie(user);
    const homePath = roleHomePath[user.role];
    const beforeProtected = await request(homePath, cookie);
    const loginWhileAuthenticated = await request("/login", cookie);
    const beforeVersion = await pool.query("select session_version from users where id = $1", [user.id]);
    const logout = await request("/logout", cookie, "POST");
    const afterVersion = await pool.query("select session_version from users where id = $1", [user.id]);
    const oldCookieProtected = await request(homePath, cookie);
    const loginAfterLogout = await request("/login");
    const refreshAfterLogout = await request(homePath, cookie);

    results.push({
      role: user.role,
      email: user.email,
      protectedBeforeLogout: beforeProtected.status,
      loginPageWithValidSessionShowsForm:
        loginWhileAuthenticated.status === 200 && loginWhileAuthenticated.text.includes("Welcome back"),
      logoutRedirectsToLogin:
        [303, 307, 308].includes(logout.status) && logout.location?.endsWith("/login"),
      logoutClearsCookie:
        logout.setCookie.includes("loyalty_session=") &&
        (logout.setCookie.includes("Max-Age=0") || logout.setCookie.includes("expires=Thu, 01 Jan 1970")),
      serverSessionInvalidated:
        afterVersion.rows[0].session_version === beforeVersion.rows[0].session_version + 1,
      oldCookieProtectedAfterLogout: {
        status: oldCookieProtected.status,
        location: oldCookieProtected.location,
      },
      loginAfterLogoutShowsForm:
        loginAfterLogout.status === 200 && loginAfterLogout.text.includes("Welcome back"),
      refreshAfterLogoutDoesNotRestoreAuth:
        [303, 307, 308].includes(refreshAfterLogout.status) &&
        refreshAfterLogout.location?.endsWith("/login"),
    });
  }

  console.log(JSON.stringify(results, null, 2));
} finally {
  await pool.end();
}
