import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {test} from "node:test";

const root=process.cwd();
function read(file){return fs.readFileSync(path.join(root,file),"utf8");}

test("platform user lifecycle statuses are represented in schema and migration",function(){const schema=read("prisma/schema.prisma");const migration=read("prisma/migrations/0030_platform_user_lifecycle/migration.sql");assert.ok(schema.includes("enum RecordStatus"));assert.ok(schema.includes("SUSPENDED"));assert.ok(schema.includes("ARCHIVED"));assert.match(migration,/ADD VALUE IF NOT EXISTS 'SUSPENDED'/);assert.match(migration,/ADD VALUE IF NOT EXISTS 'ARCHIVED'/);});

test("platform user actions are system-admin guarded and audited",function(){const actions=read("src/app/platform/users/actions.ts");assert.ok(actions.includes('requireRole("PLATFORM_OWNER")'));assert.match(actions,/USER_PASSWORD_RESET/);assert.match(actions,/USER_FORCE_LOGOUT/);assert.match(actions,/USER_SUSPENDED/);assert.match(actions,/USER_ENABLED/);assert.match(actions,/USER_ARCHIVED/);assert.match(actions,/sessionVersion:{increment:1}/);assert.match(actions,/forcePasswordChange:true/);assert.match(actions,/passwordHash/);});

test("system administrator self and last-admin protections exist",function(){const actions=read("src/app/platform/users/actions.ts");assert.match(actions,/target.id===actor.id/);assert.match(actions,/You cannot suspend or archive your own System Administrator account/);assert.match(actions,/role:"PLATFORM_OWNER",status:"ACTIVE",id:{not:target.id}/);assert.match(actions,/At least one active System Administrator must remain/);});

test("suspended and archived users cannot authenticate because only ACTIVE sessions are accepted",function(){const login=read("src/app/login/actions.ts");const session=read("src/lib/session.ts");assert.match(login,/user.status !== "ACTIVE"/);assert.match(session,/status: "ACTIVE"/);});

test("platform users page exposes controlled actions and archive filter",function(){const page=read("src/app/platform/users/page.tsx");assert.doesNotMatch(page,/Read-only/);assert.match(page,/PlatformUserPasswordResetAction/);assert.match(page,/forceLogoutPlatformUserAction/);assert.match(page,/archivePlatformUserAction/);assert.match(page,/SUSPENDED/);assert.match(page,/ARCHIVED/);assert.match(page,/status: { not: "ARCHIVED" }/);});
