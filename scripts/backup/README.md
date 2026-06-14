# Backup Helper Scripts

These scripts create local backups for LoyaltyBase.

They are not run automatically.

## Scripts

- `backup-dev-db.ps1`: backs up `loyalty_platform`.
- `backup-pilot-db.ps1`: backs up `loyalty_platform_pilot`.
- `backup-env-files.ps1`: backs up `.env`, `.env.pilot`, and `.env.example` if present.

## Safety Behavior

Each script:

- Creates the `backups` folder if missing.
- Generates a timestamped filename.
- Refuses to overwrite an existing backup.
- Prints the database or file set being backed up.
- Prints success or failure messages.

## PostgreSQL Path

The database scripts expect:

```powershell
C:\Program Files\PostgreSQL\18\bin\pg_dump.exe
```

If PostgreSQL is installed elsewhere, edit `$PgDump` in the script.

## Run Examples

Development database:

```powershell
.\scripts\backup\backup-dev-db.ps1
```

Pilot database:

```powershell
.\scripts\backup\backup-pilot-db.ps1
```

Environment files:

```powershell
.\scripts\backup\backup-env-files.ps1
```

## Important

Do not store backups in public folders.

Do not commit backup files.

Do not restore over production without explicit approval.
