# Creator partnership plan

The channel: SkyBlock economy YouTubers/TikTokers. Their "how I made 100M
coins" audience IS our market. One good mid-size video outperforms months of
SEO. The full affiliate stack is live: `/r/CODE` links with click tracking,
the admin cockpit (admin -> Referrals) with per-creator clicks/CTR/signups/
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

Seed leads from research (verify size and activity before contacting):

| Creator | Why | Status |
|---|---|---|
| Kuvdra | Active SkyBlock economy channel, tutorials + flips, has a Patreon (monetization-minded) | not contacted |
| Xentyl | Cited for a 2026 bazaar flipping guide | not contacted |
| (add more) | Search: "bazaar flipping guide", "skyblock money making method", filter by upload date, 10k-200k subs | |

To find more: YouTube search "hypixel skyblock bazaar flipping" and "skyblock
money making 2026", sort by upload date; check who NotEnoughCoins/Coflnet
communities reference; browse r/HypixelSkyblock guide posts.

## How to contact (in order of response rate)

1. **Business email** from the channel's About page (YouTube shows it behind a
   captcha). Best for anything involving money.
2. **Their Discord server** (most SkyBlock creators run one): a short DM or
   their #business channel.
3. **Twitter/X DM** as a fallback nudge.

## Email template (first touch)

Subject: rev share for your bazaar videos (Modern Bazaar)

> Hi [name],
>
> I'm Pedro, a solo dev from Portugal. I built Modern Bazaar, a live bazaar
> analytics site for SkyBlock (flip scores, budget sizing, corner-the-market
> plays): [link]
>
> I watched your [specific video] and figured your viewers ask you constantly
> how to actually find flips. I'd like to offer you:
>
> - 30% recurring revenue share on anyone who subscribes through your link
>   (paid monthly, for as long as they stay subscribed)
> - free Elite access for you, forever
> - a custom code with your name
>
> No script, no obligations. Use it in a video if you honestly like it; if you
> don't, tell me why and I'll build what's missing.
>
> Want me to set up your code?
>
> Pedro

Follow-up (one only, 5-7 days later): "Bumping this once in case it got
buried. The offer stands, happy to demo it over a call or Discord."

## Mechanics — how the money flows

**The link.** Mint the code in admin -> Referrals BEFORE sending the email, so
the link is live in the first message: `https://<dashboard-host>/r/CODE`.
Visiting it records a click (drives the CTR column), drops a 60-day `mb_ref`
attribution cookie, and lands on the homepage. Legacy `?ref=CODE` links still
work (middleware sets the same cookie) but `/r/CODE` is the one to hand out —
it's the only form that counts clicks.

**Attribution.** The cookie rides into Stripe checkout as subscription
metadata; the billing webhook credits the code on the referred user's FIRST
successful payment. Idempotent: replayed webhooks can't double-count, a user
can't be claimed by two codes, self-referrals are ignored.

**The cockpit** (admin -> Referrals) shows, per creator: clicks, signups,
CTR, active subs (with plan mix), how many were seen in the last 7 days
("uses the site regularly" — last-seen updates when they load the dashboard),
estimated monthly revenue from their subs, the 30% owed, what's pending, and
what's been paid to date. Creators are sorted by owed, most valuable first.

**Payout cycle (monthly, NET-15).**
1. In the first days of each month, open the cockpit. The "Owed / mo" column
   is 30% of each creator's active referred MRR (config: `referral.rev-share-pct`
   and `referral.plan-monthly-cents.*` in application.yml).
2. Click **Pay** on a creator row — the form prefills the owed amount and last
   calendar month as the period. Recording it creates a *pending* ledger entry.
3. Pending payouts show a **due date = period end + 15 days** and turn red when
   overdue. $20 minimum: below that, skip recording and let it roll over
   (note the carry in the next month's entry).
4. Send the money via PayPal, then hit **Paid** on the entry (stamps the date).
   Put the PayPal txn id in the note field — the ledger IS the audit trail.

**Numbers are estimates.** Revenue/owed are computed from list prices of
currently-active referred subs, not from Stripe settlement (refunds, VAT and
annual proration aren't netted). For the sums involved this is fine; if a
creator ever disputes, reconcile against the Stripe dashboard.

- Track outreach in the table above (contacted date, channel, response).

## Rules

- Never pay for a promise; pay on tracked conversions only.
- Do not offer flat fees; recurring share aligns incentives and costs nothing
  up front.
- One follow-up maximum. This niche is small; being pushy travels.
