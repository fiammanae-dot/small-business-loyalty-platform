# Production Release Checklist

Use this checklist for every production deployment of Loyalty Card UAE. It is the single
gate that determines whether a release is allowed to go live. If any required step fails,
stop and follow [Rollback](#8-rollback-steps) rather than pushing forward.

This checklist is intentionally short and points to the detailed runbooks
(`docs/operations/`) for the "how" of each step; it exists to make sure no step is skipped
and to record who approved the release.

## 1. Database Backup

- [ ] Pre-deployment backup created (see
      [backup-guide.md](../operations/backup-guide.md)).
- [ ] Backup file exists and its size is non-zero.
- [ ] Backup location/timestamp recorded.

## 2. Migration Verification

```powershell
npx prisma migrate status
```

- [ ] Migration status is up to date with no pending or failed migrations.
- [ ] New migrations (if any) were reviewed for destructive operations (dropped
      columns/tables, non-additive changes) before merging.

## 3. Automated Validation

Run in order and require every step to pass - do not deploy on a partial pass:

```powershell
npm ci
npx prisma generate
npm test
npm run lint
npx tsc --noEmit
npm run build
```

- [ ] `npm test` passes (all tests, zero skipped-as-workaround).
- [ ] `npm run lint` passes with no errors.
- [ ] `npx tsc --noEmit` passes (strict TypeScript, zero errors).
- [ ] `npm run build` completes successfully.
- [ ] CI (`.github/workflows/ci.yml`) is green on the commit being deployed.

## 4. Smoke Test

- [ ] [SMOKE_TEST_CHECKLIST.md](SMOKE_TEST_CHECKLIST.md) completed against a staging or
      preview environment before deploying to production, where a staging environment
      exists.

## 5. Deployment

- [ ] Target environment and target database confirmed correct.
- [ ] Required environment variables present (`DATABASE_URL`, `SESSION_SECRET`, and one
      of the accepted app-URL variables - see `.env.example`). The app now fails to start
      in production if these are missing (`src/lib/env.ts`), so a bad deploy fails loudly
      instead of silently serving broken pages.
- [ ] `npx prisma migrate deploy` run against the target database.
- [ ] Application deployed/restarted.
- [ ] Git tag created for this release (see
      [Versioning & Git Tagging Strategy](#versioning--git-tagging-strategy) below).

## 6. Post-Deployment Verification

- [ ] [SMOKE_TEST_CHECKLIST.md](SMOKE_TEST_CHECKLIST.md) completed against production.
- [ ] [Platform Health](/platform/health) shows: correct app version/git commit, database
      connected, latest migration matches what was just deployed, and accurate
      integration status.
- [ ] No new error spike in Sentry (if configured) in the first 15 minutes.

## 7. Release Record

Record for every release:

- [ ] Git tag / version.
- [ ] Deployer name.
- [ ] Date/time (UTC).
- [ ] Target environment.
- [ ] Migration(s) applied, if any.
- [ ] Smoke test result (pass/fail, link to notes if fail-then-fixed).

## 8. Rollback Steps

If the smoke test or post-deployment verification fails:

1. Announce the rollback decision.
2. Stop the failing application process.
3. Preserve application and database logs for diagnosis.
4. Restore the previous known-good release (previous git tag).
5. Reinstall dependencies, regenerate the Prisma client, and rebuild:
   ```powershell
   npm ci
   npx prisma generate
   npm run build
   ```
6. If a migration was part of the failed release and must be reverted, follow the
   database restore procedure in
   [rollback-runbook.md](../operations/rollback-runbook.md) rather than hand-editing
   the schema - migrations in this project are additive by convention, so most releases
   will not need a schema rollback.
7. Restart the application and re-run the smoke test checklist.
8. Record the rollback in the release record above, including root cause once known.

Full detail: [rollback-runbook.md](../operations/rollback-runbook.md) and
[rollback-guide.md](../operations/rollback-guide.md).

## Versioning & Git Tagging Strategy

The app version shown on [Platform Health](/platform/health) comes from `package.json`'s
`version` field. Keep that field and the git tag in sync for every release.

**Format:** [Semantic Versioning](https://semver.org) - `MAJOR.MINOR.PATCH`, with an
optional pre-release suffix during hardening phases:

- `v1.0.0-beta.1`, `v1.0.0-beta.2`, ... - pilot/pre-launch hardening builds. Bump the
  beta number for each iteration; nothing here is assumed production-stable.
- `v1.0.0` - first production launch.
- `v1.0.1` - PATCH: bug fixes and non-breaking corrections only, no new features.
- `v1.1.0` - MINOR: new features/pages that don't break existing behavior (e.g. this
  Phase A.5 hardening pass would ship as a MINOR bump - no business logic changed, only
  additive security/ops capability).
- `v2.0.0` - MAJOR: breaking changes (e.g. a schema change that requires data migration,
  a removed API, a changed auth model).

**Process for every release:**

1. Bump `"version"` in `package.json` to match the release.
2. Commit that bump on its own (`chore(release): vX.Y.Z`).
3. Tag the commit:
   ```bash
   git tag -a vX.Y.Z -m "vX.Y.Z"
   git push origin vX.Y.Z
   ```
4. Deploy the tagged commit, not an arbitrary later commit on `main`.
5. Record the tag in the Release Record (Section 7) and confirm it matches what
   [Platform Health](/platform/health) reports post-deploy.

Tags are permanent history, not branches - never move or force-push a tag once it has
been deployed.

## Final Sign-Off

A release is approved only when every checked section above passes. Do not mark a
release complete on a partial pass "to fix later" - fix or roll back first.
