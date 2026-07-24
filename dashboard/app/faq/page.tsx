import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BrandMark } from '@/components/brand-mark'
import { SiteFooter } from '@/components/site-footer'

/**
 * The full FAQ / guide page: every common bazaar search phrased as its literal
 * query, answered honestly, linking into the tools. Server-rendered on
 * purpose — every word is in the HTML for crawlers, nothing hidden behind an
 * accordion. This page is the organic-search net for long-tail queries.
 */
export const metadata: Metadata = {
  title: 'Bazaar Flipping & Manipulation FAQ - Every Question, Answered',
  description:
    'The complete Hypixel SkyBlock bazaar FAQ: what bazaar flipping is, how to flip with any budget, the best flips right now, bazaar manipulation explained, bazaar tax, buy orders vs instant buy, and how the Modern Bazaar toolkit works.',
  keywords: [
    'bazaar flipping guide', 'how to bazaar flip', 'best bazaar flips', 'bazaar flipping tips',
    'bazaar manipulation', 'hypixel bazaar guide', 'skyblock bazaar tax', 'bazaar flipping money per hour',
    'skyblock money making', 'bazaar tracker', 'bazaar flip finder',
  ],
}

type QA = { id: string; q: string; a: React.ReactNode; plain: string }
type Section = { title: string; intro: string; items: QA[] }

const flipping = (label = 'Bazaar Flipping tool') => (
  <Link href="/dashboard/strategies/flipping" className="text-primary hover:underline">{label}</Link>
)
const manipulation = (label = 'Bazaar Manipulation engine') => (
  <Link href="/dashboard/strategies/manipulation" className="text-primary hover:underline">{label}</Link>
)
const items = (label = 'live item catalog') => (
  <Link href="/dashboard/bazaar-items" className="text-primary hover:underline">{label}</Link>
)
const pulse = (label = 'Market Pulse') => (
  <Link href="/pulse" className="text-primary hover:underline">{label}</Link>
)
const pricing = (label = 'plans') => (
  <Link href="/#pricing" className="text-primary hover:underline">{label}</Link>
)

