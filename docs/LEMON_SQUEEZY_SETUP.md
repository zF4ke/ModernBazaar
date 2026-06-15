# Lemon Squeezy setup — step by step

Everything you need to take payments. You're in **Test mode** (good — build and test
here first; it uses fake cards and has its own IDs/secrets separate from Live).

> Your store says *"application received and will be reviewed"* — that only gates
> **live payouts**. You can fully build and test in Test mode right now.

There are **two products** (Flipper, Elite). For each you need two identifiers later:
- a **checkout link** (the "Share" buy URL) → goes in the dashboard env
- a **numeric variant ID** (what the webhook sends) → goes on the plan in the admin UI

---

## 0. One decision first: currency

Your product form shows **€**. The app advertises **$9.99 / $25.99**. Pick one:
- **Match to USD:** Settings → Store → set store currency to USD, then enter 9.99 / 25.99.
- **Keep EUR:** tell me and I'll flip the landing prices to €9.99 / €25.99.

(They're roughly equivalent, but the number customers are charged should match the page.)

---

## 1. Product 1 — Flipper

**Products → New Product → Add Product.** Fill in:

| Field | Value |
|-------|-------|
| **Name** | `Modern Bazaar — Flipper` |
| **Description** | `Bazaar Flipping finder for Hypixel SkyBlock: buy/sell gaps ranked by profit per hour, with filters, presets and history.` |
| **Pricing** | **Subscription** ("Charge an ongoing fee") |
| **Pricing model** | Standard pricing |
| **Price per unit** | `9.99` |
| **Repeat payment every** | **1 → Month** ⚠️ (the form defaults to *Year* — change it to **Month**) |
| **Usage is metered?** | Off |
| **Setup fee?** | Off |
| **Free trial?** | Off (turn on later if you want a trial) |
| **Tax category** | **Software as a service (SaaS)** |
| **Media** | Optional (a logo/screenshot shows at checkout) |
| **Files** | **Leave empty** — access is granted by subscription, not a download |
| **Variants** | **Don't add any** — a single price auto-creates one variant (that's the one we map) |
| **Generate license keys** | **Off** — access is via the subscription webhook, not LS license keys |
| **Display product on storefront?** | Off is fine (you drive checkout from your own pricing page); On if you also want an LS storefront |
| **Confirmation modal → Button link** | `http://localhost:3001/dashboard` (later your real domain) |
| **Email receipt** | Leave defaults |

Click **Publish product**.

## 2. Product 2 — Elite

Repeat exactly, with:

| Field | Value |
|-------|-------|
| **Name** | `Modern Bazaar — Elite` |
| **Description** | `Everything in Flipper plus Bazaar Manipulation: thin-supply markets you can corner, with the full cost/break-even/sell-through plan.` |
| **Price per unit** | `25.99` |
| **Repeat payment every** | **1 → Month** |

Everything else identical to Flipper. **Publish.**

---

## 3. Grab the two identifiers per product

### a) Checkout link (for the dashboard env)
Open the product → **Share** (or the "..." menu) → copy the **buy URL**. It looks like:
```
https://YOURSTORE.lemonsqueezy.com/buy/abcdef12-3456-...
```
- Flipper's → `NEXT_PUBLIC_LS_CHECKOUT_FLIPPER`
- Elite's → `NEXT_PUBLIC_LS_CHECKOUT_ELITE`

### b) Numeric variant ID (for the plan mapping)
This is **not** the buy-URL UUID — it's a number the webhook sends as `variant_id`.
Most reliable way: **Settings → API → create an API key**, then run:
```bash
curl -s -H "Authorization: Bearer YOUR_LS_API_KEY" \
     -H "Accept: application/vnd.api+json" \
     https://api.lemonsqueezy.com/v1/variants
```
Each entry's `"id"` (a number like `123456`) next to its product name is the variant ID.
- Flipper's number → the Flipper plan
- Elite's number → the Elite plan

(You can also read it off a test webhook payload once one fires — see step 6.)

---

## 4. Webhook

**Settings → Webhooks → +**

