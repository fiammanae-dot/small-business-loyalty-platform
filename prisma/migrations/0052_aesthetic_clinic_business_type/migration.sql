-- Laser and skin clinics sell a package of sessions rather than single visits,
-- so they get their own category: a package template that starts empty (the
-- customer has already paid for the sessions) and a card design of their own.
--
-- Adding a value to an existing enum is additive. Every existing business keeps
-- the category it already has, and nothing reads this value until a business is
-- actually set to it.
ALTER TYPE "BusinessType" ADD VALUE IF NOT EXISTS 'AESTHETIC_CLINIC';