const SECTIONS: Section[] = [
  {
    title: 'Bazaar flipping',
    intro: 'The most reliable money-making method in Hypixel SkyBlock, and the reason this site exists.',
    items: [
      {
        id: 'what-is-bazaar-flipping',
        q: 'What is bazaar flipping in Hypixel SkyBlock?',
        plain: 'Bazaar flipping is placing a buy order below market price and a sell offer above it on the Hypixel SkyBlock bazaar, then pocketing the spread when both fill. It works at any budget, needs no gear or skills, and compounds: profits roll into bigger orders. Modern Bazaar ranks the flips actually worth doing, live.',
        a: <>Bazaar flipping is placing a <strong>buy order</strong> below market price and a <strong>sell offer</strong> above it on the Hypixel SkyBlock bazaar, then pocketing the spread when both fill. It works at any budget, needs no gear or skills, and compounds: profits roll into bigger orders. The {flipping('Bazaar Flipping tool')} ranks the flips actually worth doing, live.</>,
      },
      {
        id: 'how-to-bazaar-flip',
        q: 'How do you bazaar flip, step by step?',
        plain: 'Pick a high-volume item with a healthy spread. Place a buy order 0.1 coins above the current top buy order. When it fills, list a sell offer 0.1 coins under the lowest sell offer. Profit is the spread minus the 1.25% bazaar tax. The skill is item selection and timing — which is exactly what a flip finder automates.',
        a: <>Pick a high-volume item with a healthy spread. Place a buy order 0.1 coins above the current top buy order. When it fills, list a sell offer 0.1 coins under the lowest sell offer. Profit is the spread minus the 1.25% bazaar tax. The skill is item selection and timing — exactly what the {flipping('flip finder')} automates: it scores every item by expected profit per hour and sizes orders to your budget.</>,
      },
      {
        id: 'best-bazaar-flips',
        q: 'What are the best bazaar flips right now?',
        plain: 'The best flips change hour to hour as prices, volumes and competition shift. Good flips balance four signals: wide spread, high hourly volume, few competing orders, and stable prices. Modern Bazaar re-ranks all 1,900+ bazaar items on those signals every minute — the Flipping page is the live answer to this question.',
        a: <>They change hour to hour as prices, volumes and competition shift. Good flips balance four signals: wide spread, high hourly volume, few competing orders, and stable prices. Modern Bazaar re-ranks all 1,900+ bazaar items on those signals every minute — the {flipping('Flipping page')} is the live answer to this question, and {pulse()} shows the widest spreads free, no account needed.</>,
      },
      {
        id: 'bazaar-flipping-profit',
        q: 'How much money can you make bazaar flipping?',
        plain: 'Realistically: single-digit millions per hour semi-AFK at mid budgets, more with a large bank and active management. Returns scale with budget, attention, and item selection. Anyone promising a fixed number is guessing — volume caps and competition are real. The dashboard shows expected profit per hour for each flip so you decide with numbers, not vibes.',
        a: <>Realistically: single-digit millions per hour semi-AFK at mid budgets, more with a large bank and active management. Returns scale with budget, attention, and item selection. Anyone promising a fixed number is guessing — volume caps and competition are real. The {flipping('dashboard')} shows expected profit per hour for each flip so you decide with numbers, not vibes.</>,
      },
      {
        id: 'bazaar-flipping-budget',
        q: 'How many coins do you need to start bazaar flipping?',
        plain: 'Any amount. With 100k coins you flip cheap high-volume items like enchanted materials; with 10m you spread across several mid-tier flips; with 100m+ you need items with deep order books so your own orders do not move the price. Modern Bazaar sizes every suggestion to the budget you set.',
        a: <>Any amount. With 100k coins you flip cheap high-volume items; with 10m you spread across several mid-tier flips; with 100m+ you need items with deep order books so your own orders don&apos;t move the price. Modern Bazaar sizes every suggestion to the budget you set — that&apos;s the &quot;sized to your coins&quot; part.</>,
      },
      {
        id: 'buy-order-not-filling',
        q: 'Why is my buy order not filling?',
        plain: 'Either the item trades too slowly (check its hourly volume before ordering), you were outbid and sit lower in the queue, or the price moved away from your order. Flip finders weigh fill time for exactly this reason: a huge spread on a dead item is a trap, not a flip.',
        a: <>Either the item trades too slowly (check hourly volume before ordering), you were outbid and sit lower in the queue, or the price moved away. The {flipping('flip finder')} weighs fill time for exactly this reason: a huge spread on a dead item is a trap, not a flip.</>,
      },
      {
        id: 'flipping-vs-ah',
        q: 'Bazaar flipping vs auction house flipping - which is better?',
        plain: 'Bazaar flipping is steadier: standardized items, deep liquidity, order books, works semi-AFK. AH flipping has bigger single hits but needs item knowledge, sniping speed, and carries pricing risk on unique items. Most traders build their bank in the bazaar first. Auction tools are on the roadmap; the bazaar is the focus today.',
        a: <>Bazaar flipping is steadier: standardized items, deep liquidity, order books, works semi-AFK. AH flipping has bigger single hits but needs item knowledge, sniping speed, and carries pricing risk on unique items. Most traders build their bank in the bazaar first. Auction tools are on the roadmap; the bazaar is the focus today.</>,
      },
      {
        id: 'is-bazaar-flipping-allowed',
        q: 'Is bazaar flipping allowed on Hypixel?',
        plain: 'Yes. Trading with buy orders and sell offers is a core, intended part of the SkyBlock bazaar. What is not allowed is automation - macros or bots placing orders for you. Modern Bazaar never touches the game: it reads the official public API and you place every order yourself, in-game.',
        a: <>Yes. Trading with buy orders and sell offers is a core, intended part of the SkyBlock bazaar. What&apos;s not allowed is automation — macros or bots placing orders for you. Modern Bazaar never touches the game: it reads the official public API and you place every order yourself, in-game.</>,
      },
    ],
  },
  {
    title: 'Bazaar manipulation',
    intro: 'The advanced game: thin markets, deliberate positioning, higher risk and higher skill.',
    items: [
      {
        id: 'what-is-bazaar-manipulation',
        q: 'What is bazaar manipulation?',
        plain: 'Bazaar manipulation is trading thin, low-volume markets where a single trader\'s orders can move the price: buying out cheap sell offers and re-listing higher. It is the highest-skill bazaar strategy. The Modern Bazaar Manipulation engine scores each thin market by cost to corner, order-book depth and exit risk.',
        a: <>Trading thin, low-volume markets where a single trader&apos;s orders can move the price: buying out cheap sell offers and re-listing them higher. It&apos;s the highest-skill bazaar strategy. The {manipulation()} scores each thin market by cost to corner, order-book depth and exit risk — the math you&apos;d otherwise do by hand.</>,
      },
      {
        id: 'how-much-for-manipulation',
        q: 'How many coins do you need for bazaar manipulation?',
        plain: 'Enough to buy out a market\'s sell side and hold it: tens of millions for small items, billions for contested ones. The key number is cost-to-corner, which the Manipulation engine computes per item, alongside how hard it will be to exit the position.',
        a: <>Enough to buy out a market&apos;s sell side and hold it: tens of millions for small items, billions for contested ones. The key number is <strong>cost to corner</strong>, which the {manipulation('engine')} computes per item — alongside the harder question of how you exit the position.</>,
      },
      {
        id: 'is-manipulation-risky',
        q: 'Is bazaar manipulation risky?',
        plain: 'Yes - meaningfully riskier than flipping. You can get stuck holding inventory nobody buys, other players can undercut your corner, and prices can collapse back. That is why exit risk is a first-class score in the tool. Start with flipping; graduate to manipulation when you can afford to be wrong.',
        a: <>Yes — meaningfully riskier than flipping. You can get stuck holding inventory nobody buys, other players can undercut your corner, and prices can collapse back. That&apos;s why exit risk is a first-class score in the {manipulation('tool')}. Start with {flipping('flipping')}; graduate to manipulation when you can afford to be wrong.</>,
      },
      {
        id: 'manipulation-tool',
        q: 'Is there a tool that finds bazaar manipulation opportunities?',
        plain: 'Yes - Modern Bazaar\'s Manipulation engine is exactly that: it scans all bazaar items for thin markets, scores cost to corner, depth and exit risk, and keeps the list deliberately small. It is part of the Elite plan, with a free blurred preview showing the real interface.',
        a: <>Yes — the {manipulation()} is exactly that: it scans all bazaar items for thin markets, scores cost to corner, depth and exit risk, and keeps the list deliberately small. It&apos;s part of the Elite {pricing('plan')}, with a free preview showing the real interface.</>,
      },
    ],
  },
  {
    title: 'The bazaar itself',
    intro: 'The mechanics everyone searches for sooner or later.',
    items: [
      {
        id: 'what-is-the-bazaar',
        q: 'What is the bazaar in Hypixel SkyBlock?',
        plain: 'The bazaar is SkyBlock\'s commodity exchange: an in-game market where standardized items (farming crops, mob drops, enchanted materials, essences) trade through instant transactions or player-placed buy orders and sell offers. Around 1,900 items are listed, each with its own live order book.',
        a: <>SkyBlock&apos;s commodity exchange: an in-game market where standardized items — crops, mob drops, enchanted materials, essences — trade through instant transactions or player-placed orders. Around 1,900 items are listed, each with its own live order book. Browse them all in the {items()}.</>,
      },
      {
        id: 'bazaar-tax',
        q: 'What is the bazaar tax?',
        plain: 'Hypixel charges 1.25% tax on bazaar sell transactions (1.1% with the community shop upgrade). Every profit number in Modern Bazaar is shown after tax, because a flip that looks profitable before tax and is not after is the classic beginner trap.',
        a: <>Hypixel charges 1.25% on bazaar sells (1.1% with the community shop upgrade). Every profit number in Modern Bazaar is shown <em>after</em> tax — a flip that looks profitable before tax and isn&apos;t after is the classic beginner trap.</>,
      },
      {
        id: 'instant-vs-order',
        q: 'Instant buy vs buy order - what is the difference?',
        plain: 'Instant buy pays the lowest current sell offer and fills immediately; a buy order names your own lower price and waits for a seller. The gap between the two prices is the spread - the entire source of flipping profit. Flippers always use orders; instant transactions pay the spread instead of earning it.',
        a: <>Instant buy pays the lowest current sell offer and fills immediately; a buy order names your own lower price and waits. The gap between them is the <strong>spread</strong> — the entire source of flipping profit. Flippers always use orders; instant transactions <em>pay</em> the spread instead of earning it.</>,
      },
      {
        id: 'moving-week',
        q: 'What does "moving week" mean on bazaar items?',
        plain: 'Insta-buy/insta-sell "moving week" is the total units traded in the last 7 days - the liquidity signal. High moving week means orders fill fast; low moving week means wide spreads that are hard to actually capture. It is one of the four signals in Modern Bazaar\'s flip score.',
        a: <>The total units traded in the last 7 days — the liquidity signal. High moving week means orders fill fast; low moving week means wide spreads that are hard to actually capture. It&apos;s one of the four signals in the {flipping('flip score')}.</>,
      },
      {
        id: 'bazaar-price-history',
        q: 'Where can I see bazaar price history for an item?',
        plain: 'Every item page on Modern Bazaar has live price, spread and order-book history charts - free, no account needed. Nearly 1,900 item pages are indexed, one for every bazaar product.',
        a: <>Every item page here has live price, spread and order-book history charts — free, no account needed. Nearly 1,900 item pages exist, one per bazaar product: start from the {items('item catalog')} or {pulse()}.</>,
      },
    ],
  },
  {
    title: 'Modern Bazaar (the toolkit)',
    intro: 'What this site is, what it costs, and why it exists.',
    items: [
      {
        id: 'what-is-modern-bazaar',
        q: 'What is Modern Bazaar?',
        plain: 'Modern Bazaar is the best bazaar flipping and manipulation toolkit for Hypixel SkyBlock: a live tracker for 1,900+ items, a flip finder that ranks opportunities by profit per hour sized to your budget, and a thin-market manipulation engine. Built by one dev who got tired of eyeballing prices.',
        a: <>The best bazaar flipping and manipulation toolkit for Hypixel SkyBlock: a live tracker for 1,900+ items, a {flipping('flip finder')} that ranks opportunities by profit per hour sized to your budget, and a thin-market {manipulation('manipulation engine')}. Built by one dev who got tired of eyeballing prices.</>,
      },
      {
        id: 'is-it-free',
        q: 'Is Modern Bazaar free?',
        plain: 'The tracker is free: live prices, charts and the full item catalog need no account. The decision layer - the ranked flip finder and the manipulation engine - is paid, from $5.99/month, because that is the part that does the judgment for you. Previews of both are free.',
        a: <>The tracker is free: live prices, charts and the full item catalog need no account. The decision layer — the ranked {flipping('flip finder')} and the {manipulation('manipulation engine')} — is paid, from $5.99/month ({pricing('see plans')}), because that&apos;s the part that does the judgment for you. Previews of both are free.</>,
      },
      {
        id: 'data-source',
        q: 'Where does the data come from and how fresh is it?',
        plain: 'From Hypixel\'s official, public Bazaar API, pulled about once a minute - prices are usually within a minute or two of live. Modern Bazaar is read-only toward the game: no mods, no macros, no automation.',
        a: <>From Hypixel&apos;s official, public Bazaar API, pulled about once a minute — prices are usually within a minute or two of live. Modern Bazaar never touches the game itself: no mods, no macros, no automation.</>,
      },
      {
        id: 'vs-other-trackers',
        q: 'How is this different from other bazaar trackers?',
        plain: 'Most trackers show you data; Modern Bazaar tells you the play. Instead of a wall of prices, flips are scored on spread, volume, competition and stability, ranked by expected profit per hour after tax, and sized to your actual budget. Plus the only dedicated bazaar manipulation engine.',
        a: <>Most trackers show you data; this one tells you the play. Instead of a wall of prices, flips are scored on spread, volume, competition and stability, ranked by expected profit per hour after tax, and sized to your actual budget. Plus the only dedicated {manipulation('bazaar manipulation engine')}.</>,
      },
      {
        id: 'will-it-make-money',
        q: 'Will it actually make me money?',
        plain: 'Maybe, but it is not magic. It surfaces good setups and does the math; the market still does what it wants. Think of it as a head start, not a guarantee.',
        a: <>Maybe, but it&apos;s not magic. It surfaces good setups and does the math; the market still does what it wants. Think of it as a head start, not a guarantee.</>,
      },
    ],
  },
]

