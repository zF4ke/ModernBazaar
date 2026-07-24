"use client"

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from "@/components/ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { TrendingUp, ArrowRight, Zap, Check, Plus, Shield, Clock, SlidersHorizontal, Shuffle, Hammer, Coins, Crosshair, DollarSign, ArrowRightLeft, Trophy } from "lucide-react"
import { BrandMark } from "@/components/brand-mark"
import { SiteFooter } from "@/components/site-footer"
import { Segmented } from "@/components/ui/segmented"
import { UpgradeButton, useUpgrade, type BillingInterval } from "@/components/upgrade-button"

const LIVE_STRATEGIES = [
  {
    title: "Bazaar Flipping", icon: Shuffle, tone: "accent" as const,
    blurb: "A handcrafted formula, tested over thousands of flips, that ranks every item by profit per hour.",
    points: [
      "Spread, real volume, competition and price swings in one score",
      "Tells you how much to buy for your budget",
      "Risk flags and fill-time estimates so you don't get stuck",
    ],
    href: "/dashboard/strategies/flipping",
  },
  {
    title: "Bazaar Manipulation", icon: Crosshair, tone: "elite" as const,
    blurb: "This is where the absurd money is. Take control of a thin market's supply, set your own price, and follow the exact playbook to pull it off.",
    points: [
      "Find the thin markets you can fully control on your budget",
      "Cost to corner, how high you can push, and your profit",
      "Know exactly when to cash out",
    ],
    note: "The SkyBlock community's name for a long-standing supply-and-demand strategy. Read-only analysis of the public market; you make every move yourself, in-game, with virtual coins.",
    href: "/dashboard/strategies/manipulation",
  },
]

const SOON_STRATEGIES = [
  { title: "Craft Flipping", icon: Hammer, blurb: "Compare craft cost to sell price" },
  { title: "NPC Flipping", icon: Coins, blurb: "Best items for the daily NPC limit" },
  { title: "Budget Planner", icon: DollarSign, blurb: "Split your coins across strategies" },
  { title: "Auction House", icon: ArrowRightLeft, blurb: "Snipe underpriced listings" },
]

/**
 * FAQ copy, phrased as the searches people actually type. Rendered in the
 * accordion AND emitted as FAQPage JSON-LD (closed accordion items unmount
 * from the DOM, so the schema is what search engines reliably read).
 */
