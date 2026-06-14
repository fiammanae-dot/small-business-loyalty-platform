# Pilot Database Setup

This guide creates a clean pilot database for LoyaltyBase without touching the current development database.

Target database:

```text
loyalty_platform_pilot
```

Important safety rule:

- Do not run pilot seed commands against `loyalty_platform`.
- The pilot seed and verification scripts refuse to run unless `DATABASE_URL` points to `loyalty_platform_pilot`.
- Take a backup before changing local database settings.

## 1. Create The Pilot Database

Open PowerShell and create the database with PostgreSQL:

```powershell
$env:PGPASSWORD="<database-password>"
& "C:\Program Files\PostgreSQL\18\bin\createdb.exe" -h DATABASE_HOST -p 5432 -U "<database-user>" loyalty_platform_pilot
```

If the database already exists, verify it:

```powershell
$env:PGPASSWORD="<database-password>"
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -h DATABASE_HOST -p 5432 -U "<database-user>" -l
```

## 2. Create `.env.pilot`

Copy the current `.env` file:

```powershell
Copy-Item .env .env.pilot
```

Edit `.env.pilot` and set:

```env
DATABASE_URL="postgresql://<database-user>:<database-password>@DATABASE_HOST:5432/loyalty_platform_pilot?schema=public"
SESSION_SECRET="replace-with-a-long-random-pilot-secret"
DEV_AUTH_FALLBACK="false"
```

Keep the development `.env` unchanged unless you intentionally want to run the app against the pilot database.

## 3. Use The Pilot Database For One Command

For one-off setup commands, set `DATABASE_URL` in the current PowerShell session:

```powershell
$env:DATABASE_URL="postgresql://<database-user>:<database-password>@DATABASE_HOST:5432/loyalty_platform_pilot?schema=public"
```

Confirm the variable:

```powershell
$env:DATABASE_URL
```

It must include:

```text
loyalty_platform_pilot
```

## 4. Run Migrations On The Pilot Database

After approval, run:

```powershell
npx prisma migrate deploy
npx prisma generate
```

These commands should run only after `DATABASE_URL` points to `loyalty_platform_pilot`.

## 5. Seed Clean Pilot Data

After migrations are applied, run:

```powershell
npm run prisma:seed-pilot
```

The seed creates:

- System Administrator
- Three pilot businesses
- Business Owner, Branch Manager, and Staff user for each business
- Clean branding
- Active subscriptions
- Branches
- One loyalty program per business
- Three customer records per business
- Customer card tokens
- Program memberships
- Scan tokens

Default password for seeded users:

```text
<set-secure-password-in-environment>
```

## 6. Verify The Pilot Database

Run:

```powershell
npm run prisma:verify-pilot
```

The verifier checks:

- System Administrator exists
- Three pilot businesses exist
- Each business has one Business Owner, one Branch Manager, and one Staff user
- Each business has branches
- Each business has one loyalty program
- Customers are enrolled
- Customer card tokens exist
- Scan tokens exist
- No pilot-facing names include `Demo`, `Test`, `Phase`, `Smoke`, `debug`, or timestamp-like values

## 7. Pilot Login Accounts

System Administrator:

```text
admin@yourdomain.com
<set-secure-password-in-environment>
```

Harbor Coffee House:

```text
owner@harborcoffee.example
manager@harborcoffee.example
staff@harborcoffee.example
<set-secure-password-in-environment>
```

Cedar Table Restaurant:

```text
owner@cedartable.example
manager@cedartable.example
staff@cedartable.example
<set-secure-password-in-environment>
```

Sharp Line Barbershop:

```text
owner@sharpline.example
manager@sharpline.example
staff@sharpline.example
<set-secure-password-in-environment>
```

## 8. Running The App Against Pilot

To run the app against the pilot database, temporarily set:

```powershell
$env:DATABASE_URL="postgresql://<database-user>:<database-password>@DATABASE_HOST:5432/loyalty_platform_pilot?schema=public"
npm run dev
```

Open:

```text
https://app.yourdomain.com
```

## 9. Verification Checklist

Before inviting pilot users:

- System Administrator can log in.
- System Administrator can see three pilot businesses.
- Business Owner can log in for each business.
- Branch Manager can log in for each business.
- Staff can log in for each business.
- Customer cards open publicly.
- Scan URLs validate for the correct business.
- Stamp issuance works.
- Reward readiness and redemption flows work.
- Message preparation remains manual only.
- No test/demo/phase/smoke names appear in pilot-facing screens.

## 10. Rollback

If the pilot setup is wrong, do not reset the development database.

Use one of these safe options:

- Drop and recreate only `loyalty_platform_pilot`.
- Create a second pilot database such as `loyalty_platform_pilot_2`.
- Restore a pilot-only database backup.

Never run destructive cleanup against `loyalty_platform` while preparing the pilot environment.
