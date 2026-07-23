# Deployment & go-live guide

How to take Modern Bazaar from localhost to production. Two things get hosted:

- **Dashboard** (Next.js) → **Vercel** (you already have `modern-bazaar.vercel.app`).
- **Backend** (`core` Spring Boot + Postgres + the `infra` Docker stack) → any host that runs
  Docker and gives you a **public HTTPS URL** (Railway, Render, Fly.io, or a VPS). The public URL
  is required so Stripe can reach the webhook.

> Order that avoids pain: **backend first** (you need its public URL for the dashboard's
> `BACKEND_URL` and for the Stripe webhook), then the dashboard, then wire Auth0 + Stripe to the
> real domain.

---

## 1. Backend (`core` + Postgres)

The stack is defined in `infra/docker-compose.yml`; `core` is built from `infra/docker/core.Dockerfile`
(multi-stage — compiles in Docker, no host JDK needed).

1. Pick a host that runs Docker with a public HTTPS endpoint and a managed Postgres (or run the
   `db` service from the compose file).
2. Copy `infra/.env.example` → `infra/.env` on the host and fill it in (see the **env matrix** below).
   Real secrets only; remember the `$$`-escaping rule for any literal `$`.
3. Bring it up:
   ```
   docker compose -f infra/docker-compose.yml -p modernbazaar up -d --build
   ```
4. Confirm health: `curl https://<api-host>/actuator/health` → `{"status":"UP"}`.
5. Note the public base URL, e.g. `https://api.modernbazaar.com` — this is `BACKEND_URL` for the
   dashboard and the host of the Stripe webhook (`/api/v1/billing/webhook/stripe`).

