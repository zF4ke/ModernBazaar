# Creator partnership plan

The channel: SkyBlock economy YouTubers/TikTokers. Their "how I made 100M
coins" audience IS our market. One good mid-size video outperforms months of
SEO. The full affiliate stack is live: `/r/CODE` links with click tracking,
the admin cockpit (admin -> Referrals) with per-creator visitors/conversion/signups/
plan-mix/usage/revenue/owed, and a payout ledger with due dates.

## The offer (keep it this simple)

1. **30% recurring revenue share** on every subscriber who signs up through
   their code, for as long as that subscriber stays. Paid monthly via PayPal,
   $20 minimum payout (rolls over).
2. **Free Elite** for the creator, forever. Their footage of the tool IS the ad.
3. **A vanity code** (their name, e.g. `KUVDRA`) minted in admin -> Referrals.
4. No exclusivity, no scripts, no obligations. If they say the tool honestly
   helped a video, that is worth more than any sponsored read.

Why 30%: on Flipper ($5.99) that is ~$1.80/sub/month, recurring. A creator who
sends 50 subscribers earns ~$90/month for one video. Frame it exactly like
that in the pitch: recurring, not a one-off bounty.

## Who to target

Sweet spot: **10k-200k subscribers, economy/money-making niche, uploaded in
the last 30 days**. Skip mega-channels (ignore DMs, want flat fees) and dead
channels. Signals of a good fit: consistent "money making method" uploads,
a Patreon/membership (they already monetize economy knowledge, so they get
rev-share instantly), engaged comments asking "what mod/site is that".

Keep named prospects, contact details, negotiation notes, and outreach status in
`docs/private/` or a private operations repository. That directory is intentionally
ignored; this public document contains only the reusable program policy.

To find more: YouTube search "hypixel skyblock bazaar flipping" and "skyblock
money making 2026", sort by upload date; check who NotEnoughCoins/Coflnet
communities reference; browse r/HypixelSkyblock guide posts.

## How to contact (in order of response rate)

1. **Business email** from the channel's About page (YouTube shows it behind a
   captcha). Best for anything involving money.
2. **Their Discord server** (most SkyBlock creators run one): a short DM or
   their #business channel.
3. **Twitter/X DM** as a fallback nudge.

Personalize each message around a specific recent video. State the recurring
percentage, payout hold and threshold, free creator access, disclosure requirement,
and that there is no exclusivity. Keep actual messages in private operations notes.

## Mechanics — how the money flows

**The link.** Mint the code in admin -> Referrals BEFORE sending the email, so
the link is live in the first message: `https://<dashboard-host>/r/CODE`.
Visiting it records one visit per visitor (drives conversion rate), drops a 60-day `mb_ref`
attribution cookie, and lands on the homepage. Legacy `?ref=CODE` links still
work (middleware sets the same cookie) but `/r/CODE` is the one to hand out —
it's the only form that counts clicks.

**Attribution.** The cookie rides into Stripe checkout as subscription
metadata; the billing webhook credits the code on the referred user's FIRST
successful payment. Idempotent: replayed webhooks can't double-count, a user
can't be claimed by two codes, self-referrals are ignored.

**The cockpit** (admin -> Referrals) shows, per creator: clicks, signups,
conversion rate, active subs (with plan mix), how many were seen in the last 7 days
("uses the site regularly" — last-seen updates when they load the dashboard),
collected referred revenue, eligible unpaid commission, what's pending, and
what's been paid to date. Creators are sorted by owed, most valuable first.

**Payout cycle (monthly, after a 30-day refund hold).**
1. In the first days of each month, open the cockpit. "Eligible unpaid" is
   commission from signed `invoice.paid` events whose 30-day refund hold has passed.
2. Click **Pay** on a creator row — the form prefills the owed amount and last
   calendar month as the period. Recording it creates a *pending* ledger entry.
3. Pending payouts are due within seven days after being recorded and turn red
   when overdue. $20 minimum: below that, skip recording and let it roll over
   (note the carry in the next month's entry).
4. Send the money via PayPal, then hit **Paid** on the entry (stamps the date).
   Put the PayPal txn id in the note field — the ledger IS the audit trail.

**Revenue basis.** Commission is calculated from Stripe invoice subtotal excluding
tax. Full and partial refunds reduce the corresponding earning. Stripe processing
fees are currently absorbed by Modern Bazaar rather than deducted from creators.
Reconcile payouts against Stripe before sending money.

- Track outreach in the table above (contacted date, channel, response).

## Rules

- Never pay for a promise; pay on tracked conversions only.
- Do not offer flat fees; recurring share aligns incentives and costs nothing
  up front.
- One follow-up maximum. This niche is small; being pushy travels.
