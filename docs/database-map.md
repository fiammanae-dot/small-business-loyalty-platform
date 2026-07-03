# Loyalty Card UAE Database Map

Version: 1.0  
Source: `prisma/schema.prisma`

## High-Level Relationship View

```text
Platform
├── Platform Settings
├── Subscription Plans
├── System Administrator Users
├── Audit Events
└── Failed Login Audit

Business
├── Branches
├── Users
├── Branding
├── Subscriptions
├── Invoices and Payments
├── Customers
├── Loyalty Programs
├── Scan Events
├── Stamp Transactions
├── Reward Redemptions
├── Referrals
├── Alerts
├── Engagement Events
├── Messages
├── Customer Notifications
├── Cooldown Rules
└── Audit Events

Customer
├── Global Customer
├── Business Membership
├── Program Memberships
├── Stamp Transactions
├── Reward Redemptions
├── Referrals
├── Engagement Events
├── Messages
└── Tier State
```

## Core Tables

| Table | Purpose | Primary Key | Key Relationships | Important Fields |
|---|---|---:|---|---|
| `users` | Platform and tenant users | `id` | `business_id`, `branch_id` | `role`, `status`, `session_version`, `force_password_change`, `last_login_at` |
| `businesses` | Tenant/business root | `id` | Owns branches, users, customers, programs | `uuid`, `name`, `business_type`, `status` |
| `branches` | Business locations | `id` | `business_id` | `name`, `country`, `city`, `status` |
| `global_customers` | Deduplicated customer identity | `id` | business memberships | `phone`, `normalized_phone`, `email`, `birthday` |
| `business_customer_memberships` | Customer's membership in a business | `id` | `global_customer_id`, `business_id`, `created_branch_id` | `card_token`, `referral_code`, `current_tier`, `marketing_consent`, `card_status` |
| `loyalty_programs` | Business loyalty programs | `id` | `business_id` | `required_stamps`, `starting_bonus_stamps`, `reward_name`, `referral_reward_bonus_stamps`, `status` |
| `customer_program_memberships` | Customer enrollment in program | `id` | customer membership and program | `earned_stamps`, `bonus_stamps`, `status` |

## Transaction Tables

| Table | Purpose | Primary Key | Key Relationships | Important Fields |
|---|---|---:|---|---|
| `stamp_transactions` | Immutable stamp issuance records | `id` | business, branch, user, customer program membership | `quantity`, `reason`, `idempotency_key`, `created_at` |
| `reward_redemptions` | Immutable reward redemption records | `id` | business, branch, loyalty program, customer program membership | `reward_name`, `required_stamps`, `redeemed_at`, `idempotency_key` |
| `scan_events` | QR scan audit trail | `id` | business, branch, scanner user, customer program membership | `scan_token`, `result`, `created_at` |
| `referrals` | Referral lifecycle | `id` | referrer, referred customer, program, first-stamp branch | `status`, `referral_code`, `qualified_at` |
| `referral_rewards` | Referral reward grant tracking | `id` | referral, business, program | `status`, `bonus_stamps`, `granted_at` |
| `referral_events` | Referral audit history | `id` | referral, business | `event_type`, `metadata` |
| `cooldown_events` | Cooldown violation/override events | `id` | business, branch, staff, program, cooldown rule | `violation_type`, `override_used`, `override_reason` |

## Billing and Subscription Tables

| Table | Purpose | Primary Key | Key Relationships | Important Fields |
|---|---|---:|---|---|
| `subscription_plans` | Commercial plan definitions | `id` | subscriptions | `code`, `monthly_price`, `annual_price`, `max_branches`, `max_loyalty_programs`, `billing_cycle_support` |
| `business_subscriptions` | Business plan lifecycle | `id` | business, subscription plan | `status`, `billing_cycle`, `start_date`, `expiry_date`, `renewal_date` |
| `subscription_audit_logs` | Subscription changes | `id` | business, subscription, user | `action`, `previous_value`, `new_value` |
| `invoices` | Billing invoices | `id` | business, subscription, creator | `invoice_number`, `amount`, `status`, `due_date` |
| `payments` | Payment records | `id` | invoice, business, recorder | `amount`, `payment_method`, `paid_at` |
| `invoice_audit_logs` | Invoice lifecycle audit | `id` | invoice, business, user | `action`, `previous_status`, `new_status` |

## Configuration Tables

| Table | Purpose | Primary Key | Key Relationships | Important Fields |
|---|---|---:|---|---|
| `platform_settings` | Global settings | `id` | none | `key`, `value` |
| `business_branding` | Business visual branding | `id` | business | `logo_url`, `primary_color`, `secondary_color`, `button_color` |
| `customer_tier_settings` | Business tier configuration | `id` | business | `tier_qualification_window`, `tier_maintenance_mode`, visit requirements |
| `business_communication_settings` | Message channel settings | `id` | business | channel enabled flags, sender fields |
| `message_templates` | Engagement message templates | `id` | optional business | `template_type`, `title`, `message`, `active` |
| `customer_notification_templates` | Customer notification templates | `id` | optional business | `notification_type`, `title`, `message` |
| `cooldown_rules` | Business stamp cooldown policy | `id` | business | limits, `generate_alert`, `active` |
| `abuse_policies` | Alert policy thresholds | `id` | business | `rule_type`, `threshold_value`, `severity`, `enabled` |

## Engagement, Messaging, and Notification Tables

| Table | Purpose | Primary Key | Key Relationships | Important Fields |
|---|---|---:|---|---|
| `engagement_events` | Customer engagement opportunities | `id` | business, customer | `event_type`, `event_date`, `status`, `metadata` |
| `message_delivery_queue` | Manual/provider-ready message queue | `id` | business, customer membership, event | `channel`, `recipient_masked`, `message_body`, `status` |
| `customer_notifications` | WhatsApp-ready customer notification events | `id` | business, customer membership | `notification_type`, `delivery_status`, `message_body` |

## Alert and Audit Tables

| Table | Purpose | Primary Key | Key Relationships | Important Fields |
|---|---|---:|---|---|
| `activity_alerts` | Fraud/risk alerts | `id` | business, branch, user, customer program membership | `alert_type`, `severity`, `priority`, `risk_score`, `status`, `dedupe_key` |
| `alert_events` | Alert lifecycle history | `id` | alert, business, actor | `event_type`, `metadata` |
| `audit_events` | Unified audit trail | `id` | actor user, business, branch | `action`, `entity_type`, `entity_id`, `metadata` |
| `failed_login_audit` | Failed login tracking | `id` | none | `email_attempted`, `ip_address`, `user_agent`, `outcome` |

## Prisma Model Inventory

Models documented: `User`, `FailedLoginAudit`, `Business`, `CustomerTierSetting`, `Branch`, `BusinessBranding`, `SubscriptionPlan`, `BusinessSubscription`, `SubscriptionAuditLog`, `Invoice`, `Payment`, `InvoiceAuditLog`, `GlobalCustomer`, `BusinessCustomerMembership`, `LoyaltyProgram`, `CustomerProgramMembership`, `StampTransaction`, `Referral`, `ReferralReward`, `ReferralEvent`, `RewardRedemption`, `ActivityAlert`, `AbusePolicy`, `AlertEvent`, `ScanEvent`, `EngagementEvent`, `MessageTemplate`, `CustomerNotificationTemplate`, `CustomerNotification`, `BusinessCommunicationSettings`, `MessageDeliveryQueue`, `PlatformSetting`, `AuditEvent`, `CooldownRule`, `CooldownEvent`.

Total models: 35.  
Total enums: 31.

