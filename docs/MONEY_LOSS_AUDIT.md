# Money-loss audit (June 2026)

Adversarial multi-agent audit of how someone could make Modern Bazaar lose money or
get paid value for free. **17 of 24 findings confirmed real.** Grouped by theme with
the remediation plan. The headline issue: **billing state and entitlement are
decoupled, and access is never revoked.**

> Context: access is gated by Auth0 token scopes (`use:bazaar-flipping`,
> `use:bazaar-manipulation`). The Lemon Squeezy webhook only writes `plan_slug` to our
> DB — it never touches Auth0. So the DB "knows" who paid, but the token (the only
> thing actually enforced) doesn't, and nothing downgrades on cancel/refund.

---

## A. Entitlement ↔ billing are decoupled (the big one) — findings 1–7, 14, 15, 17

**What's wrong**
- `SubscriptionService.applyProviderWebhook` only sets `plan_slug`/`status` in the DB; it makes **no Auth0 role/permission call**. The only role code that exists is `Auth0ManagementService.assignFreeRole` (first login). There is **no** `assignFlipperRole`/`assignEliteRole` and **no** `removeRoles`.
- So today the system **fails *closed*** (good news): a free user's token has no paid scope → 403 on paid endpoints. **Nobody gets paid features for free** out of the box.
- The bad news: a **paying** user also gets nothing in code — their token isn't upgraded unless something *outside the repo* (manual Auth0 assignment) grants it. → refunds, support load.
- And critically: **cancel / refund / chargeback / past_due never revoke access.** `subscription_cancelled` sets `status=canceled` but leaves `plan_slug` as `flipper`/`elite`, and no scope is removed. The stored `status` is read by **zero** authorization checks. So once a user *is* entitled, they keep it forever — including after a refund.

**Remediation (the #1 next build):** make `applyProviderWebhook` the source of truth for entitlement.
1. Create Auth0 RBAC roles **Flipper** (perm `use:bazaar-flipping`, `read:market_data`) and **Elite** (adds `use:bazaar-manipulation`) so their permissions land in the token's `permissions` claim. *(Auth0 config — owner step.)*
2. Add `Auth0ManagementService.syncPlanRoles(userId, planSlug)` that **adds** the role for the active plan and **removes** the other paid roles.
3. Call it from `applyProviderWebhook`:
   - `active` (or `canceled` but `currentPeriodEnd` in the future) → grant the plan's role.
   - `past_due` / `expired` / `currentPeriodEnd` passed → downgrade to Free role.
4. Add a small scheduled job to demote subscriptions whose `currentPeriodEnd` has passed (covers the "canceled, ran out the paid period" case with no webhook).
5. Defense in depth: optionally cross-check the DB `status`/`currentPeriodEnd` in a filter so a stale token can't outlive a refund.

Until this ships, **do not hand out paid Auth0 roles manually** expecting cancel to revoke them — it won't.

---

## B. Webhook doesn't handle refunds/failures — findings 4, 5, 6, 16

- `subscription_payment_failed`, `refunded`, chargeback, and `expired` events aren't handled → no downgrade. (Lemon Squeezy as Merchant of Record absorbs chargeback *fees/disputes*, but **we** must still revoke access.)
- `past_due` (failed renewal) doesn't downgrade.
- A compromised/over-broad **admin token** can grant unlimited free paid time via `setPlan` + `extend` (now bounded to 1–3650 days, but no audit log, no 2FA). Keep `ADMIN_USER_SUBS` tiny; add an audit log on plan mutations.

**Remediation:** handle `subscription_payment_failed`/`refunded`/`expired` in the webhook (downgrade + revoke via the sync above); add an `admin_action_log` for `setPlan`/`extend`.

---

## C. Infra-cost / abuse vectors — findings 8–13

| # | Sev | Issue | Fix |
|---|-----|-------|-----|
| 8 | high | Public `/api/metrics` runs full-table aggregate scans, no cache, no rate limit | cache (e.g. 30–60s), add rate limit, or require auth |
| 9 | high | resilience4j limiters are **global single buckets**, not per-IP/user — one attacker scrapes freely *and* can lock everyone out | move to per-IP limiting (ideally at the edge/Cloudflare); see [OPERATIONS.md](OPERATIONS.md) |
| 10 | med | Unbounded `limit` param lets one request scan the whole dataset | clamp `limit` to a max (e.g. 100) server-side |
| 11 | med | Catalog-refresh endpoints trigger an outbound Hypixel fetch + bulk upsert on demand, unthrottled | rate-limit + admin-only |
| 12 | low | Market data we pay to collect can be mirrored for free (scraping) | edge rate limits, bot detection, watermarking |
| 13 | low | Public `/api/me/setup` hits the Auth0 Management API every call → MAU/quota inflation | it already requires a valid JWT; cache the "already set up" result |

---

## What's already mitigated
- Webhook forgery/replay: **fixed** — signature is mandatory, referral conversions idempotent (see [SECURITY.md](SECURITY.md)).
- Discount abuse: `percentOff` bounded 1–100, `maxRedemptions`/expiry enforced in `DiscountService`. (Note: discounts are tracked locally; the actual price is enforced by Lemon Squeezy at checkout — make sure the LS-side discount matches.)
- Self-referral: blocked; referral idempotent per referred user. **Gap:** referral conversion isn't reversed on refund (finding 7) — reverse it when refund handling lands.

## Priority order
1. **A — entitlement sync + revocation** (the actual money leak once roles are granted).
2. **B — refund/expiry webhook handling** + admin audit log.
3. **C8/C9/C10 — `/api/metrics` cache, per-IP limits, clamp `limit`.**
