import { readFile } from "node:fs/promises";
import test from "node:test";
import assert from "node:assert/strict";

test("authenticated dashboard shell signs out idle users after 15 minutes", async () => {
  const idleComponent = await readFile("src/components/IdleSessionTimeout.tsx", "utf8");
  const shell = await readFile("src/components/DashboardShell.tsx", "utf8");
  const route = await readFile("src/app/api/session/idle-logout/route.ts", "utf8");

  assert.match(idleComponent, /15 \* 60 \* 1000/);
  assert.match(idleComponent, /\/api\/session\/idle-logout/);
  assert.match(idleComponent, /window\.location\.replace\("\/login\?reason=idle-timeout"\)/);
  assert.match(idleComponent, /click/);
  assert.match(idleComponent, /keydown/);
  assert.match(idleComponent, /touchstart/);
  assert.match(shell, /<IdleSessionTimeout \/>/);
  assert.match(route, /destroySession/);
  assert.match(route, /Cache-Control/);
  assert.match(route, /no-store/);
});
