# Environment Inventory

This document defines the expected Loyalty Card UAE environments and how each one should be used.

## Development Environment

Purpose:

Feature development, QA testing, debugging, automated checks, and future roadmap phases.

Database:

```text
loyalty_platform
```

Domain:

```text
https://app.yourdomain.com
https://app.yourdomain.com
```

Demo Mode Status:

May be enabled or disabled depending on testing needs.

Typical Users:

- Developers
- QA testers
- System Administrator test account
- Business Owner test accounts
- Branch Manager test accounts
- Staff test accounts

Operational Rule:

Development data may contain demo, QA, and test records. Do not use this database for real pilot customers.

## Pilot Environment

Purpose:

Real pilot customer validation with selected small businesses.

Database:

```text
loyalty_platform_pilot
```

Domain:

Pilot domain or local pilot URL configured by the deployment owner.

Example:

```text
https://pilot.loyaltycarduae.example
```

Demo Mode Status:

Should be explicitly reviewed before every pilot session.

Recommended:

- Enabled for demos and training.
- Disabled only when pilot users need to validate production-like operations.

Typical Users:

- System Administrator
- Pilot Business Owners
- Pilot Branch Managers
- Pilot Staff
- Selected pilot customers opening public cards

Operational Rule:

Do not modify `loyalty_platform_pilot` unless pilot validation work is explicitly approved.

## Production Environment

Purpose:

Commercial customer operations.

Database:

Future production database.

Recommended naming:

```text
loyalty_platform_prod
```

Domain:

Future production domain.

Example:

```text
https://app.loyaltycarduae.example
```

Demo Mode Status:

Disabled unless the entire production workspace is intentionally paused for emergency demonstration or training.

Typical Users:

- System Administrator operations team
- Paying Business Owners
- Branch Managers
- Staff
- Customers using public cards

Operational Rule:

Production must use a strong `SESSION_SECRET`, verified backups, monitoring, and explicit deployment approval.

## Environment Verification

Before deployment, confirm:

- Current database name.
- Current domain.
- Demo Mode status.
- Environment label in Platform Settings.
- Build version.
- Database health.
- Prisma health.
- Latest backup timestamp.
