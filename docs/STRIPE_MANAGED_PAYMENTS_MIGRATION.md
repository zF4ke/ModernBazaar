# Payments migration: Lemon Squeezy → Stripe Managed Payments (MoR)

> Handoff doc. Self-contained so a fresh chat with no prior context can execute it.
> Read this top-to-bottom, then verify the referenced files before changing them.

## Why we're migrating

- **Lemon Squeezy denied our store verification** with no explanation and **no in-app
  appeal/reapply** (a widely-reported LS pattern). Their only feedback channel is emailing
  `hello@lemonsqueezy.com` — low value, slow.
- **Stripe acquired Lemon Squeezy** (July 2024) and is folding it into **Stripe Managed
  Payments**, Stripe's own **Merchant-of-Record** product (public preview Feb 2026, with a
  migration path off LS). LS-as-standalone is effectively sunsetting.
- **Stripe Managed Payments is the goal**: it's Stripe infrastructure **with** MoR — Stripe
  becomes the seller of record and handles sales-tax/VAT/GST **calculation, registration, and
  remittance** across 100+ countries. This gives us "Stripe, but no global-tax nightmare."
  (Plain Stripe is NOT an MoR — we explicitly do not want that; we'd owe EU VAT from euro 1.)

### Hard constraints / decisions already made
- **Keep the word "manipulation."** It's Hypixel SkyBlock terminology for a legitimate
  in-game trading strategy. The product is **data analysis** of a virtual in-game economy.
  Do NOT rename "Bazaar Manipulation." Instead, make the *positioning* unambiguous so a
  payments reviewer understands it's analytics, not a cheat:
  - Uses Hypixel's **official, public Bazaar API** (read-only).
  - **No automation, no botting, does not modify or interact with the game client.**
  - Virtual in-game currency only; no real-money trading.
  - **Not affiliated with / endorsed by Hypixel, Mojang, or Microsoft.** Minecraft and
    Hypixel are trademarks of their respective owners.
- **Stay on a Merchant of Record** (do not hand-roll tax). Target = Stripe Managed Payments.
  Fallbacks if SMP is unavailable for our country/product: **Polar** (dev-friendly MoR) or
  **Gumroad** (easiest approval, good for getting live fast).

## Implementation status (updated 2026-06-18)

Legal entity for the trust pages: **Pedro Silva** (individual / sole proprietor), contact
**modernbazaar.support@gmail.com**, jurisdiction **Portugal (EU → GDPR)**.

- **Phase 1 — DONE.** Trust/legal pages (`dashboard/app/{terms,privacy,refund,contact}/page.tsx`,
  shared `components/legal-page.tsx` + `lib/legal.ts`), shared `components/site-footer.tsx` with the
  non-affiliation/read-only disclaimer, reframed landing copy in `app/page.tsx`. Templates are marked
  "not legal advice — needs owner review."
- **Phase 2 — DONE (code).** `stripe-java` added to `core/build.gradle` (⚠ pin the version to the
  latest stable on Maven Central before shipping). `config/StripeConfig` sets the API key.
  `service/StripeBillingService` (checkout/portal/cancel). `api/StripeWebhookController`
  (`POST /api/v1/billing/webhook/stripe`, public route added to `SecurityConfig`). `api/StripeBillingController`
  (`POST /api/me/billing/checkout-session` + `/portal-session`). `SubscriptionService` cancel/resume now
  dispatch by id shape: Stripe (`sub_…`) → Stripe API, legacy numeric → Lemon Squeezy. Referral
  attribution preserved (ref carried in Checkout subscription metadata). Stripe config keys added.
- **Phase 3 — DONE.** `components/upgrade-button.tsx` now POSTs to the checkout-session endpoint and
  redirects to the Stripe URL (LS static links + `NEXT_PUBLIC_LS_CHECKOUT_*` removed). Profile page has a
  "Manage billing" Customer-Portal button. New proxy routes under `app/api/me/billing/`.
- **Coupons — REMOVED.** The local discount-code feature (admin CRUD, never wired to checkout) was
  deleted backend + frontend; Stripe handles promo codes natively (`allow_promotion_codes` on Checkout).
  Affiliates/referrals were kept intact. The orphaned `discount_code` table can be dropped by hand
  (Hibernate `ddl-auto: update` won't drop it). Stale doc mentions remain in `README.md`, `docs/MARKETING.md`,
  `docs/ADMIN_SUITE_PLAN.md` — clean up when convenient.
- **Phases 4–5 — OWNER / TODO.** Stripe dashboard config (enable Managed Payments, Tax, Radar, create
  products+prices, set `plan.stripe_price_id` to the Stripe price IDs, webhook endpoint + signing secret),
  then test-mode end-to-end. Cancel-resume decision: kept the **custom** endpoints (preserves churn feedback)
  + added a Customer-Portal link, rather than the portal-only approach.

## How to apply for Stripe Managed Payments (owner task)

Exact dashboard UI may differ — follow Stripe's prompts; this is the shape:
1. Create / sign in to a **Stripe account** (https://stripe.com). Complete the business
   profile + identity verification (standard Stripe onboarding).
2. Go to **https://stripe.com/managed-payments** → request access / "Get started". As of
   Feb 2026 it's in **public preview**; you may need to join the preview and **accept the
   Managed Payments Terms of Service** (accepting the ToS is what makes Stripe the MoR).
3. Confirm eligibility: **subscription SaaS / digital goods**, selling to **North America +
   Europe**, your country supported. (We fit: monthly digital subscriptions.)
4. Enable **Stripe Tax** (Managed Payments uses it) and set the origin/business address.
5. Create **Products + recurring Prices** for Flipper and Elite → copy the **price IDs**.
6. Turn on **Radar** (basic fraud is included free; "Radar for Fraud Teams" is the paid tier).
7. Create a **webhook endpoint** pointing at our backend (see below) and copy its
   **signing secret**.

Owner inputs needed for the legal pages (Phase 1): **business/legal name, contact email,
country/jurisdiction.**

---

## What exists today (Lemon Squeezy integration — to be replaced)

Verify these in code before editing; signatures may have changed.

**Backend (`core/`):**
- `api/LemonSqueezyWebhookController.java` — `POST /api/v1/billing/webhook/lemonsqueezy`,
  verifies `X-Signature` HMAC-SHA256, parses `meta.event_name` / `meta.custom_data.user_id` /
  `data.attributes.variant_id` / `status` / `renews_at`, calls `applyProviderWebhook`.
- `service/SubscriptionService.java`:
  - `applyProviderWebhook(priceId, customerId, subscriptionId, periodEndEpoch, status, userId)`
    — upserts the user's `user_subscription`, maps variant→plan via `plan.stripe_price_id`,
    syncs Auth0 role, and cancels an orphaned duplicate subscription (double-billing guard).
  - `requestCancellation(...)` / `requestResume(...)` — call `setLemonSqueezyCancelled(id, bool)`
    (LS API `PATCH /v1/subscriptions/{id}` with `cancelled: true/false`), flip local status.
  - Writes churn feedback to `subscription_cancellation` (provider-agnostic — keep as-is).
- `api/SubscriptionController.java` — `GET /api/me/subscription`, `POST .../cancel`,
  `POST .../resume`, `GET /api/me/permissions`, `GET /api/plans`.
- `config/SecurityConfig.java` — `/api/v1/billing/webhook/lemonsqueezy` is a **public**
  (signature-verified) route. New Stripe webhook route must also be public.
- Config keys (`application.yml` + `application-docker.yml`): `billing.enabled`
  (`${BILLING_ENABLED:false}`), `lemonsqueezy.webhook-secret`, `lemonsqueezy.api-key`.

**Frontend (`dashboard/`):**
- `components/upgrade-button.tsx` — `useUpgrade()` opens LS hosted checkout from
  `NEXT_PUBLIC_LS_CHECKOUT_FLIPPER` / `_ELITE`, passes `checkout[custom][user_id]=<auth0 sub>`;
  login-first + post-login resume; disables for current/lower tier.
- `app/dashboard/profile/page.tsx` — plan display + cancel/resume UI (calls the proxy routes).
- `app/api/me/subscription/{route,cancel/route,resume/route}.ts` — proxy to backend.
- `app/dashboard/admin/cancellations/` — churn-feedback admin view (keep).

**Database (columns already named `stripe*` — reused as generic provider ids, so Stripe fits
naturally):**
- `user_subscription`: `plan_slug`, `status`, `stripe_customer_id`, `stripe_subscription_id`,
  `current_period_end`, `email`, `name`.
- `plan`: `slug`, `name`, `stripe_price_id` (currently holds LS variant IDs:
  flipper=`1790830`, elite=`1790836` — will be replaced by Stripe price IDs).
- `subscription_cancellation`: churn feedback (provider-agnostic).

**Current env (infra/.env — gitignored):** `BILLING_ENABLED=true`,
`LEMONSQUEEZY_WEBHOOK_SECRET`, `LEMONSQUEEZY_API_KEY`. Dashboard `.env`:
`NEXT_PUBLIC_LS_CHECKOUT_FLIPPER/_ELITE`.

> Historical note: the project ran **Stripe before LS** and removed it. The `stripe-java`
> dep, a `BillingWebhookController`, `stripe.*` config and `/webhook/stripe` were deleted, but
> the `stripe*` DB columns were intentionally kept. So we're partly returning to a prior shape.

---

## Migration plan (phased)

### Phase 1 — Trust & legal pages + reframed copy (provider-agnostic; the actual denial fix)
Do this first; required by **any** MoR including Stripe Managed Payments.
- Add real pages (dashboard, public): **Terms of Service, Privacy Policy, Refund Policy,
  Contact**. Draft as solid templates — **explicitly "not legal advice," needs owner review.**
- Tighten the landing page (`dashboard/app/page.tsx`) and product copy:
  - Keep "Bazaar Manipulation" as the strategy name.
  - Add the positioning + disclaimer from "Hard constraints" above (official public API,
    read-only, no automation, not affiliated, virtual currency).
- Add a footer with links to the legal pages + contact + the non-affiliation disclaimer.
- Needs owner inputs: legal name, contact email, country.

### Phase 2 — Backend: Stripe (Managed Payments) integration
- Re-add `stripe-java` (`com.stripe:stripe-java`) to `core/build.gradle`.
- New `StripeWebhookController` — `POST /api/v1/billing/webhook/stripe`, verify the
  `Stripe-Signature` header with the webhook signing secret (`com.stripe.net.Webhook`).
  Handle: `checkout.session.completed`, `customer.subscription.updated`,
  `customer.subscription.deleted`, `invoice.paid` → map to `applyProviderWebhook`.
  Carry `user_id` via Checkout Session `client_reference_id` or `metadata.user_id`.
  Add the route to `SecurityConfig` public endpoints.
- Checkout: endpoint that creates a **Stripe Checkout Session** (subscription mode, the
  plan's Stripe price, `client_reference_id=<auth0 sub>`, success/cancel URLs). With Managed
  Payments enabled, Stripe handles tax + MoR automatically.
- Cancel/resume: simplest is the **Stripe Customer Portal** (create a billing-portal session;
  it handles cancel/resume/update-card/invoices) — this can **replace** the custom
  cancel/resume flow. Or keep custom endpoints calling the Stripe subscriptions API
  (`Subscription.update` with `cancel_at_period_end`).
- Config: `stripe.secret-key` (`${STRIPE_SECRET_KEY:}`), `stripe.webhook-secret`
  (`${STRIPE_WEBHOOK_SECRET:}`). Keep `billing.enabled`.
- Map `plan.stripe_price_id` to the **Stripe price IDs** (replace the LS variant IDs).

### Phase 3 — Frontend
- `useUpgrade()` → call the new "create checkout session" endpoint and redirect to the
  returned Stripe Checkout URL (replaces the static LS buy links). Keep login-first +
  current/lower-tier guard.
- "Manage subscription" / cancel-resume → redirect to the Stripe Customer Portal session
  (or keep the existing cancel/resume UI wired to the Stripe-backed endpoints).
- Env: drop `NEXT_PUBLIC_LS_CHECKOUT_*` (Checkout is created server-side now).

### Phase 4 — Stripe dashboard config (owner)
Products/prices, **enable Managed Payments**, **Stripe Tax**, **Radar**, webhook endpoint +
signing secret. (See "How to apply" above.)

### Phase 5 — Test
- Stripe **test mode** + test cards (`4242 4242 4242 4242`).
- Local webhooks: `stripe listen --forward-to localhost:8080/api/v1/billing/webhook/stripe`
  (preferred) **or** a cloudflared quick tunnel to 8080 (see gotchas).
- Verify end-to-end: checkout → entitlement unlock → cancel → resume → churn-feedback row.

### Cleanup (after cutover)
- Remove `LemonSqueezyWebhookController`, LS branches in `SubscriptionService`, LS config keys,
  and `LEMONSQUEEZY_*` env. Update `docs/LEMON_SQUEEZY_SETUP.md` (or replace with a Stripe doc).

---

## Env vars: old → new
| Old (Lemon Squeezy) | New (Stripe Managed Payments) |
|---|---|
| `LEMONSQUEEZY_WEBHOOK_SECRET` | `STRIPE_WEBHOOK_SECRET` |
| `LEMONSQUEEZY_API_KEY` | `STRIPE_SECRET_KEY` |
| `NEXT_PUBLIC_LS_CHECKOUT_FLIPPER/_ELITE` | (none — Checkout Sessions are server-created) |
| `plan.stripe_price_id` = LS variant IDs | `plan.stripe_price_id` = Stripe price IDs |
| `BILLING_ENABLED` | `BILLING_ENABLED` (unchanged) |
| (n/a) | `STRIPE_SUCCESS_URL` — Checkout success redirect (default `…/dashboard/profile?checkout=success`) |
| (n/a) | `STRIPE_CANCEL_URL` — Checkout cancel redirect (default `…/dashboard/profile?checkout=cancelled`) |
| (n/a) | `STRIPE_PORTAL_RETURN_URL` — Customer-Portal return (default `…/dashboard/profile`) |

> The three URL vars default to `localhost:3001`; set them to the real dashboard host in prod.
> `$`-escape rule still applies to any secret in `infra/.env` (write `$` as `$$`).

> Reminder: `infra/.env` is a Docker Compose `env_file` and Compose **interpolates** it —
> **escape every `$` in a secret as `$$`**, then verify with
> `docker exec modernbazaar-core-1 printenv STRIPE_WEBHOOK_SECRET`.

## Environment gotchas learned the hard way (don't repeat these)
- **`$$` escaping** in `infra/.env` (above) — an unescaped `$word` is eaten by Compose
  interpolation and silently corrupts the secret → webhook 400s.
- **Never run concurrent `docker compose` commands** — it deadlocked the daemon and tore down
  the DB. One compose op at a time; if Docker wedges, `wsl --shutdown` + wait, then
  `docker compose -f infra/docker-compose.yml -p modernbazaar up -d`.
- **OneDrive locks the Gradle/Next build dirs.** If `gradlew` fails with EINVAL/"cannot
  snapshot"/"failed to clean up", delete `core/build` (or `dashboard/.next`) with a short
  retry loop in PowerShell, then rebuild.
- **Auth fail-closed guard**: tests/CI need `AUTH_MOCK_ENABLED=true` (already set in
  `application-test.yml` and the CI smoke-test `docker run`). Prod uses a real `AUTH_JWKS_URI`.
- **Local webhook testing** needs a public URL: `stripe listen` (best for Stripe) or a
  cloudflared quick tunnel (ephemeral URL — re-register on restart).

## Open questions before/while executing
1. Is **Stripe Managed Payments** available for the owner's **country** and product category?
   (Confirm in the Stripe dashboard. If not → Polar or Gumroad.)
2. Cancel/resume: use the **Stripe Customer Portal** (less code) or keep custom endpoints?
3. Annual prices in addition to monthly? (Currently monthly only: $9.99 / $25.99.)
