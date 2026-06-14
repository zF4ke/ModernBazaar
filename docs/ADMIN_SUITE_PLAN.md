# Modern Bazaar — Admin Suite & Payments Plan

## 1. Executive Summary

This plan delivers an admin analytics and user-management suite for Modern Bazaar plus a payments stack chosen to keep the solo founder out of the tax-compliance business. We adopt **Lemon Squeezy as Merchant of Record** so VAT/sales-tax registration, filing, and remittance disappear entirely, at a flat 5% + $0.50/transaction. We build in three phases — read-only analytics first (no side effects, immediate business value), then user management backed by Auth0 + the local DB, then discount codes and referrals wired into Lemon Squeezy webhooks. Every endpoint reuses the existing `SCOPE_manage:plans` security model in `SecurityConfig.java` and the established Next.js admin proxy pattern under `app/dashboard/admin/*`.

## 2. Payments & Tax Recommendation

**Provider: Lemon Squeezy (Merchant of Record).**

- **Who becomes MoR:** Lemon Squeezy is the legal seller of record. It registers for, collects, files, and remits VAT/GST/sales-tax in 100+ countries on the owner's behalf. The owner never registers for tax in any jurisdiction.
- **Fee impact:** Flat **5% + $0.50 per transaction**, no monthly fee, no separate tax-service fee. On a $5/month sub that is ~$0.75 (~15% on a low-ticket item — the cost of zero compliance work), and the effective rate falls sharply on annual/higher-priced plans. Compare: Stripe's base 2.9% + $0.30 looks cheaper but Stripe Tax only *calculates* rates — the owner would still register/file/remit everywhere or pay TaxJar/Avalara $5k–$20k/yr.
- **Why it minimizes tax burden:** As a solo dev selling to a global Hypixel SkyBlock audience (mostly non-US players, heavy EU VAT exposure), the MoR model removes the single largest operational and legal risk. Integration is 1–2 days vs 2–4 weeks for Stripe, with simple `X-Signature` webhook verification.

**Owner setup checklist (one-time):**

1. **Account:** Create a Lemon Squeezy account, create a Store, complete payout/identity verification.
2. **Products & prices/variants:** Create one product per paid plan with a monthly variant (and optional annual):
   - `flipper` → monthly variant (e.g. $X/mo)
   - `elite` → monthly variant (e.g. $Y/mo)
   - (`free` stays local-only, no Lemon Squeezy product.)
   - Record each **variant ID** — these replace `Plan.stripePriceId` semantics; store them in the existing `plan.stripePriceId` column (rename conceptually to "provider price/variant id") or add `ls_variant_id`.
3. **Webhook:** In Lemon Squeezy → Settings → Webhooks, add `https://<api-host>/api/v1/billing/webhook/lemonsqueezy` subscribed to `subscription_created`, `subscription_updated`, `subscription_cancelled`, `subscription_payment_success`. Copy the **signing secret**.
4. **Checkout link / API key:** Generate an API key for server-side checkout-URL creation; note the store ID.
5. **Env vars (Spring Boot):**
   - `BILLING_ENABLED=true` (existing flag `billing.enabled`)
   - `LEMONSQUEEZY_API_KEY=...`
   - `LEMONSQUEEZY_STORE_ID=...`
   - `LEMONSQUEEZY_WEBHOOK_SECRET=...` (replaces `stripe.webhook-secret` usage)
6. **Backend work:** Add a sibling to the existing Stripe handler — a `POST /api/v1/billing/webhook/lemonsqueezy` controller that verifies the `X-Signature` HMAC, maps the variant ID → plan slug, and calls the existing `SubscriptionService.applyStripeWebhook(...)` logic (generalize/rename it to `applyProviderWebhook(...)`). Reuse `UserSubscription` (`stripeCustomerId`/`stripeSubscriptionId` columns hold the Lemon Squeezy customer/subscription IDs). The webhook route stays public in `SecurityConfig.java`, exactly like the current Stripe webhook.

> Migration note: keep the existing Stripe webhook path intact behind `billing.enabled`; add Lemon Squeezy in parallel so nothing already wired breaks. No `UserSubscription` schema change is required — only ID semantics change.