| Field | Value |
|-------|-------|
| **Callback URL** | `https://<YOUR_PUBLIC_API_HOST>/api/v1/billing/webhook/lemonsqueezy` |
| **Signing secret** | Type any strong random string (or let LS generate). **Copy it.** |
| **Events** | `subscription_created`, `subscription_updated`, `subscription_cancelled`, `subscription_payment_success` |

⚠️ **The callback URL is the BACKEND (core / Spring API), not the dashboard.** Lemon
Squeezy POSTs server-to-server straight to core; the Next.js frontend is never involved in
receiving webhooks. `<YOUR_PUBLIC_API_HOST>` is whatever public host serves core on 8080 —
in prod its own subdomain (e.g. `api.yourdomain.com`), with your reverse proxy forwarding
`/api/v1/billing/webhook/lemonsqueezy` to core. The route is public in `SecurityConfig`
(signature-verified), so no auth sits in front of it.

⚠️ **`localhost` won't work** — LS can't reach your machine. To test locally, expose core
with a tunnel. No `cloudflared`/`ngrok` and no admin rights for choco/winget? Grab the
standalone binary — no install, no account:
```powershell
# Windows: download the single exe, then run a quick tunnel against core (8080)
$exe = "$env:LOCALAPPDATA\cloudflared\cloudflared.exe"
New-Item -ItemType Directory -Force (Split-Path $exe) | Out-Null
Invoke-WebRequest "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe" -OutFile $exe
& $exe tunnel --url http://localhost:8080
```
It prints `https://<random>.trycloudflare.com`; your callback = that + `/api/v1/billing/webhook/lemonsqueezy`.

⚠️ **Quick-tunnel URLs are EPHEMERAL** — they change every time `cloudflared` restarts, and
you must re-paste the new URL into the LS webhook. For a stable URL use a *named* Cloudflare
tunnel or your prod domain.

---

## 5. Wire it into the app

**Backend — `infra/.env`:**
```
BILLING_ENABLED=true
LEMONSQUEEZY_WEBHOOK_SECRET=<the signing secret from step 4>
```