export default function FaqPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <nav className="sticky top-0 z-50 border-b border-border bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/50">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <BrandMark className="h-8 w-8 rounded-lg" />
            <span className="text-[17px] font-semibold tracking-tight">Modern Bazaar</span>
          </Link>
          <div className="flex items-center gap-1.5 sm:gap-3">
            <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
              <Link href="/pulse">Market pulse</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/dashboard">Get started</Link>
            </Button>
          </div>
        </div>
      </nav>

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-14">
        <header className="mb-14 space-y-3">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Bazaar flipping &amp; manipulation, every question answered
          </h1>
          <p className="max-w-2xl text-muted-foreground leading-relaxed">
            The complete FAQ for the Hypixel SkyBlock bazaar: flipping, manipulation,
            tax, order mechanics, and how the Modern Bazaar toolkit works. Written by
            the person who built it — honest answers, no fluff.
          </p>
        </header>

        <div className="space-y-14">
          {SECTIONS.map((s) => (
            <section key={s.title}>
              <div className="mb-6 space-y-1">
                <h2 className="text-xl font-bold tracking-tight md:text-2xl">{s.title}</h2>
                <p className="text-sm text-muted-foreground">{s.intro}</p>
              </div>
              <div className="divide-y divide-border/60 rounded-xl border bg-card px-6">
                {s.items.map((f) => (
                  <article key={f.id} id={f.id} className="py-5 scroll-mt-24">
                    <h3 className="font-semibold leading-snug">{f.q}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-16 flex flex-col items-start gap-5 rounded-xl border bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h2 className="font-semibold tracking-tight">Ready to stop guessing?</h2>
            <p className="text-sm text-muted-foreground">
              Free live prices for 1,900+ items. The flip finder does the rest.
            </p>
          </div>
          <Button asChild className="shrink-0">
            <Link href="/dashboard">
              Launch dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </main>

      {/* FAQPage structured data: full plain-text Q&A set for rich results. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: SECTIONS.flatMap((s) =>
              s.items.map((f) => ({
                '@type': 'Question',
                name: f.q,
                acceptedAnswer: { '@type': 'Answer', text: f.plain },
              }))
            ),
          }),
        }}
      />

      <SiteFooter />
    </div>
  )
}