## 3. Phase 1 — Admin Analytics Dashboard (read-only, build first)

Read-only, no side effects, immediate value. Establishes `AdminAnalyticsController` + a `DataFetchService`/`AnalyticsService`.

### 3.1 Backend endpoint

`GET /api/admin/analytics/summary?from={ISO}&to={ISO}` — protected by `SecurityConfig.SCOPE_MANAGE_PLANS` (same authority as `AdminPlansController`). Returns `AnalyticsSummaryDTO`.

**SQL / JPQL (against existing `user_subscription` + `plan`):**

```sql
-- Total users (distinct subscribers)
SELECT COUNT(DISTINCT user_id) FROM user_subscription;

-- Active subscriptions by status
SELECT status, COUNT(*) AS cnt
FROM user_subscription
GROUP BY status;

-- Plan distribution (latest subscription per user)
WITH latest AS (
  SELECT DISTINCT ON (user_id) user_id, plan_slug
  FROM user_subscription
  ORDER BY user_id, id DESC
)
SELECT plan_slug, COUNT(*) AS users
FROM latest
GROUP BY plan_slug;

-- New signups over time (daily, in range)
SELECT date_trunc('day', created_at) AS day, COUNT(*) AS signups
FROM user_subscription
WHERE created_at BETWEEN :from AND :to
GROUP BY 1
ORDER BY 1;

-- Churn % (last 30d): canceled in window / active at window start
SELECT
  COUNT(*) FILTER (WHERE status = 'canceled'
    AND updated_at >= now() - interval '30 days') AS canceled_30d,
  COUNT(*) FILTER (WHERE status = 'active') AS active_now;

-- MRR estimate (requires plan.monthly_amount_cents; see note)
SELECT COALESCE(SUM(p.monthly_amount_cents), 0) AS mrr_cents
FROM (
  SELECT DISTINCT ON (user_id) user_id, plan_slug
  FROM user_subscription
  WHERE status = 'active'
  ORDER BY user_id, id DESC
) s
JOIN plan p ON p.slug = s.plan_slug;
```

> Revenue note: `Plan.java` currently has no price amount — add `monthly_amount_cents` (and `annual_amount_cents`) to the `plan` table via Flyway so MRR is computed locally without a provider API round-trip. Until that column exists, `mrrEstimate` returns `null` and the UI shows "—".

### 3.2 DTO

```java
public record AnalyticsSummaryDTO(
    long totalUsers,
    long activeSubscriptions,
    int totalPlans,
    Long mrrEstimateCents,                  // nullable until monthly_amount_cents exists
    List<PlanDistributionDTO> planDistribution,   // (planSlug, planName, userCount, pct)
    List<SignupPointDTO> newSignupsTrend,         // (day, count)
    ChurnMetricsDTO churnMetrics,                 // (churnPercentage30d, canceledCount30d, activeCount)
    List<StatusCountDTO> statusBreakdown          // (status, count)
) {}
```

New repository methods on `UserSubscriptionRepository`: `countDistinctUserId()`, `countByStatus(...)`, `latestPlanDistribution()`, `signupsBetween(from,to)`, `churnCounts()` — implemented with `@Query` matching the SQL above.

### 3.3 Frontend — new admin page + proxy route

- **Proxy route:** `app/api/admin/analytics/summary/route.ts` — mirror `app/api/admin/plans/route.ts`: read `Authorization` header via `getSessionAccessToken()`, forward to `${BACKEND_URL}/api/admin/analytics/summary`, normalize errors with `handleBackendError()` (returns `requiredPermissions`/`missingPermissions`/`currentPermissions`).
- **Page:** `app/dashboard/admin/analytics/page.tsx` — `'use client'`, gate with `useAdminAccess()`, fetch via `useBackendQuery` with `refetchInterval: 30000`.
- **Metrics shown:**
  - Top row of `StatusCard`s: **Total Users**, **Active Subscriptions**, **MRR estimate** (or "—"), **30d Churn %**.
  - **Plan distribution** — `FeatureCard(backgroundStyle="glass")` with a horizontal bar/legend per slug (free/flipper/elite).
  - **Signups over time** — line/area chart from `newSignupsTrend`.
  - **Status breakdown** — small badges (active/past_due/canceled/incomplete) with counts.
