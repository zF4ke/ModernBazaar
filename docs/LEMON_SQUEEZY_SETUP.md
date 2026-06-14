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

⚠️ **The callback URL must be public.** `localhost` won't work for LS. To test locally,
expose the backend with a tunnel, e.g.:
```bash
cloudflared tunnel --url http://localhost:8080
# or: ngrok http 8080
```
Use the tunnel's HTTPS URL + `/api/v1/billing/webhook/lemonsqueezy` as the callback.
In production, use your real API domain. The signing secret goes in `LEMONSQUEEZY_WEBHOOK_SECRET`.

---

## 5. Wire it into the app

**Backend — `infra/.env`:**
```
BILLING_ENABLED=true
LEMONSQUEEZY_WEBHOOK_SECRET=<the signing secret from step 4>
```
Then restart core:
```
docker compose -f infra/docker-compose.yml -p modernbazaar up -d core
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

---

## 7. Going live (later)

- Toggle the store/dashboard to **Live mode** and recreate (or publish) the products there
  — **Live has its own variant IDs, checkout links, webhook, and signing secret.** Update
  the env + plan mappings with the Live values.
- Finish store approval + payout/identity verification so Lemon Squeezy can pay you out.
- Point the Live webhook at your production API domain over HTTPS.

See [COSTS.md](COSTS.md) for what Lemon Squeezy keeps per sale.
