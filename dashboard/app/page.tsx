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
import { ExpandableFeatureCard, Accent, ExpandableFeatureGrid } from "@/components/expandable-feature-card"
import { GradientSection } from "@/components/gradient-section"
import { TrendingUp, Boxes, Sparkles, ArrowRight, Zap, Check, Star, Shield, Clock, Lock, Heart, Trophy, SlidersHorizontal, BarChart3, LineChart, ArrowRightLeft, Wifi, WifiOff, Shuffle, Hammer, Coins, Target, DollarSign, Activity } from "lucide-react"
import { useBackendHealthContext } from '@/components/backend-health-provider'

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)
  const { isOnline } = useBackendHealthContext()
  const tiltRef = useRef<HTMLDivElement | null>(null)
  const [tiltStyle, setTiltStyle] = useState<React.CSSProperties>({})

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
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Boxes className="h-5 w-5 text-primary-foreground" />
            </div>
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
                <Trophy className="h-4 w-4" />
                SkyBlock's best trading toolkit
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

      {/* What You Get */}
      <section className="py-12 px-4 cursor-default">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-3 mb-10">
            <h2 className="text-2xl md:text-3xl font-bold">What You Get</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">An explainable scoring system that adapts to your budget, competition, and fill times.</p>
          </div>
          <ExpandableFeatureGrid className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Core features */}
            <ExpandableFeatureCard
              id="bazaar"
              accent="emerald"
              icon={<Shuffle className="h-4 w-4 text-emerald-500" />}
              title="Bazaar Flipping"
              status="released"
              summary={<span>Discover quick flips with budget-aware, competition and fill-time scoring.</span>}
              details={
                <div className="space-y-2">
                  <p>Your copilot for day-to-day flips: it tells you what to do, when to do it, and why.</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><Accent>Position sizing</Accent>: exactly how much to buy/sell for your budget.</li>
                    <li><Accent>Projected P/L</Accent>: expected coins and downside with clear risk flags.</li>
                    <li><Accent>Manipulation shields</Accent>: detects spoofing/spreads and limits exposure.</li>
                    <li><Accent>Fill-time ETA</Accent>: realistic time windows for buys and sells to complete.</li>
                  </ul>
                </div>
              }
            />
            
            

            {/* Coming soon */}
            <ExpandableFeatureCard
              id="craft"
              className="opacity-90"
              accent="blue"
              icon={<Hammer className="h-4 w-4 text-blue-500" />}
              title="Craft Flipping"
              status="coming"
              summary={<span>Profit from crafting by scoring material baskets against sale prices, factoring in demand and fill time.</span>}
              details={
                <div className="space-y-2">
                  <p>Choose recipes with confidence: the copilot balances cost, demand, and your coin limits.</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><Accent>Smart materials</Accent>: optimizes basket sources and warns on inflated inputs.</li>
                    <li><Accent>Exact quantities</Accent>: tells you how many to craft for your budget and risk.</li>
                    <li><Accent>Profit clarity</Accent>: net-after-fees estimates and sensitivity to price swings.</li>
                    <li><Accent>Time-aware</Accent>: expected sell-through times factored into your plan.</li>
                  </ul>
                </div>
              }
            />
            
            <ExpandableFeatureCard
              id="npc"
              className="opacity-90"
              accent="amber"
              icon={<Coins className="h-4 w-4 text-amber-500" />}
              title="NPC Flipping"
              status="coming"
              summary={<span>Maximize daily-limit profits with budget-aware scoring that targets the highest NPC margins.</span>}
              details={
                <div className="space-y-2">
                  <p>Plan your caps like a pro: the assistant sequences buys/sells to squeeze the most from limits.</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><Accent>Route planning</Accent>: prioritized items based on margin, availability, and limits.</li>
                    <li><Accent>Budget fit</Accent>: allocates coins across items for best risk-adjusted return.</li>
                    <li><Accent>Risk callouts</Accent>: flags manipulation and volatile windows to avoid.</li>
                    <li><Accent>Timing</Accent>: clear expectations for how long each step takes.</li>
                  </ul>
                </div>
              }
            />
            
            <ExpandableFeatureCard
              id="manipulation"
              className="opacity-90"
              accent="purple"
              icon={<Shield className="h-4 w-4 text-purple-500" />}
              title="Bazaar Manipulation"
              status="planned"
              summary={<span>Set prices and shape supply with risk controls and timeline-aware execution.</span>}
              details={
                <div className="space-y-2">
                  <p>Model scenarios before you act: understand liquidity needs, risk, and expected payoff over time.</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><Accent>Playbook guidance</Accent>: step-by-step "what, when, how much".</li>
                    <li><Accent>Guardrails</Accent>: exposure caps, stop conditions, and anomaly detection.</li>
                    <li><Accent>Timeline</Accent>: staged orders with fill-time windows and unwind paths.</li>
                  </ul>
                </div>
              }
            />

            <ExpandableFeatureCard
              id="budget"
              className="opacity-90"
              accent="emerald"
              icon={<DollarSign className="h-4 w-4 text-emerald-500" />}
              title="Budget Planner"
              status="planned"
              summary={<span>Allocate coins across strategies using risk-adjusted, fill-time-aware projections.</span>}
              details={
                <div className="space-y-2">
                  <p>Personal to your constraints: the copilot tunes ideas to your coins and preferences.</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><Accent>Allocation advice</Accent>: how much to place in each strategy right now.</li>
                    <li><Accent>Risk fit</Accent>: respects your max drawdown, concentration, and cooldown settings.</li>
                    <li><Accent>Cashflow timing</Accent>: when coins unlock based on fill-time expectations.</li>
                  </ul>
                </div>
              }
            />

            <ExpandableFeatureCard
              id="ah"
              className="opacity-90"
              accent="rose"
              icon={<ArrowRightLeft className="h-4 w-4 text-rose-500" />}
              title="Auction House"
              status="planned"
              summary={<span>Snipe and flip using live listings and history, scored by budget, competition, and time to sell.</span>}
              details={
                <div className="space-y-2">
                  <p>Turn signals into action: the assistant calls the trades and sizes them for your wallet.</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><Accent>Entry timing</Accent>: when to place the bid or buyout.</li>
                    <li><Accent>Size + price</Accent>: how many and at what price is reasonable.</li>
                    <li><Accent>Outcome preview</Accent>: expected profit, risk, and sell-through time.</li>
                  </ul>
                </div>
              }
            />
          </ExpandableFeatureGrid>
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
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
              <h2 className="text-2xl md:text-3xl font-bold">Fair, simple pricing</h2>
              <div className="flex justify-center md:justify-end">
                <Button asChild variant="ghost" className="text-muted-foreground hover:text-foreground">
                  <Link href="/pricing/compare">Compare plans</Link>
                </Button>
              </div>
            </div>
            <p className="text-muted-foreground max-w-2xl">Choose your plan. Upgrade anytime.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Starter Plan */}
            <Card className="relative h-full flex flex-col border-2 hover:border-yellow-500/60 transition-all duration-200 hover:shadow-lg">
              <CardHeader className="text-center space-y-4">
                <div className="mx-auto w-12 h-12 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                  <Boxes className="h-6 w-6 text-yellow-500" />
                </div>
                <div>
                  <CardTitle className="text-xl">Starter</CardTitle>
                  <CardDescription>Kickstart your trading</CardDescription>
                </div>
                <div className="space-y-2">
                  <div className="text-3xl font-bold">$5.99</div>
                  <div className="text-sm text-muted-foreground">per month</div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 flex-1 flex flex-col">
                <ul className="space-y-3 flex-1">
                  <li className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Flip finder (core features)</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Real-time pricing</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Explainable scores</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">24h history & volatility</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Favorites & pin</span>
                  </li>
                </ul>
                <Button asChild className="mt-4 w-full border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10" variant="outline">
                  <Link href="/dashboard">Choose Starter</Link>
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
                {/* Trading Icons Background - diagonal lines with subtle glow */}
                <div className="absolute inset-0 pointer-events-none opacity-20">
                  {(() => {
                    const icons = [
                      { icon: TrendingUp, size: 'h-6 w-6', color: 'text-blue-400/60' },
                      { icon: BarChart3, size: 'h-6 w-6', color: 'text-blue-400/60' },
                      { icon: LineChart, size: 'h-6 w-6', color: 'text-blue-400/60' },
                      { icon: Activity,  size: 'h-6 w-6', color: 'text-blue-400/60' },
                      { icon: Target,    size: 'h-6 w-6', color: 'text-blue-400/60' },
                      { icon: Zap,       size: 'h-6 w-6', color: 'text-blue-400/60' }
                    ];

                    // Parallel diagonal lines (slash direction) across full card
                    const lineCount = 7;
                    const itemsPerLine = 7;
                    const cMin = -10;   // TL border
                    const cMax = 199; // BR border
                    const cStep = (cMax - cMin) / (lineCount - 1);

                    const positions: Array<{ top: string; left: string; iconIndex: number }> = [];

                                         // Keep main content area clear (icon, title, text)
                     const excludeZones = [
                        { top: 5, bottom: 45, left: 25, right: 70 },
                        { top: 45, bottom: 90, left: 5, right: 60 },
                        { top: 90, bottom: 96, left: 5, right: 80 },
                     ]

                    for (let li = 0; li < lineCount; li++) {
                      const c = cMin + li * cStep;
                      const xMin = -14;
                      const xMax = 114;
                      const xStep = (xMax - xMin) / (itemsPerLine + 1);

                                             for (let k = 1; k <= itemsPerLine; k++) {
                         const x = xMin + k * xStep;
                         const y = -x + c; // y = -x + c (45°)
                         if (x < 0 || x > 100 || y < 0 || y > 100) continue;
                        //  if (y >= exclude.top && y <= exclude.bottom && x >= exclude.left && x <= exclude.right) continue;
                        //  if (y >= excludeBottom.top && y <= excludeBottom.bottom && x >= excludeBottom.left && x <= excludeBottom.right) continue;
                        let excluded = false;
                        for (const exclude of excludeZones) {
                          if (y >= exclude.top && y <= exclude.bottom && x >= exclude.left && x <= exclude.right) {
                            excluded = true;
                          }
                        }
                        if (excluded) continue;

                        // Mix icon types along each line deterministically
                        const iconIndex = (li * 2 + k) % icons.length;
                        positions.push({ top: `${y}%`, left: `${x}%`, iconIndex });
                      }
                    }

                    return positions.map((pos, index) => {
                      const iconData = icons[pos.iconIndex];
                      const IconComponent = iconData.icon;

                      return (
                        <div
                          key={index}
                          className={`absolute ${iconData.size}`}
                          style={{
                            top: pos.top,
                            left: pos.left,
                            transform: 'translate(-50%, -50%)'
                          }}
                        >
                          <IconComponent className={`${iconData.color} drop-shadow-[0_0_8px_rgba(59,130,246,0.3)] filter blur-[0.5px]`} />
                        </div>
                      );
                    });
                  })()}
                </div>
                
                {/* Background gradient overlays */}
                <div className="absolute inset-0 pointer-events-none" style={{
                  background: 'radial-gradient(ellipse at center, rgba(59, 130, 246, 0.01) 0%, rgba(59, 130, 246, 0.01) 40%, transparent 70%)'
                }}></div>
                <div className="absolute inset-0 pointer-events-none" style={{
                  background: 'radial-gradient(ellipse at top right, rgba(59, 130, 246, 0.01) 0%, rgba(59, 130, 246, 0.0) 40%, transparent 70%)'
                }}></div>
                <div className="absolute inset-0 pointer-events-none" style={{
                  background: 'radial-gradient(ellipse at top left, rgba(59, 130, 246, 0.0) 0%, rgba(59, 130, 246, 0.0) 40%, transparent 70%)'
                }}></div>
              <CardHeader className="text-center space-y-4 py-8 relative z-10">
                <div className="mx-auto w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl">Flipper</CardTitle>
                  <CardDescription>For serious traders</CardDescription>
                </div>
                <div className="space-y-1">
                  <div className="text-sm"></div>
                  <div className="text-center text-3xl flex justify-center items-center">
                    <span className="font-bold">$9.99</span>
                    <span className="line-through text-muted-foreground/80 text-sm ml-1">$12.99</span>
                  </div>
                  <div className="inline-flex items-center gap-2 text-xs text-green-400">Save 23%</div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 flex-1 flex flex-col relative z-10">
                <ul className="space-y-3 flex-1">
                  <li className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Everything in Starter</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Advanced filters & tuning</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Trading presets</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Deeper history & volatility</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Market insights dashboard</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Explainable scoring details</span>
                  </li>
                </ul>
                <Button asChild className="w-full border-primary/30 text-primary hover:bg-primary/10" variant="outline">
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
                  <CardDescription>For power users</CardDescription>
                </div>
                <div className="space-y-2">
                  <div className="text-3xl font-bold">$25.99</div>
                  <div className="text-sm text-muted-foreground">per month</div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 flex-1 flex flex-col">
                <ul className="space-y-3 flex-1">
                  <li className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Everything in Flipper</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Extended history & metrics</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Advanced risk breakdowns</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Customizable scoring weights</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Priority support</span>
                  </li>
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
                  <AccordionTrigger>What this is</AccordionTrigger>
                  <AccordionContent>
                    A practical set of tools to monitor Bazaar prices and spot steady opportunities. It favors clarity over hype.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="what-it-isnt">
                  <AccordionTrigger>What this isn’t</AccordionTrigger>
                  <AccordionContent>
                    A guarantee of profit or a magic signal generator. Markets move. Use judgement and trade responsibly.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="privacy">
                  <AccordionTrigger>Privacy & ethics</AccordionTrigger>
                  <AccordionContent>
                    No gimmicks. No spam. I want this to be useful, respectful, and fun, just like I'd want for myself.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="how-it-ranks">
                  <AccordionTrigger>How are flips ranked?</AccordionTrigger>
                  <AccordionContent>
                    Scores blend spread, volume, fill-rate, and risk. You can choose presets (fast, default, stable) or tune filters to match your style.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="data-refresh">
                  <AccordionTrigger>How real-time is the data?</AccordionTrigger>
                  <AccordionContent>
                    Market data is kept near real-time. The backend fetches Hypixel Bazaar frequently and aggregates it so you can act with fresh information.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="getting-started">
                  <AccordionTrigger>How do I get started?</AccordionTrigger>
                  <AccordionContent>
                    Open the dashboard, pick a preset, set basic filters (min volume, margin), and sort by score or profit/hour. Favor items with steady volume and reasonable spreads.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="roadmap">
                  <AccordionTrigger>What’s next?</AccordionTrigger>
                  <AccordionContent>
                    Better risk metrics, richer history, and more strategy tooling. Your feedback shapes what comes first.
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
          <h2 className="text-2xl md:text-3xl font-bold">Ready to flip with confidence?</h2>
          <p className="text-muted-foreground mt-2">
            See spread, volume, and risk at a glance. Understand the why, then execute.
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