- Wrap header in `GradientSection(variant="hero")` with title "Analytics". Loading: `Skeleton` cards matching the tile count, driven by `adminLoading` from `useAdminAccess()`.

## 4. Phase 2 — User Management

### 4.1 Backend

Extend `Auth0ManagementService` with public methods (cache with `@Cacheable` to respect Auth0 quota): `getUser(userId)`, `listUsersPage(page, size, query)`, `getLastLogin(userId)`. Requires Auth0 M2M scopes `read:users` (already partly requested) + `update:users` for the grant-admin path.

Endpoints (all `SCOPE_manage:plans`; grant-admin additionally gated by a new `SCOPE_manage:admin`):

- `GET /api/admin/users?page&size&plan&status&search` → `PagedResponseDTO<AdminUserDTO>`. **Two-pass:** (1) query local `user_subscription` (latest per user via `findFirstByUserIdOrderByIdDesc`-style logic) filtered by `plan`/`status`; (2) enrich each row with Auth0 (`email`, `nickname`, `lastLogin`, `emailVerified`, `isAdmin`) via batched `Auth0ManagementService.getUser()` to avoid N+1.
- `PATCH /api/admin/users/{userId}/plan` (body: `{ planSlug }`) → reuse `SubscriptionService` to upsert the `UserSubscription` (validate slug via `PlanRepository.findBySlug`). Returns updated `AdminUserDTO` + `auditLogId`.
- `POST /api/admin/users/{userId}/extend-plan` (body: `{ days }`) → bump `currentPeriodEnd` on the latest `UserSubscription`.
- `POST /api/admin/users/{userId}/grant-admin` → `Auth0ManagementService.addRoles(...)` to assign an admin role; requires `SCOPE_manage:admin`.

`AdminUserDTO` = DB fields (`planSlug`, `subscriptionStatus`, `currentPeriodEnd`, `stripeCustomerId`, `createdAt/updatedAt`) merged with Auth0 fields (`email`, `nickname`, `lastLogin`, `emailVerified`, `isAdmin`). Use `PagedResponseDTO<T>` (mirror the shape in `BazaarItemsController`).

### 4.2 Frontend

- **Proxy routes:** `app/api/admin/users/route.ts`, `app/api/admin/users/[userId]/plan/route.ts`, `.../extend-plan/route.ts`, `.../grant-admin/route.ts` — same `getSessionAccessToken()` + `handleBackendError()` pattern.
- **Page:** `app/dashboard/admin/users/page.tsx` — `Card` grid / table, server-side pagination via `queryKey` (`page`, `filters`) in `useBackendQuery`. Inline actions per row: **Change plan** (`Select` of slugs), **Extend** (`Input` days), **Grant admin** (`Button`). Each destructive/mutating action behind an `AlertDialog` confirm; buttons show spinner + `disabled` while submitting; toast success/destructive via `useToast()`. On success show "Action tracked as #{auditLogId}".

## 5. Phase 3 — Discount Codes & Referrals

### 5.1 New tables (Flyway, mirror `UserSubscription` Lombok `@Entity` pattern)

- `discount_code` — `code` (unique), `discount_type` (`percentage`|`fixed_amount`), `discount_value`, `applicable_plans` (JSON; null = all), `max_uses`, `times_used`, `expires_at`, `created_by_user_id`, audit timestamps.
- `discount_redemption` — FK → `discount_code`, FK → `user_subscription`, `redeemed_at`, `discount_amount_cents`.
- `referral_program` — `referrer_user_id`, `referral_code` (`REF_<userId>_<random>`), `reward_type` (`discount`|`free_month`|`credit`), `reward_value`, `max_referrals`, `expires_at`.
- `referral_conversion` — FK → `referral_program`, FK → `user_subscription`, `converted_at`, `reward_issued_at`.
- `admin_audit_log` — `admin_user_id`, `action`, `resource_type`, `resource_id`, `old_value`/`new_value` (JSON), `reason`, `created_at`.

