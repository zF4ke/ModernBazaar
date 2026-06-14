"use client"

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { FeatureCard } from "@/components/feature-card"
import { GradientSection } from "@/components/gradient-section"
import { TrendingUp, Boxes, Sparkles, ArrowRight, Zap, Check, Star, Shield, Clock, Lock, Heart, Trophy, SlidersHorizontal, BarChart3, LineChart, ArrowRightLeft, Wifi, WifiOff, Shuffle, Hammer, Coins, Crosshair, Target, DollarSign, Activity } from "lucide-react"
import { useBackendHealthContext } from '@/components/backend-health-provider'
import { BrandMark } from "@/components/brand-mark"

const STRATEGIES = [
  { title: "Bazaar Flipping", icon: Shuffle, color: "text-emerald-400", tint: "bg-emerald-500/15", live: true,
    points: ["Buy and sell gaps ranked by profit per hour", "How much to buy for your budget", "Risk flags and fill-time estimates"] },
  { title: "Bazaar Manipulation", icon: Crosshair, color: "text-blue-400", tint: "bg-blue-500/15", live: true,
    points: ["Spot thin markets you can corner", "A full plan: cost, resell price and profit", "How long it takes to sell out"] },
  { title: "Craft Flipping", icon: Hammer, color: "text-muted-foreground", tint: "bg-muted", live: false,
    points: ["Compare craft cost to sell price", "How many to craft for your budget", "Profit after fees and time to sell"] },
  { title: "NPC Flipping", icon: Coins, color: "text-muted-foreground", tint: "bg-muted", live: false,
    points: ["Best items for the daily NPC limit", "How to spend your 200M cap", "Buy low, sell straight to NPCs"] },
  { title: "Budget Planner", icon: DollarSign, color: "text-muted-foreground", tint: "bg-muted", live: false,
    points: ["Split your coins across strategies", "Matched to your risk and limits", "See when your coins free up"] },
  { title: "Auction House", icon: ArrowRightLeft, color: "text-muted-foreground", tint: "bg-muted", live: false,
    points: ["Snipe underpriced listings", "Fair bid and buyout prices", "Expected profit and time to sell"] },
]

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)
  const { isOnline } = useBackendHealthContext()
  const tiltRef = useRef<HTMLDivElement | null>(null)
  const [tiltStyle, setTiltStyle] = useState<React.CSSProperties>({})

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.has('code') && params.has('state')) {
      const newUrl = `${window.location.origin}/auth/callback?${params.toString()}`
      window.location.replace(newUrl)
      return
    }
  }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 0)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleTiltMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = tiltRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const px = (x / rect.width) * 2 - 1 // -1 to 1
    const py = (y / rect.height) * 2 - 1
    const maxRotate = 6 // degrees
    const rx = (-py) * maxRotate
    const ry = (px) * maxRotate
    setTiltStyle({
      transform: `rotateX(${rx}deg) rotateY(${ry}deg) translateZ(0) scale(1.04)`,
    })
  }

  const handleTiltLeave = () => {
    setTiltStyle({ transform: 'rotateX(0deg) rotateY(0deg) translateZ(0) scale(1.02)' })
  }

  return (
    <div className="min-h-screen" style={{
      background: 'radial-gradient(ellipse at top left, rgba(255,255,255,0.03) 0%, transparent 50%), radial-gradient(ellipse at bottom right, rgba(255,255,255,0.02) 0%, transparent 50%)'
    }}>
      {/* Navigation */}
      <nav className={cn(
        "sticky top-0 z-50 bg-background/30 backdrop-blur supports-[backdrop-filter]:bg-background/20 border-b",
        scrolled ? "border-border" : "border-transparent"
      )}>
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrandMark className="h-8 w-8 rounded-lg" />
            <span className="font-semibold text-lg">Modern Bazaar</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <Button variant="ghost" asChild>
              <Link href="/dashboard">Dashboard</Link>
            </Button>
            {/* <Button variant="ghost" asChild>
              <Link href="/dashboard/strategies">Strategies</Link>
            </Button> */}
            <Button asChild>
              <Link href="/dashboard">Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <GradientSection variant="hero" padding="lg" className="mt-0 mx-8 md:mx-8">
        <div className="container mx-auto">
          <div className="grid items-center gap-10 md:grid-cols-2">
            <div className="space-y-6 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
                <LineChart className="h-4 w-4" />
                Real-time Hypixel Bazaar analytics
              </div>
              <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
                Flip smarter in the{' '}
                <br></br>
                <span className="bg-gradient-to-r from-primary to-primary/75 bg-clip-text text-transparent">
                  Hypixel Bazaar
                </span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto md:mx-0">
                Handcrafted tools with real-time pricing and clear, budget-aware scores so you can flip with confidence.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center md:justify-start items-center pt-1">
                <Button asChild size="lg" className="px-8 py-3 text-lg transform hover:scale-[1.02] active:scale-[0.98] transition-all">
                  <Link href="/dashboard">
                    <Zap className="h-5 w-5 mr-2" />
                    Launch Dashboard
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="px-8 py-3 text-lg transform transition-all">
                  <Link href="/dashboard/strategies">
                    <TrendingUp className="h-5 w-5 mr-2" />
                    Explore Strategies
                  </Link>
                </Button>
              </div>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-xs text-muted-foreground">
                <div className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-muted/50 border">
                  <Clock className="h-3.5 w-3.5" />
                  Real-time data
                </div>
                <div className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-muted/50 border">
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  Fine-tunable & transparent
                </div>
                <div className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-muted/50 border">
                  <Shield className="h-3.5 w-3.5" />
                  Not affiliated with Hypixel
                </div>
              </div>
            </div>
            <div className="relative">
              <div
                ref={tiltRef}
                onMouseMove={handleTiltMove}
                onMouseLeave={handleTiltLeave}
                className="relative rounded-xl border bg-background/60 backdrop-blur overflow-hidden shadow-sm group"
                style={{ perspective: '1000px' }}
              >
                <div
                  className="transform-gpu transition-transform duration-150 ease-out will-change-transform"
                  style={tiltStyle}
                >
                  <div className="relative aspect-[16/10]">
                    <Image
                      src="/hero-preview.png"
                      alt="Modern Bazaar dashboard preview"
                      fill
                      sizes="(min-width: 1920px) 560px, 100vw"
                      className="object-cover select-none pointer-events-none"
                      priority
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </GradientSection>

      {/* What you get */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="space-y-3 mb-10 text-center">
            <h2 className="text-2xl md:text-3xl font-bold">What you get</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Real-time Bazaar data turned into clear, budget-aware calls. Two tools are live now, the rest are on the way.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {STRATEGIES.map((s) => (
              <FeatureCard key={s.title} backgroundStyle="glass" className={s.live ? "" : "opacity-80"} glow={s.live ? s.tint.replace("/15", "/30") : undefined}>
                <div className="flex items-center gap-2.5 mb-4">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${s.tint}`}>
                    <s.icon className={`h-4 w-4 ${s.color}`} />
                  </div>
                  <h3 className="text-base font-semibold">{s.title}</h3>
                  {!s.live && <span className="ml-auto text-[11px] text-muted-foreground">Soon</span>}
                </div>
                <ul className="space-y-2">
                  {s.points.map((p, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${s.live ? "text-emerald-500" : "text-muted-foreground/40"}`} />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </FeatureCard>
            ))}
          </div>
        </div>
      </section>


      {/* Section Separator */}
      <div className="mx-8 my-12">
        <div className="h-px bg-gradient-to-r from-transparent via-border/60 to-transparent"></div>
      </div>

      {/* Pricing Plans */}
      <section id="pricing" className="py-16 px-4 cursor-default">
        <div className="container mx-auto max-w-6xl">
          <div className="space-y-3 mb-6">
            <h2 className="text-2xl md:text-3xl font-bold">Fair, simple pricing</h2>
            <p className="text-muted-foreground max-w-2xl">The app is still in active development, so plans aren&apos;t live yet and everything&apos;s free for now. This is where they&apos;ll land.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Free Plan */}
            <Card className="relative h-full flex flex-col border-2 hover:border-zinc-500/60 transition-all duration-200 hover:shadow-lg">
              <CardHeader className="text-center space-y-4">
                <div className="mx-auto w-12 h-12 rounded-lg bg-zinc-500/20 flex items-center justify-center">
                  <Boxes className="h-6 w-6 text-zinc-400" />
                </div>
                <div>
                  <CardTitle className="text-xl">Free</CardTitle>
                  <CardDescription>Get a feel for the market</CardDescription>
                </div>
                <div className="space-y-2">
                  <div className="text-3xl font-bold">$0</div>
                  <div className="text-sm text-muted-foreground">forever</div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 flex-1 flex flex-col">
                <ul className="space-y-3 flex-1">
                  <li className="flex items-center gap-3"><Check className="h-4 w-4 text-green-500 shrink-0" /><span className="text-sm">Live Bazaar prices</span></li>
                  <li className="flex items-center gap-3"><Check className="h-4 w-4 text-green-500 shrink-0" /><span className="text-sm">Full item catalog</span></li>
                  <li className="flex items-center gap-3"><Check className="h-4 w-4 text-green-500 shrink-0" /><span className="text-sm">Favorites &amp; search</span></li>
                </ul>
                <Button asChild className="mt-4 w-full" variant="outline">
                  <Link href="/dashboard">Start free</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Flipper Plan */}
            <Card className="relative h-full flex flex-col border-2 border-primary shadow-lg scale-105">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-20">
                <Badge className="bg-primary text-foreground px-3 py-1 shadow-lg">
                  <Star className="h-3 w-3 mr-1 fill-current" fill="currentColor" />
                  Most Popular
                </Badge>
              </div>
                {/* glow */}
                <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-blue-500/25 blur-3xl" />
              <CardHeader className="text-center space-y-4 py-8 relative z-10">
                <div className="mx-auto w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl">Flipper</CardTitle>
                  <CardDescription>Find flips worth doing</CardDescription>
                </div>
                <div className="space-y-2">
                  <div className="text-3xl font-bold">$9.99</div>
                  <div className="text-sm text-muted-foreground">per month</div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 flex-1 flex flex-col relative z-10">
                <ul className="space-y-3 flex-1">
                  <li className="flex items-center gap-3"><Check className="h-4 w-4 text-green-500 shrink-0" /><span className="text-sm">Everything in Free</span></li>
                  <li className="flex items-center gap-3"><Check className="h-4 w-4 text-green-500 shrink-0" /><span className="text-sm">Bazaar Flipping finder, ranked by profit/hour</span></li>
                  <li className="flex items-center gap-3"><Check className="h-4 w-4 text-green-500 shrink-0" /><span className="text-sm">Filters, presets &amp; budget sizing</span></li>
                  <li className="flex items-center gap-3"><Check className="h-4 w-4 text-green-500 shrink-0" /><span className="text-sm">Deeper price history</span></li>
                </ul>
                <Button asChild className="w-full">
                  <Link href="/dashboard">Choose Flipper</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Elite Plan */}
            <Card className="relative h-full flex flex-col border-2 hover:border-purple-500/60 transition-all duration-200 hover:shadow-lg">
              <CardHeader className="text-center space-y-4">
                <div className="mx-auto w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <Zap className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                  <CardTitle className="text-xl">Elite</CardTitle>
                  <CardDescription>Move the market yourself</CardDescription>
                </div>
                <div className="space-y-2">
                  <div className="text-3xl font-bold">$25.99</div>
                  <div className="text-sm text-muted-foreground">per month</div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 flex-1 flex flex-col">
                <ul className="space-y-3 flex-1">
                  <li className="flex items-center gap-3"><Check className="h-4 w-4 text-green-500 shrink-0" /><span className="text-sm">Everything in Flipper</span></li>
                  <li className="flex items-center gap-3"><Check className="h-4 w-4 text-green-500 shrink-0" /><span className="text-sm">Bazaar Manipulation — full cornering plan</span></li>
                  <li className="flex items-center gap-3"><Check className="h-4 w-4 text-green-500 shrink-0" /><span className="text-sm">Priority support</span></li>
                </ul>
                <Button asChild className="mt-4 w-full border-purple-500/30 text-purple-400 hover:bg-purple-500/10" variant="outline">
                  <Link href="/dashboard">Choose Elite</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Section Separator */}
      <div className="mx-8 my-12">
        <div className="h-px bg-gradient-to-r from-transparent via-border/60 to-transparent"></div>
      </div>

      {/* Personal Note / FAQ */}
      <section className="px-4 pb-16">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center space-y-3 mb-8">
            <h2 className="text-2xl md:text-3xl font-bold">A small, honest project</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">I built Modern Bazaar to learn, and to trade more informed, not blind. If you have ideas, I'd love to hear them.</p>
          </div>
          <Card>
            <CardContent className="p-6">
              <Accordion type="multiple">
                <AccordionItem value="what-it-is">
                  <AccordionTrigger>What is this?</AccordionTrigger>
                  <AccordionContent>
                    A dashboard that watches Hypixel Bazaar prices and points out flips actually worth doing. I got tired of eyeballing prices and tabbing in and out of the game, so I built this.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="profit">
                  <AccordionTrigger>Will it make me money?</AccordionTrigger>
                  <AccordionContent>
                    Maybe, but it&apos;s not magic. It surfaces good setups and does the math; the market still does what it wants. Think of it as a head start, not a guarantee.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="how-it-ranks">
                  <AccordionTrigger>How does it pick flips?</AccordionTrigger>
                  <AccordionContent>
                    It looks at the spread, how much actually trades each hour, how crowded the item is, and how jumpy the price has been, then ranks by expected profit per hour after tax. You can sort by raw profit instead if you&apos;d rather.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="data-refresh">
                  <AccordionTrigger>How fresh is the data?</AccordionTrigger>
                  <AccordionContent>
                    It pulls from Hypixel about once a minute, so prices are usually within a minute or two of live.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="getting-started">
                  <AccordionTrigger>How do I start?</AccordionTrigger>
                  <AccordionContent>
                    Open the dashboard, set your budget, and look at the top of the Flipping list. Start with items that trade a lot, since they fill faster and are harder to get stuck in.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="roadmap">
                  <AccordionTrigger>What&apos;s coming?</AccordionTrigger>
                  <AccordionContent>
                    Craft and NPC flipping, a budget planner, and auction-house tools. What I build next mostly comes down to what people ask for.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>

          
        </div>
      </section>
      
      {/* Section Separator */}
      <div className="mx-8 my-12">
        <div className="h-px bg-gradient-to-r from-transparent via-border/60 to-transparent"></div>
      </div>

      {/* CTA (simple) */}
      <section className="px-4 py-12 mb-12">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-2xl md:text-3xl font-bold">Stop guessing prices.</h2>
          <p className="text-muted-foreground mt-2">
            See what&apos;s actually worth flipping right now, and how much you stand to make.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mt-5">
            <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-lg px-8 py-3 text-base font-medium">
              <Link href="/dashboard">
                <Zap className="h-5 w-5 mr-2" />
                Launch Dashboard
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-primary/40 text-primary hover:bg-primary/10 px-8 py-3 text-base">
              <Link href="#pricing" onClick={(e) => { 
                e.preventDefault(); 
                const pricingElement = document.getElementById('pricing');
                if (pricingElement) {
                  pricingElement.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start',
                    inline: 'nearest'
                  });
                }
              }}>
                <TrendingUp className="h-5 w-5 mr-2" />
                View Plans
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="container mx-auto px-4 py-8 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-muted-foreground">© 2025 Modern Bazaar. All rights reserved. 💜</div>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/terms" className="hover:underline">Terms of Service</Link>
            <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
            <Link href="/support" className="hover:underline">Support</Link>
          </div>
          <div className="flex items-center gap-2 text-sm">
            {isOnline ? (
              <span className="inline-flex items-center gap-2 text-green-500">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                All Systems Operational
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 text-amber-500">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                Some systems unavailable
              </span>
            )}
          </div>
        </div>
      </footer>
    </div>
  )
}