⚠️ **Escape every `$` in the secret as `$$`.** `infra/.env` is a Docker Compose `env_file`,
and Compose runs **variable interpolation** on it — an unescaped `$word` is read as the
(empty) variable `word`, silently corrupting the secret so HMAC verification fails on every
real webhook. Example (fake secret): `ab$word12` must be written
`LEMONSQUEEZY_WEBHOOK_SECRET=ab$$word12`. (This also applies to any `$` in DB passwords,
etc.) Then restart core **with `--force-recreate`** so the new env is re-read:
```bash
docker compose -f infra/docker-compose.yml -p modernbazaar up -d --force-recreate --no-deps core
```
**Verify the delivered value matches byte-for-byte** (this is the #1 cause of "webhook 400 /
upgrade didn't apply"):
```bash
docker exec modernbazaar-core-1 printenv LEMONSQUEEZY_WEBHOOK_SECRET   # must equal the LS secret exactly
```

**Dashboard — `dashboard/.env.local`:**
```
NEXT_PUBLIC_LS_CHECKOUT_FLIPPER=<Flipper buy URL>
NEXT_PUBLIC_LS_CHECKOUT_ELITE=<Elite buy URL>
```
Restart the dev server (or redeploy).

**Plan → variant mapping (admin UI):** go to **/dashboard/admin/plans**, edit the
`flipper` and `elite` plans, and put each **numeric variant ID** in the
**"Lemon Squeezy Variant ID"** field. Leave the `free` plan's blank.

### 5b. Auth0 roles — so paying actually unlocks features (one-time)

The webhook sets the user's Auth0 **role** to match their plan, but the role only
grants features if it carries the right RBAC **permissions**. Set this up once:

1. Auth0 → **Applications → APIs → your API (`https://modern-bazaar.api`) → Settings**:
   enable **RBAC** and **Add Permissions in the Access Token**.
2. Same API → **Permissions** tab: add `use:bazaar-flipping`, `use:bazaar-manipulation`, `read:market_data`.
3. Auth0 → **User Management → Roles**, create:
   - **Free** — (no paid permissions)
   - **Flipper** — `use:bazaar-flipping`, `read:market_data`
   - **Elite** — `use:bazaar-flipping`, `use:bazaar-manipulation`, `read:market_data`
   (The role **names must be exactly** Free / Flipper / Elite — that's what the code looks up.)
4. The Management M2M app needs scopes `read:roles create:roles read:users update:users`
   (already requested by `Auth0ManagementService`).

After this, a paid `subscription_created` → the webhook assigns the Flipper/Elite role →
the next token carries the scope → the tool unlocks. Cancel/expiry → back to Free.

### 5c. Duplicate-subscription protection (set `LEMONSQUEEZY_API_KEY`)

LS hosted checkout **creates a new subscription every time** — it never extends or merges.
Two layers stop that from double-charging anyone:

- **UI guard:** the pricing/profile "Choose" buttons read the user's current plan and
  disable for the same-or-lower tier ("Current plan" / "Included in Elite"), so they can't
  start a second checkout for what they already have. Upgrading to a higher tier is allowed.
- **Webhook safety net:** if a `subscription_created` arrives while a *different* subscription
  is still active for that user, the backend cancels the old one on Lemon Squeezy so only the
  new plan bills. **This needs `LEMONSQUEEZY_API_KEY` in `infra/.env`** (the same key also
  powers the user-initiated cancel flow). Without it, the backend can't cancel and instead
  logs a loud `DOUBLE-BILLING RISK … cancel sub <id> manually` error — so set the key:
  ```
  LEMONSQUEEZY_API_KEY=<Settings → API key>
  ```

---

## 6. Test the flow (Test mode)

1. From your pricing page (signed in), click **Choose Flipper** → it opens the LS checkout.
2. Pay with the test card `4242 4242 4242 4242`, any future expiry, any CVC.
3. LS fires `subscription_created` → your webhook → the user's plan flips to `flipper`.
4. Verify: **/dashboard/admin/users** shows the user on `flipper`, and **Subscriptions**
   in Lemon Squeezy shows the active sub. The Bazaar Flipping tool unlocks for that account.

> The webhook attributes the purchase via `custom_data.user_id`, which the Upgrade
> button passes automatically (your Auth0 sub). If you ever see "missing user_id" in
> the core logs, the checkout was opened without being signed in.

### 6b. Verify the backend without paying (signed simulation)

To prove the webhook → plan-mapping → entitlement path works **before** wiring LS/the tunnel
(or to debug a 400), POST a correctly-signed payload to a *throwaway* user and check the DB,
then clean up. Run from a shell with `openssl` (Git Bash):
```bash
SECRET='<your LEMONSQUEEZY_WEBHOOK_SECRET>'           # the RAW secret, not the $$-escaped form
printf '%s' '{"meta":{"event_name":"subscription_created","custom_data":{"user_id":"test|verify"}},"data":{"id":"sub_test","attributes":{"variant_id":<ELITE_VARIANT_ID>,"customer_id":"c","status":"active","renews_at":"2027-01-01T00:00:00.000000Z"}}}' > pl.json
SIG=$(openssl dgst -sha256 -hmac "$SECRET" pl.json | awk '{print $NF}')
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:8080/api/v1/billing/webhook/lemonsqueezy -H "X-Signature: $SIG" --data-binary @pl.json   # expect 200
# confirm: psql -> select * from user_subscription where user_id='test|verify';  (plan_slug should be elite)
# cleanup: psql -> delete from user_subscription where user_id='test|verify';
```
A wrong/garbled secret returns **400** (`Invalid Lemon Squeezy webhook signature`) — that's
the signal the `$$`-escaping check above failed.

---

## 7. Going live (later)

- Toggle the store/dashboard to **Live mode** and recreate (or publish) the products there
  — **Live has its own variant IDs, checkout links, webhook, and signing secret.** Update
  the env + plan mappings with the Live values.
- Finish store approval + payout/identity verification so Lemon Squeezy can pay you out.
- Point the Live webhook at your production API domain over HTTPS.

See [COSTS.md](COSTS.md) for what Lemon Squeezy keeps per sale.
