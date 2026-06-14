# Growth & marketing plan

How to get users and turn creators into a sales channel — using the systems already
built (discount codes, referrals) plus Lemon Squeezy's affiliate tooling.

## 1. Three growth levers, and which tool runs each

| Lever | Who | Mechanism we have | Reward |
|-------|-----|-------------------|--------|
| **Creator affiliates** | YouTubers / streamers | **Lemon Squeezy Affiliates** (built into LS) | recurring % commission, auto-paid by LS |
| **Per-creator promo codes** | any partner | **Discount codes** (`/dashboard/admin/discounts`) | their audience gets X% off; you track redemptions per code |
| **User referrals** | existing users | **Referral codes** (`/dashboard/admin/referrals`) | free month / credit on a referred paid signup |

> Lemon Squeezy adds **+3%** on affiliate-referred sales (see [COSTS.md](COSTS.md)) — bake that into the commission you offer.

## 2. Content-creator program (the main channel for a Hypixel SkyBlock tool)

Your audience lives on YouTube/Twitch/TikTok SkyBlock content. Turn the mid-size
creators into a sales force.

**The offer (pick a lane):**
- **Affiliate %** — 30% of the first month, or **20–25% recurring** for as long as their
  referred user stays subscribed. Recurring is far more attractive to creators and
  aligns incentives (they promote a tool that retains). Run it through **LS Affiliates**
  so payouts are automatic and you never touch the money.
- **Plus a unique discount code** per creator (e.g. `ALEX10` = 10% off) so their viewers
  get a deal and you can see exactly which creator converts (redemptions are tracked).
- **Free Elite** for the creator so they can actually show the tool on stream.

**Who to approach:** SkyBlock creators with 5k–200k subs (mega-channels ignore small
tools; mid-tier convert best and reply to DMs). Prioritize ones who already make
"bazaar flipping / money-making method" videos.

**Outreach template (short, specific, no fluff):**
> Hey [name] — I built Modern Bazaar, a tool that finds Hypixel Bazaar flips ranked by
> profit/hour and runs a full market-manipulation plan. I'd love to set you up with free
> Elite + a 20% recurring affiliate cut and a custom discount code for your viewers. Want
> a link to try it?

**Make it easy to say yes:** give them the affiliate link, the discount code, a 30-second
clip, and 2–3 screenshots. The less work for them, the more likely they post.

## 3. User referral loop

The referral system is built (conversion counted on first paid signup, idempotent, refund-
reversal pending — see [MONEY_LOSS_AUDIT.md](MONEY_LOSS_AUDIT.md) §B). Surface it in-app:
- Add a "Refer a friend" card on the profile/dashboard with the user's code + share link.
- Reward: **1 free month** when a referred user's first payment clears (not at signup, to
  avoid farming). Cap rewards per user and reverse on refund.

## 4. Making the website convert better (appeal)

- **Sell the *formula*, not features.** Lead Flipping with "every flip scored by our own
  profit-per-hour formula — spread, real volume, competition and volatility in one number."
  Lead Manipulation as the rare, hard play: "the move almost nobody runs — quietly corner
  thin markets with the exact ladder, break-even and exit."
- **Show, don't tell.** A short looping screen-capture of the finder ranking live flips beats
  any bullet list. Put it in the hero.
- **Proof.** Once you have users: "tracking N items, updated every minute," a couple of real
  example flips with numbers, and creator logos/quotes once partners are on board.
- **One clear CTA** above the fold ("Find your next flip — free"), pricing one scroll away.
- **Free tier as the hook.** Let people feel the live data immediately; gate the *scored
  finder* behind Flipper so the upgrade reason is obvious.
- **Color with intent** (see the UI pass): emerald = Flipping (money), a bolder accent for
  Manipulation (premium/secretive). Cohesive, not rainbow.

## 5. Cheap acquisition channels
- Post genuinely useful flips in SkyBlock Discords / r/HypixelSkyblock (value first, link in profile).
- A free "Bazaar flip of the week" thread or short — recurring, shareable, shows the tool working.
- SEO page per popular item ("is X worth flipping") fed by your live data.

## Sequencing
1. Turn on **LS Affiliates**, set the recurring %, write the creator one-pager.
2. Cut **5–10 creator discount codes**, DM mid-tier SkyBlock creators with the template.
3. Add the in-app **referral card**.
4. Ship the **hero demo clip** + sharper copy.
