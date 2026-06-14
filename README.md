# Small Business Loyalty Platform

Multi-tenant loyalty SaaS platform serving coffee shops, small restaurants, barbershops, beauty salons, and car care centers.

## Stack

- Next.js 16 App Router
- TypeScript
- Tailwind CSS
- PostgreSQL
- Prisma ORM
- Signed HttpOnly cookie authentication
- bcrypt password hashing

## Current Scope

Built:

- Public landing page
- Login page
- Logout
- Protected dashboards for Platform Owner, Business Owner, Branch Manager, and Staff
- Role-based redirects after login
- Server-side role validation on protected pages
- Core database models for users, businesses, branches, branding, plans, and subscriptions
- Platform business management
- Business profile, branch, staff, and branding management
- Customer enrollment and business memberships
- Public customer card tokens and branded card pages
- Loyalty program setup, templates, customer enrollment, and dynamic progress
- Starter and Growth subscription plans

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment values:

```bash
cp .env.example .env
```

3. Start PostgreSQL:

```bash
docker compose up -d
```

4. Generate Prisma client:

```bash
npm run prisma:generate
```

5. Run migrations:

```bash
npm run prisma:migrate
```

For a quick local prototype database without creating migration files, use:

```bash
npm run prisma:push
```

6. Seed the database:

```bash
npm run prisma:seed
```

7. Start the app:

```bash
npm run dev
```

Open https://app.yourdomain.com.

If login shows `Database is not ready`, confirm PostgreSQL is running on `DATABASE_HOST:5432`, then run `npm run prisma:push` and `npm run prisma:seed`.

## Database Readiness

Current `DATABASE_URL`:

```bash
postgresql://<database-user>:<database-password>@DATABASE_HOST:5432/loyalty_platform?schema=public
```

This app expects PostgreSQL to be available on the configured database host with:

- Database: `loyalty_platform`
- User: configured in `DATABASE_URL`
- Password: configured in `DATABASE_URL`

Recommended local startup with Docker Desktop:

```bash
docker compose up -d
npm run prisma:generate
npm run prisma:push
npm run prisma:seed
```

If Docker is not installed, install PostgreSQL locally, create the `loyalty_platform` database, configure `DATABASE_URL`, then run:

```bash
npm run prisma:generate
npm run prisma:push
npm run prisma:seed
```

Platform Owners can check runtime connectivity at:

```text
/platform/database
```

## Seed Login

- Email: `admin@yourdomain.com`
- Password: `<set-secure-password-in-environment>`
- Role: Platform Owner
- Redirect: `/platform`

For local UI preview only, `.env` enables `DEV_AUTH_FALLBACK=true`. This lets the seeded Platform Owner login work even when PostgreSQL is not running. Production ignores this fallback, and real tenant data still requires PostgreSQL plus Prisma setup.

## Role Redirects

- Platform Owner: `/platform`
- Business Owner: `/dashboard`
- Branch Manager: `/branch`
- Staff: `/staff`