Migrations `V5__discount_code_tables.sql` … `V9__admin_audit_log_table.sql`. Backfill the analytics MRR by adding `monthly_amount_cents`/`annual_amount_cents` to `plan` in an earlier migration.

### 5.2 Endpoints (all `SCOPE_manage:plans`)

- `POST /api/admin/discount-codes`, `GET /api/admin/discount-codes` (paginated), `PATCH /api/admin/discount-codes/{codeId}`, `GET /api/admin/discount-codes/{code}/validate` (real-time validity for checkout).
- `POST /api/admin/referral-programs`, `GET /api/admin/referrals/stats` (top referrers).
- `GET /api/admin/audit-log?action&admin&from&to` (searchable).

Audit logging implemented as an annotation-driven interceptor (`@AdminAction` on controller methods) reading the actor from `SecurityContextHolder`; all mutating admin actions across Phases 2–3 write `admin_audit_log` and return `auditLogId`.

### 5.3 Tie-in to Lemon Squeezy

- **Discounts:** Create matching **discount in Lemon Squeezy** (its native discount/coupon feature) and store the LS discount ID alongside the local `discount_code` row, so the price the customer actually pays is enforced by the MoR at checkout. The local `discount_redemption` table records analytics; the actual money math is done by Lemon Squeezy. The checkout URL the backend generates includes the discount/checkout-data so the code is pre-applied.
- **Referrals:** On webhook `subscription_payment_success`, the Lemon Squeezy handler checks the `ref` value carried through checkout custom data, matches it to `referral_program.referral_code`, writes a `referral_conversion`, and sets `reward_issued_at` only after the **first successful payment** (not at signup). Reward fulfillment (`free_month`/`credit`) is applied by creating the corresponding Lemon Squeezy discount or extending `currentPeriodEnd`.
- Native LS affiliate tooling can be layered later; the local tables remain the source of truth for admin reporting.

### 5.4 Frontend

`app/dashboard/admin/discounts/page.tsx` and `app/dashboard/admin/referrals/page.tsx` — create/list/expire forms (`Input`/`Select`/`Switch`/`Button`), paginated tables with inline activate/deactivate, top-referrers list. Same proxy-route + `handleBackendError()` + `useToast()` patterns.

## 6. Risks / Sequencing

**Sequencing (strict):**
1. **Phase 1 analytics** first — read-only, zero side effects, ships value immediately and stands up `AdminAnalyticsController` + repository query methods.
2. **Payments (Lemon Squeezy)** in parallel with Phase 1 once the owner completes the account/product setup — it is independent of the dashboard and unblocks revenue + Phase 3.
3. **Phase 2 user management** next (depends on Auth0 scope grants `read:users`/`update:users`).
4. **Phase 3 discounts/referrals** last (depends on payments live + audit-log infra).

**Risks & mitigations:**
- **Missing rate limiter config:** `subscriptionEndpoint` is referenced in code but absent from `application.yml` — it will throw at runtime. Add it under `resilience4j.ratelimiter.instances` (e.g. 50/min) before any new admin traffic; add an `adminEndpoint` limiter too.
- **MRR has no price source:** `Plan` lacks an amount column — MRR is `null` until `monthly_amount_cents` is added. Do not block Phase 1 on it; show "—".
- **Auth0 API quota / N+1:** user enrichment can blow the Management API quota — mandatory `@Cacheable` and batched lookups; consider a periodic role-sync rather than per-request calls.
- **`ddl-auto: update` drift:** the subscription tables are Hibernate-generated. Introduce Flyway (`V5+`) for all new tables and the `plan` amount columns to keep prod migrations reviewable; do not add more entities under `ddl-auto`.
- **Webhook safety:** verify the LS `X-Signature` HMAC and keep the route public exactly like the existing Stripe webhook; persist raw webhook events for replay/audit (current Stripe handler processes synchronously with no retry).
- **Scope creep on grant-admin:** introduce `SCOPE_manage:admin` so a plan manager can't self-promote users; require it in `SecurityConfig.java` in addition to `manage:plans`.
- **Graceful-degradation trap:** `SubscriptionService` currently returns non-persisted in-memory objects on failure — admin write paths (plan change/extend) must fail loudly (real errors), not silently return phantom state.