**Security must-haves in prod (already enforced by the code, just don't misconfigure):**
- `AUTH_MOCK_ENABLED` unset/false (the app refuses to start with a real JWKS missing — fail-closed).
- `AUTH_JWKS_URI` / `AUTH_ISSUER_URI` / `AUTH_AUDIENCE` set to your Auth0 values.
- `CORS_ALLOWED_ORIGINS` = the exact dashboard origin(s), e.g. `https://modernbazaar.com`.
- Distinct, strong values for `POSTGRES_PASSWORD`, `SPRING_SECURITY_USER_PASSWORD`, etc.

## 2. Dashboard (Vercel)

1. Import the repo into Vercel; set the project root to `dashboard/`.
2. Set environment variables (Project → Settings → Environment Variables) — see the matrix below.
   The key one: `BACKEND_URL` = your backend's public HTTPS URL.
3. Deploy. Point your domain (e.g. `modernbazaar.com`) at the Vercel project.

## 3. DNS / domain

A custom domain matters for trust (and for the payments/MoR review — a real domain reads as a real
business, not a preview URL). Typical layout:
- `modernbazaar.com` → dashboard (Vercel)
- `api.modernbazaar.com` → backend host
- (optional) `auth.modernbazaar.com` → Auth0 **custom domain** (see §4)

## 4. Auth0 (production)

**"Is Auth0 in test mode?"** Auth0 has no test/live switch like Stripe; the
`dev-5dw1c9bd` prefix is just the tenant's name. What actually makes an Auth0
setup non-production is this checklist:

1. **Social connections MUST use your own OAuth apps.** By default Auth0 signs
   Google/GitHub/Discord logins with its shared developer keys (the dashboard
   shows an orange warning on each connection using them). Dev keys break
   silently at scale and show "Auth0" on consent screens. Fix per provider in
   Authentication -> Social -> (provider): create your own app (Google Cloud
   Console, GitHub Developer Settings, Discord Developer Portal), paste its
   client id/secret. This is the single most important "out of test mode" step.
2. **Environment Tag**: Settings -> General -> Environment Tag -> Production
   (informational, but it is what the dashboard means by dev/prod).
3. Friendly Name + logo (Settings -> General) so login says "Modern Bazaar",
   not the tenant id.
4. Production URLs on the application (callback/logout/web origins, section
   below) and delete any localhost URLs from the PROD application (use a
   separate application for dev instead of sharing one).
5. The consent screen ("Authorize App") disappears on non-localhost domains;
   also enable "Allow Skipping User Consent" on the API.

In the Auth0 dashboard for your tenant:

1. **Application → Settings → URLs** (use your real domain):
   - Allowed Callback URLs: `https://modernbazaar.com/auth/callback`
   - Allowed Logout URLs: `https://modernbazaar.com`
   - Allowed Web Origins: `https://modernbazaar.com`
2. **Branding** (kills the "dev-5dw1c9bd" look):
   - Tenant **Settings → General → Friendly Name** = `Modern Bazaar`, set a **Logo URL**. This
     replaces "Log in to dev-5dw1c9bd" with "Log in to Modern Bazaar".
   - **Branding → Universal Login** → set logo, primary color, background.
3. **Remove the "Authorize App" consent screen:**
   - Auth0 forces the consent dialog for **localhost** callbacks (dev only) — it disappears in
     production with a real (non-localhost) domain.
   - Also enable **APIs → (your API) → Settings → Allow Skipping User Consent**, and keep the app
     **first-party** (default for apps you created).
4. **Custom auth domain (optional, paid):** to replace `dev-5dw1c9bd.us.auth0.com` in the URL bar
   with `auth.modernbazaar.com`, configure a Custom Domain (Branding → Custom Domains) and update
   `AUTH0_DOMAIN` / `AUTH_ISSUER_URI` / `AUTH_JWKS_URI` accordingly.

## 5. Stripe (production / live)

> Do this only after confirming **Managed Payments / MoR** is active for your account and that Stripe
> handles EU VAT as seller of record (see `STRIPE_MANAGED_PAYMENTS_MIGRATION.md`). Until then, stay in
> test mode.

1. Toggle **off** Test mode. Get the **live** secret key (`sk_live_…`) → `STRIPE_SECRET_KEY`.
2. **Create the products + recurring prices in LIVE mode** (test prices don't exist in live). Copy
   the live `price_…` ids and set them via the admin **Plans** page, or as `STRIPE_PRICE_FLIPPER` /
   `STRIPE_PRICE_ELITE` env (the seeder applies them on boot).
3. **Webhook:** Developers → Webhooks → Add endpoint →
   `https://api.modernbazaar.com/api/v1/billing/webhook/stripe`, events:
   `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`,
   `invoice.paid`, `charge.refunded`. Copy that endpoint's **live** signing secret (`whsec_…`) → `STRIPE_WEBHOOK_SECRET`.
   ⚠️ The live webhook secret differs from the `stripe listen` / test secret — using a test secret
   with live keys makes every webhook 400 and entitlements never apply.
4. Set the return URLs to the real domain:
   ```
   STRIPE_SUCCESS_URL=https://modernbazaar.com/dashboard/profile?checkout=success
   STRIPE_CANCEL_URL=https://modernbazaar.com/dashboard/profile?checkout=cancelled
   STRIPE_PORTAL_RETURN_URL=https://modernbazaar.com/dashboard/profile
   ```
5. Enable **Stripe Tax / Managed Payments tax collection** and **Radar** in the dashboard.
6. Flip `BILLING_ENABLED=true` **and** the live `STRIPE_SECRET_KEY` **together** (half-configured is
   fail-closed — checkout 503s, webhook 500s — but don't ship it).

## 5b. Database safety (read before EVERY deploy)

**Flyway is re-enabled** (July 2026); schema changes ship as migrations in
`core/src/main/resources/db/migration` and run automatically at boot (V5
already covers the manipulation-metrics columns). Full rules, the backup
script, and the incident that motivated all this: `docs/DB_PRACTICES.md`.

The non-negotiables:
- Every schema change is a Flyway migration; new NOT NULL columns always get a
  DEFAULT (Hibernate ddl-auto silently skips them on populated tables).
- Nightly `infra/backup-db.sh` via cron on the prod host, plus one restore
  drill so the backup is proven.
- Postgres data lives in the named volume `dbdata`; rebuilds never touch it,
  but `docker compose down -v` DELETES it. Never pass `-v` against prod.

## 6. Go-live checklist

- [ ] Backend reachable at `https://api.…/actuator/health` → UP.
- [ ] Dashboard live on the real domain; `BACKEND_URL` points at the backend.
- [ ] Auth0 callback/logout/origins = real domain; Friendly Name + branding set.
- [ ] **MoR/VAT confirmed** with Stripe (the dealbreaker — don't charge EU customers otherwise).
- [ ] Live products/prices created; `plan.stripe_price_id` set to **live** ids.
- [ ] Live webhook endpoint registered; `STRIPE_WEBHOOK_SECRET` = its live secret.
- [ ] `BILLING_ENABLED=true` + live `STRIPE_SECRET_KEY` deployed together.
- [ ] Stripe Tax + Radar on.
- [ ] Smoke test with a real card you can refund: checkout → entitlement → cancel → resume.

---

## Environment matrix

### Backend — `infra/.env`
| Var | Example / prod value |
|---|---|
| `POSTGRES_DB` / `POSTGRES_USER` / `POSTGRES_PASSWORD` | strong, unique |
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://db:5432/bazaar` (or managed PG URL) |
| `AUTH_ISSUER_URI` | `https://<tenant>.us.auth0.com/` (or custom domain) |
| `AUTH_JWKS_URI` | `https://<tenant>.us.auth0.com/.well-known/jwks.json` |
| `AUTH_AUDIENCE` | `https://modern-bazaar.api` |
| `AUTH_MANAGEMENT_CLIENT_ID` / `_SECRET` | from the M2M app |
| `ADMIN_USER_SUBS` | your Auth0 `sub` (admin bootstrap) |
| `CORS_ALLOWED_ORIGINS` | `https://modernbazaar.com` |
| `AUTH_MOCK_ENABLED` | unset/false in prod |
| `BILLING_ENABLED` | `true` at go-live (with keys) |
| `STRIPE_SECRET_KEY` | `sk_live_…` |
| `STRIPE_WEBHOOK_SECRET` | live endpoint `whsec_…` |
| `STRIPE_PRICE_FLIPPER` / `_ELITE` | live `price_…` (optional; or via admin Plans) |
| `STRIPE_SUCCESS_URL` / `_CANCEL_URL` / `_PORTAL_RETURN_URL` | real domain URLs |
| `REFERRAL_REV_SHARE_PCT` | optional; creator rev-share % (default 30) |
| `REFERRAL_HOLD_DAYS` | refund hold before creator commission is payout-eligible (default 30) |
| `ELITE_MAX_ACTIVE_SUBSCRIBERS` | enforced active Elite capacity (default 100) |

### Dashboard — Vercel env
| Var | Value |
|---|---|
| `AUTH0_DOMAIN` | `<tenant>.us.auth0.com` (or custom domain) |
| `AUTH0_CLIENT_ID` / `AUTH0_CLIENT_SECRET` | Regular Web App credentials |
| `AUTH0_SECRET` | 32-byte hex (`openssl rand -hex 32`) |
| `APP_BASE_URL` | `https://modernbazaar.com` |
| `AUTH0_AUDIENCE` | `https://modern-bazaar.api` |
| `BACKEND_URL` | `https://api.modernbazaar.com` |
| `NODE_ENV` | `production` |

> No `NEXT_PUBLIC_*` payment vars — checkout is created server-side. Stripe is configured on the
> backend only.