const FAQ = [
  {
    id: "what-is-bazaar-flipping",
    q: "What is bazaar flipping in Hypixel SkyBlock?",
    a: "Bazaar flipping is placing a buy order below market price and a sell offer above it on the Hypixel SkyBlock bazaar, and pocketing the spread when both fill. It's one of the most reliable money-making methods in SkyBlock because it works at any budget and doesn't need gear. Modern Bazaar watches every item's spread, volume and competition live and ranks the flips actually worth doing.",
  },
  {
    id: "how-to-bazaar-flip",
    q: "How do you bazaar flip? (the short version)",
    a: "Pick a high-volume item with a healthy spread, place a buy order 0.1 coins above the top buy order, wait for it to fill, then sell-offer 0.1 coins under the lowest sell offer. Profit = spread minus the 1.25% bazaar tax. The hard part is picking the right item at the right moment — that's what the flip finder does: open the dashboard, set your budget, and start from the top of the list.",
  },
  {
    id: "best-bazaar-flips",
    q: "What are the best bazaar flips right now?",
    a: "It changes by the hour — that's the point. The best flips balance spread, hourly traded volume, competition and price stability, and Modern Bazaar re-ranks all 1,900+ bazaar items on exactly those signals every minute, sized to your coins. The Flipping page shows the live list; the free preview shows you how it looks.",
  },
  {
    id: "what-is-bazaar-manipulation",
    q: "What is bazaar manipulation?",
    a: "Bazaar manipulation is trading thin, low-volume markets where a single trader's orders can move the price — buying out cheap sell offers and re-listing higher. It's higher risk and higher skill than flipping: you need order-book depth, cost-to-corner and exit-risk math, which is what the Bazaar Manipulation engine scores. You place every order yourself, in-game, like any other trade.",
  },
  {
    id: "profit",
    q: "Will it make me money?",
    a: "Maybe, but it's not magic. It surfaces good setups and does the math; the market still does what it wants. Think of it as a head start, not a guarantee.",
  },
  {
    id: "how-it-ranks",
    q: "How does the flip finder pick flips?",
    a: "It looks at the spread, how much actually trades each hour, how crowded the item is, and how jumpy the price has been, then ranks by expected profit per hour after tax. You can sort by raw profit instead if you'd rather.",
  },
  {
    id: "data-refresh",
    q: "How fresh is the price data?",
    a: "It pulls from Hypixel's official public Bazaar API about once a minute, so prices are usually within a minute or two of live.",
  },
  {
    id: "is-it-allowed",
    q: "Is this allowed on Hypixel?",
    a: "Modern Bazaar only reads Hypixel's official public API and does not automate, bot or modify the game in any way — you make every trade yourself, in-game. Trading the bazaar with buy and sell orders is a normal part of SkyBlock.",
  },
  {
    id: "roadmap",
    q: "What's coming next?",
    a: "Craft and NPC flipping, a budget planner, and auction-house tools. What I build next mostly comes down to what people ask for.",
  },
]

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)
  const [billing, setBilling] = useState<BillingInterval>("monthly")
  const tiltRef = useRef<HTMLDivElement | null>(null)
  const [tiltStyle, setTiltStyle] = useState<React.CSSProperties>({})
  const { resumeFromQuery, isLoading: authLoading } = useUpgrade()

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.has('code') && params.has('state')) {
      const newUrl = `${window.location.origin}/auth/callback?${params.toString()}`
      window.location.replace(newUrl)
      return
    }
  }, [])

  // Continue a "Choose <plan>" the user started while logged out, once we're back
  // from /auth/login and auth has resolved.
  useEffect(() => {
    if (!authLoading) resumeFromQuery()
  }, [authLoading, resumeFromQuery])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 0)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Subtle physical tilt on the preview. Follows the pointer 1:1, springs back on leave.
  const handleTiltMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = tiltRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * 2 - 1
    const py = ((e.clientY - rect.top) / rect.height) * 2 - 1
    setTiltStyle({ transform: `rotateX(${-py * 3.5}deg) rotateY(${px * 3.5}deg)` })
  }
  const handleTiltLeave = () => setTiltStyle({ transform: 'rotateX(0deg) rotateY(0deg)' })

  const scrollToPricing = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className={cn(
        "sticky top-0 z-50 bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/50 border-b transition-colors duration-300",
        scrolled ? "border-border" : "border-transparent"
      )}>
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <BrandMark className="h-8 w-8 rounded-lg" />
            <span className="font-semibold text-[17px] tracking-tight">Modern Bazaar</span>
          </Link>
          <div className="flex items-center gap-1.5 sm:gap-3">
            <Button variant="ghost" size="sm" asChild className="hidden md:inline-flex">
              <Link href="/pulse">Market pulse</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
              <Link href="#pricing" onClick={scrollToPricing}>Pricing</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard">Dashboard</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/dashboard">Get started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero: unboxed, on the canvas, generous air */}
      <header className="mx-auto max-w-6xl px-6 pt-16 pb-20 md:pt-24 md:pb-28">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
          <div className="space-y-7">
            <p className="animate-rise-in inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3.5 py-1.5 text-[13px] font-medium text-primary">
              <Trophy className="h-3.5 w-3.5" />
              SkyBlock's best trading toolkit
            </p>
            <h1 className="animate-rise-in [animation-delay:60ms] text-4xl md:text-[3.4rem] md:leading-[1.06] font-bold tracking-tight text-balance">
              Flip smarter in the{' '}
              <span className="text-primary">Hypixel Bazaar</span>
            </h1>
            <p className="animate-rise-in [animation-delay:120ms] text-lg text-muted-foreground max-w-md leading-relaxed">
              Live market data, handcrafted scores, and a clear play for every
              flip, sized to your coins.
            </p>
            <div className="animate-rise-in [animation-delay:180ms] flex flex-wrap items-center gap-3 pt-1">
              <Button asChild size="lg" className="px-7">
                <Link href="/dashboard">
                  <Zap className="h-4 w-4" />
                  Launch dashboard
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="px-7">
                <Link href="#pricing" onClick={scrollToPricing}>See pricing</Link>
              </Button>
            </div>
            <div className="animate-rise-in [animation-delay:240ms] flex flex-wrap items-center gap-x-5 gap-y-2 pt-2 text-[13px] text-muted-foreground/90">
              <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />Live data, every minute</span>
              <span className="inline-flex items-center gap-1.5"><SlidersHorizontal className="h-3.5 w-3.5" />Transparent scoring</span>
              <span className="inline-flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" />Not affiliated with Hypixel</span>
            </div>
          </div>

          <div className="animate-rise-in [animation-delay:150ms]" style={{ perspective: '1200px' }}>
            <div
              ref={tiltRef}
              onMouseMove={handleTiltMove}
              onMouseLeave={handleTiltLeave}
              className="relative rounded-xl border bg-card shadow-[0_24px_60px_-24px_hsl(230_60%_3%/0.9)] overflow-hidden transition-transform duration-300 ease-out will-change-transform"
              style={tiltStyle}
            >
              <div className="relative aspect-[16/10]">
                <Image
                  src="/hero-preview.png"
                  alt="Modern Bazaar dashboard preview"
                  fill
                  sizes="(min-width: 1024px) 560px, 100vw"
                  className="object-cover select-none pointer-events-none"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6"><div className="h-px bg-border/70" /></div>

      {/* What you get */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="max-w-2xl space-y-3 mb-12">
          <h2 className="text-2xl md:text-[1.9rem] font-bold tracking-tight">Two tools that pay for themselves</h2>
          <p className="text-muted-foreground leading-relaxed">
            You don't need to know the meta. Modern Bazaar reads the market and
            walks you through the exact move, step by step, sized to your coins.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {LIVE_STRATEGIES.map((s) => (
            <Link
              key={s.title}
              href={s.href}
              className={cn(
                "group relative flex flex-col rounded-xl border bg-card p-7 transition-[transform,border-color,box-shadow] duration-200 ease-out",
                "hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-20px_hsl(230_60%_3%/0.8)]",
                s.tone === "elite" ? "hover:border-elite/40" : "hover:border-primary/40",
              )}
            >
              <div className="mb-5 flex items-center gap-3.5">
                <div className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-lg transition-transform duration-200 ease-spring group-hover:scale-110",
                  s.tone === "elite" ? "bg-elite/10 text-elite" : "bg-primary/10 text-primary",
                )}>
                  <s.icon className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-semibold tracking-tight">{s.title}</h3>
              </div>
              <p className="mb-5 text-sm leading-relaxed text-muted-foreground">{s.blurb}</p>
              <ul className="space-y-2.5">
                {s.points.map((p) => (
                  <li key={p} className="flex items-start gap-2.5 text-sm text-foreground/85">
                    <Check className={cn("mt-0.5 h-4 w-4 shrink-0", s.tone === "elite" ? "text-elite" : "text-primary")} />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
              {"note" in s && s.note ? (
                <p className="mt-5 border-t pt-4 text-xs leading-relaxed text-muted-foreground/70">{s.note}</p>
              ) : null}
              <span className={cn(
                "mt-auto pt-6 inline-flex items-center gap-1.5 text-sm font-semibold",
                s.tone === "elite" ? "text-elite" : "text-primary",
              )}>
                Explore {s.title}
                <ArrowRight className="h-4 w-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>

        {/* Coming soon: quiet, informational */}
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SOON_STRATEGIES.map((s) => (
            <div key={s.title} className="rounded-lg border border-border/60 p-4">
              <div className="flex items-center gap-2.5">
                <s.icon className="h-4 w-4 text-muted-foreground/70" />
                <span className="text-sm font-medium text-foreground/80">{s.title}</span>
                <span className="ml-auto rounded-full border border-border/70 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">Soon</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground/70">{s.blurb}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6"><div className="h-px bg-border/70" /></div>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-6xl px-6 py-20 scroll-mt-16">
        <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl space-y-3">
            <h2 className="text-2xl md:text-[1.9rem] font-bold tracking-tight">Fair, simple pricing</h2>
            <p className="text-muted-foreground leading-relaxed">
              Start free, upgrade when you're ready. Each tier pays for itself the
              first flip it finds that you'd have walked past.
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <Segmented
              value={billing}
              onChange={setBilling}
              options={[
                { value: "monthly", label: "Monthly" },
                { value: "annual", label: "Annual" },
              ]}
            />
            <span className={`text-xs font-medium transition-colors ${billing === "annual" ? "text-gain" : "text-muted-foreground/60"}`}>
              2 months free on annual
            </span>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-3 lg:items-stretch">
          {/* Free: quiet */}
          <div className="flex flex-col rounded-xl border border-border/70 p-7">
            <div className="mb-6">
              <h3 className="text-lg font-semibold">Free</h3>
              <p className="mt-1 text-sm text-muted-foreground">Get a feel for the market</p>
            </div>
            <div className="mb-7 flex items-baseline gap-1.5">
              <span className="text-4xl font-bold tracking-tight">$0</span>
              <span className="text-sm text-muted-foreground">forever</span>
            </div>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li className="flex items-center gap-2.5"><Check className="h-4 w-4 shrink-0 text-muted-foreground/50" />Live Bazaar prices</li>
              <li className="flex items-center gap-2.5"><Check className="h-4 w-4 shrink-0 text-muted-foreground/50" />Full item catalog</li>
              <li className="flex items-center gap-2.5"><Check className="h-4 w-4 shrink-0 text-muted-foreground/50" />Favorites and search</li>
            </ul>
            <div className="mt-auto pt-7">
              <Button asChild variant="outline" className="w-full">
                <Link href="/dashboard">Start free</Link>
              </Button>
            </div>
          </div>

          {/* Flipper: the featured tier, visibly elevated */}
          <div className="relative flex flex-col rounded-xl border border-primary/45 bg-card p-7 shadow-[0_20px_50px_-20px_hsl(var(--primary)/0.25)] lg:-my-2">
            <span className="absolute -top-3 left-7 rounded-full border border-primary/40 bg-background px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
              Most popular
            </span>
            <div className="mb-6 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">Flipper</h3>
                <p className="mt-1 text-sm text-muted-foreground">Find flips worth doing</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div className="mb-1 flex items-baseline gap-2">
              <span className="text-4xl font-bold tracking-tight">{billing === "annual" ? "$4.99" : "$5.99"}</span>
              <span className="text-sm text-muted-foreground">/ month</span>
            </div>
            <p className="mb-7 text-xs">
              {billing === "annual" ? (
                <>
                  <span className="text-muted-foreground/80">Billed $59.90 a year</span>
                  <span className="ml-2 font-semibold text-gain">2 months free</span>
                </>
              ) : (
                <>
                  <span className="text-muted-foreground/70 line-through">$9.99</span>
                  <span className="ml-2 font-semibold text-gain">Save 40%</span>
                </>
              )}
            </p>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2.5">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span><span className="font-semibold">Bazaar Flipping</span>, the full scored finder</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span><span className="font-semibold">Budget sizing</span>: what to buy, how much, at what price</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span><span className="font-semibold">Filters and presets</span> tuned to your playstyle</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span><span className="font-semibold">Deeper price history</span> to spot patterns first</span>
              </li>
            </ul>
            <div className="mt-5 flex items-center gap-2 border-t pt-4 text-sm text-muted-foreground">
              <Plus className="h-4 w-4 shrink-0" />Everything in Free
            </div>
            <UpgradeButton plan="flipper" interval={billing} className="mt-7 w-full">Choose Flipper</UpgradeButton>
          </div>

          {/* Elite capacity is enforced by a transactional reservation before Checkout. */}
          <div className="relative flex flex-col rounded-xl border border-elite/30 bg-card p-7 transition-colors hover:border-elite/50">
            <span className="absolute -top-3 left-7 inline-flex items-center gap-1.5 rounded-full border border-elite/40 bg-background px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-elite">
              <span className="h-1.5 w-1.5 rounded-full bg-elite" />
              Limited slots
            </span>
            <div className="mb-6 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">Elite</h3>
                <p className="mt-1 text-sm text-muted-foreground">Move the market yourself</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-elite/10">
                <Zap className="h-5 w-5 text-elite" />
              </div>
            </div>
            <div className="mb-1 flex items-baseline gap-2">
              <span className="text-4xl font-bold tracking-tight">{billing === "annual" ? "$21.66" : "$25.99"}</span>
              <span className="text-sm text-muted-foreground">/ month</span>
            </div>
            <p className="text-xs">
              {billing === "annual" ? (
                <>
                  <span className="text-muted-foreground/80">Billed $259.90 a year</span>
                  <span className="ml-2 font-semibold text-gain">2 months free</span>
                </>
              ) : (
                <>
                  <span className="text-muted-foreground/70 line-through">$33.99</span>
                  <span className="ml-2 font-semibold text-gain">Save 24%</span>
                </>
              )}
            </p>
            <p className="mb-7 mt-3 border-l-2 border-elite/40 pl-3 text-xs leading-relaxed text-muted-foreground/80">
              Limited to 100 active members. Checkout closes automatically when capacity is reached.
            </p>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2.5">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-elite" />
                <span><span className="font-semibold">Bazaar Manipulation</span>: corner cost, price ceiling, exit timing</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-elite" />
                <span><span className="font-semibold">Priority support</span>, straight to the founder</span>
              </li>
            </ul>
            <div className="mt-auto">
              <div className="mt-5 flex items-center gap-2 border-t pt-4 text-sm text-muted-foreground">
                <Plus className="h-4 w-4 shrink-0" />Everything in Flipper
              </div>
              <UpgradeButton plan="elite" interval={billing} variant="outline" className="mt-7 w-full border-elite/40 text-elite hover:bg-elite/10 hover:text-elite">
                Choose Elite
              </UpgradeButton>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6"><div className="h-px bg-border/70" /></div>

      {/* FAQ */}
      {/* Questions are phrased the way people actually search (bazaar flipping,
          best bazaar flips, bazaar manipulation, how to bazaar flip) — the
          section doubles as the landing page's organic-search surface. */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.6fr]">
          <div className="space-y-3">
            <h2 className="text-2xl md:text-[1.9rem] font-bold tracking-tight">A small, honest project</h2>
            <p className="text-muted-foreground leading-relaxed">
              I built Modern Bazaar to learn, and to trade more informed, not
              blind. If you have ideas, I'd love to hear them.
            </p>
            <Link href="/faq" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
              Read the full FAQ
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <Accordion type="multiple" className="rounded-xl border bg-card px-6">
            {FAQ.map((f, i) => (
              <AccordionItem key={f.id} value={f.id} className={i === FAQ.length - 1 ? "border-b-0" : undefined}>
                <AccordionTrigger>{f.q}</AccordionTrigger>
                <AccordionContent>{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          {/* FAQPage structured data: the accordion unmounts closed answers from
              the DOM, so this carries the full Q&A text for search engines and
              makes the questions eligible for rich results. */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "FAQPage",
                mainEntity: FAQ.map((f) => ({
                  "@type": "Question",
                  name: f.q,
                  acceptedAnswer: { "@type": "Answer", text: f.a },
                })),
              }),
            }}
          />
        </div>
      </section>

      {/* Closing CTA: one line, one action */}
      <section className="border-t bg-card/40">
        <div className="mx-auto max-w-6xl px-6 py-16 flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1.5">
            <h2 className="text-2xl font-bold tracking-tight">Stop guessing prices.</h2>
            <p className="text-muted-foreground">See what's worth flipping right now, and how much you stand to make.</p>
          </div>
          <Button asChild size="lg" className="px-7 shrink-0">
            <Link href="/dashboard">
              <Zap className="h-4 w-4" />
              Launch dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
