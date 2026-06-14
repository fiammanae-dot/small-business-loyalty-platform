# Backup Verification Checklist

Use this checklist after every important backup.

## File Verification

- [ ] Backup file exists.
- [ ] Backup file size is reasonable.
- [ ] Backup filename includes environment.
- [ ] Backup filename includes date and time.
- [ ] Backup path is recorded.
- [ ] Backup file opens or is readable by PostgreSQL tools.

## Restore Verification

- [ ] Restore test completed.
- [ ] Restore was performed into a temporary database.
- [ ] App can connect to restored database.
- [ ] Prisma Client generated successfully.
- [ ] Migration status verified.

## Application Verification

- [ ] Login works.
- [ ] System Administrator dashboard works.
- [ ] Business Owner dashboard works.
- [ ] Customer page works.
- [ ] Scanner route works.
- [ ] Reward redemption page works.
- [ ] Billing pages work.
- [ ] Audit records exist.
- [ ] Tenant Center works.

## Security Verification

- [ ] Backup is not stored in public folder.
- [ ] `.env` backup is protected.
- [ ] Backup access is limited.
- [ ] Cloud or external copy is encrypted or private.

## Sign-Off

- [ ] Backup owner:
- [ ] Verification date:
- [ ] Restore test database:
- [ ] Notes:
