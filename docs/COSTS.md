# Running costs & unit economics

What it costs to run Modern Bazaar as it grows, and how Auth0 + Lemon Squeezy fees
eat into revenue. All third-party numbers were checked June 2026 — **pricing changes,
so re-verify on the vendors' pages before making decisions** (sources at the bottom).

> TL;DR
> - **Lemon Squeezy** takes roughly **7% + $0.50** per subscription charge for a
>   global (international-heavy) audience. The flat $0.50 hurts the $9.99 plan far
>   more than the $25.99 plan.
> - **Auth0** is **free up to ~25,000 monthly active users (MAU)** on the Free plan,
>   then gets **expensive fast** — this is the single biggest cost cliff as you scale,
>   and free users count toward MAU without paying you.
> - At small scale your real bill is **hosting (~$30–70/mo)**, not the SaaS fees.

---

## 1. Plans

| Slug | Price/mo | What it unlocks |
|------|----------|-----------------|
| `free` | $0 | Live prices, item catalog, favorites |
| `flipper` | $9.99 | Bazaar Flipping finder, filters/presets, deeper history |
| `elite` | $25.99 | Everything + Bazaar Manipulation, priority support |

Only Flipper and Elite are paid — that's why there are exactly two checkout URLs
(`NEXT_PUBLIC_LS_CHECKOUT_FLIPPER`, `NEXT_PUBLIC_LS_CHECKOUT_ELITE`).

---

## 2. Lemon Squeezy (payments + tax)

Lemon Squeezy is a **Merchant of Record**: it collects and remits VAT/sales tax
worldwide so you never register for tax anywhere. In exchange it takes a cut.

**Fee stack (2026):**

| Component | Fee |
|-----------|-----|
| Base | **5% + $0.50** per transaction |
| Subscription payment | +0.5% |
| International card | +1.5% |
| PayPal | +1.5% |
| Affiliate referral (if used) | +3% |
| Payout (international bank) | 1% per payout (US payouts free) |

Payouts run on the 14th and 28th, **$100 minimum**.

**Effective rate for this app.** Subscriptions (+0.5%) to a mostly-international
Hypixel audience (+1.5%) ≈ **7% + $0.50**. Use 5.5% + $0.50 as the optimistic (US/EU
card) end and ~8.5% + $0.50 if PayPal is common.

**Net per charge** (at 7% + $0.50):

| Plan | Price | LS fee | You keep | Effective fee |
|------|-------|--------|----------|---------------|
| Flipper | $9.99 | $1.20 | **$8.79** | 12.0% |
| Elite | $25.99 | $2.32 | **$23.67** | 8.9% |

> The fixed $0.50 is ~5% of the $9.99 plan but only ~2% of the $25.99 plan. Annual
> billing (one $0.50 instead of twelve) is the easiest way to claw that back — worth
> adding later as a discounted yearly option.

---

## 3. Auth0 (login)

Auth0 bills by **MAU — every user who logs in during the month, free or paying.**

| Plan | Included MAU | Base | Overage |
|------|--------------|------|---------|
| **Free** | ~25,000 | $0 | — (must upgrade above the cap) |
| B2C Essentials | 500 | $35/mo | +$0.07 / extra MAU |
| B2C Professional | 1,000 | from $240/mo | +overage |

(Some sources cite the older 7,500-MAU free tier — confirm what your tenant actually shows.)

**The cliff:** the Free plan covers you for a long time, but the moment you exceed
its MAU cap (or need a paid-only feature) you land on Essentials, where MAU is only
500 included + **$0.07/MAU**. That scales brutally:

| Total MAU | Essentials cost |
|-----------|-----------------|
| 25,000 | $35 + 24,500×$0.07 = **~$1,750/mo** |
| 50,000 | $35 + 49,500×$0.07 = **~$3,500/mo** |
| 100,000 | $35 + 99,500×$0.07 = **~$7,000/mo** |

Because **free users also count as MAU**, a big free base can ring up an Auth0 bill
before it earns much. If MAU growth outpaces revenue, the scaling move is to migrate
auth (e.g. self-hosted Keycloak/Ory, or a cheaper MAU-priced provider). Budget for
this conversation around the 25k-MAU mark.

---

## 4. Hosting & infra (the bill you actually pay first)

| Item | Early (~$/mo) | Notes |
|------|---------------|-------|
| Dashboard (Vercel) | $0–20 | Hobby is free but non-commercial; a paid product needs **Pro ~$20** |
| Backend + Postgres (VPS) | $10–40 | One small VPS (Hetzner/DO) runs Spring Boot + Postgres + Prometheus to start; split out managed Postgres (~$15–50) later |
| Domain | ~$1 | ~$12/yr |
| **Total** | **~$30–70/mo** | Dominates costs until you have hundreds of paying users |

---

## 5. Scenarios (monthly, plan mix 70% Flipper / 30% Elite → ARPU $14.79)

Net ARPU after LS (7% + $0.50) ≈ **$13.26/paying user**. Assumes paying users are
~15% of total MAU (typical freemium), so MAU ≈ paying × 6.7.

| Paying users | ≈ MAU | Gross/mo | LS fees | Auth0 | Hosting | **Net/mo** |
|--------------|-------|----------|---------|-------|---------|-----------|
| 100 | ~670 | $1,479 | −$154 | $0 (Free) | −$50 | **~$1,275** |
| 1,000 | ~6,700 | $14,790 | −$1,535 | $0 (Free) | −$70 | **~$13,185** |
| 10,000 | ~67,000 | $147,900 | −$15,350 | −$3,500→$7,000 | −$300 | **~$125k–129k** |

Takeaways:
- **Under ~3,700 paying users** (≈25k MAU) you pay Auth0 **nothing** — LS + hosting are your only costs, and margins are ~88–90%.
- At 10k paying users LS fees (~10%) are the big line; Auth0 becomes material only because MAU crosses the free cap.
- The math only works if free users convert. Watch the **free-to-paid conversion rate** and **MAU-per-payer** ratio — if free users balloon, Auth0 cost arrives before revenue.

---

## 6. Levers

- **Annual plans** — collect the $0.50 once a year instead of monthly; meaningfully lifts margin on the $9.99 tier.
- **Push Elite** — its effective fee (8.9%) beats Flipper's (12%); every upgrade improves blended margin.
- **Cap free-tier value** — keep the free plan a genuine taste, not a substitute, so MAU you pay Auth0 for actually convert.
- **Re-evaluate Auth0 near 25k MAU** — have a migration plan ready before the cliff.

---

## Sources (verify current pricing)

- [Lemon Squeezy 2026 fee breakdown (Swell)](https://www.swell.is/content/lemon-squeezy-pricing)
- [Lemon Squeezy review & fees 2026 (Dodo Payments)](https://dodopayments.com/blogs/lemonsqueezy-review)
- [Auth0 pricing 2026 (costbench)](https://costbench.com/software/identity-access-management/auth0/)
- [Auth0 pricing free→$240/mo (saasworthy)](https://www.saasworthy.com/blog/auth0-pricing-plans-guide)
- [Auth0 free-plan / paid-from-$35 (costbench)](https://costbench.com/software/identity-access-management/auth0/free-plan/)
