# Application Startup Guide

This guide explains how to start LoyaltyBase safely.

## Install Dependencies

From the project root:

```powershell
npm install
```

Expected output:

- Dependencies install without fatal errors.
- `node_modules` is present.

## Generate Prisma Client

```powershell
npx prisma generate
```

Expected output:

- Prisma Client generated successfully.

## Build Application

```powershell
npm run build
```

Expected output:

- Next.js compiles successfully.
- TypeScript passes.
- Route list is generated.

## Start Application

Development:

```powershell
npm run dev
```

Production-style:

```powershell
npm run start
```

Expected output:

- App is available on configured host and port.
- No missing environment variable error.

## Verify Application

Open:

```text
https://app.yourdomain.com
```

Then open:

```text
https://app.yourdomain.com/login
```

Verify:

- Homepage loads.
- Login page loads.
- No framework error overlay appears.

## Verify Database Connectivity

Login as System Administrator and open:

```text
/platform/database
```

Confirm:

- Database Connected.
- Prisma Connected.
- Timestamp is current.

## Verify Environment

Open:

```text
/platform/settings
```

Confirm:

- Environment is correct.
- Current Database is correct.
- Demo Mode status is intentional.
- Application version is visible.
- Build status is healthy.

## Verify Scanner Routes

Check:

```text
/staff/scanner
/branch/scanner
/scan/{valid-token}
```

Confirm:

- Staff scanner loads.
- Branch scanner loads.
- Manual token input works.
- Invalid token shows safe error.

## Verify Dashboards

Confirm these dashboards load for correct roles:

- System Administrator: `/platform`
- Business Owner: `/dashboard`
- Branch Manager: `/branch`
- Staff: `/staff`

Confirm inaccessible dashboards redirect or block access for the wrong role.
