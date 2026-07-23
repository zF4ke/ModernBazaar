# Growth plan

The philosophy: **stop polishing the store, build roads to it.** Product
quality is no longer the bottleneck; distribution, trust and price-fit are.
Portable principles live in `Repertoire/growth/GROWTH_PRINCIPLES.md`; this file
is the Modern Bazaar execution state.

## Funnel (decided July 2026)

- **Public** (no account): landing, Market Pulse (`/pulse`), bazaar item list +
  item pages, skyblock catalog, legal pages.
- **Free account**: favorites, presets, saved settings, dashboard home.
- **Paid**: Flipping (Flipper) and Manipulation (Elite) with teaser paywalls
  (real UI, example data, blurred, CTA on top).

## Pricing (decided July 2026)

- Flipper **$5.99/mo** (lowered from $9.99; anchor shows Save 40%).
- Elite **$25.99/mo**, honest "Limited slots" scarcity (edge dies if
  oversubscribed).
- **Annual = 2 months free**: Flipper $59.90/yr, Elite $259.90/yr.
- Rejected: regional pricing, founder/lifetime deals.

## Shipped (code)

- Public market data (GET) + ungated market pages; strategy teaser paywalls.
- Per-item server metadata (`bazaar-items/[productId]/layout.tsx`),
  `sitemap.ts` (~1,900 item URLs), `robots.ts`.
- OpenGraph/Twitter cards + `public/og.png` (rich Discord embeds).
- Market Pulse (`/pulse`): widest spreads, most traded, busiest books; linked
  from the landing nav; public + indexable.
- Monthly/annual billing toggle wired end to end (checkout interval, webhook
  annual price mapping).
- Vercel Web Analytics via the script tag (activates automatically on Vercel; no package dependency).

## Owner tasks before the next deploy

1. **Stripe LIVE prices: DONE** (July 2026). Live ids are the config defaults
   in application.yml: Flipper $5.99 `price_1TwGnICf0etY1rSc0qfHeF8r`, Flipper
   annual $59.90 `price_1TwGvrCf0etY1rScrRHTVmMJ`, Elite $25.99
   `price_1TwGnGCf0etY1rScpU7GE1qG`, Elite annual $259.90
   `price_1TwGnGCf0etY1rSc9Vd02xKF`. Dev overrides with test ids via
   infra/.env. Optional cleanup: archive the old $9.99 live price in the
   Stripe dashboard so it can't be picked by accident.
2. **Creator outreach** (full affiliate stack is live, July 2026): `/r/CODE`
   links with deduplicated visitor tracking, admin cockpit (conversion/signups/plan mix/
   7-day usage/collected revenue/eligible commission) and a constrained payout ledger —
   see docs/CREATORS.md "Mechanics" for the monthly payout cycle. Owner task:
   shortlist 3-5 SkyBlock YouTubers/TikTokers and send the pitch email.
3. Set `APP_BASE_URL` in prod so sitemap/OG URLs are absolute.
4. After deploy: submit `sitemap.xml` in Google Search Console; paste the site
   link in Discord to verify the embed card.

## Backlog (next rounds)

- **Track-record page**: nightly job snapshots yesterday's top-N flip
  suggestions, then evaluates realized spread/fill over the next 24h; public
  page + weekly digest. Strongest trust asset; needs a backend aggregation.
- **Error tracking (Sentry)**: needs an account/DSN from the owner.
- Weekly "Bazaar market report" content generated from pulse data.
- Rejected permanently (maintenance cost): Discord bot, community Discord.
