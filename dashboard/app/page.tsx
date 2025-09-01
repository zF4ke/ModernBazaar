"use client"

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { FeatureCard } from "@/components/feature-card"
import { GradientSection } from "@/components/gradient-section"
import { TrendingUp, Boxes, Sparkles, ArrowRight, Zap, Check, Star, Shield, Clock, Lock, Heart, Trophy, SlidersHorizontal, BarChart3, ArrowRightLeft, Wifi, WifiOff } from "lucide-react"
import { useBackendHealthContext } from '@/components/backend-health-provider'

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)
  const { isOnline } = useBackendHealthContext()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 0)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="min-h-screen" style={{
      background: 'radial-gradient(ellipse at top left, rgba(255,255,255,0.03) 0%, transparent 50%), radial-gradient(ellipse at bottom right, rgba(255,255,255,0.02) 0%, transparent 50%)'
    }}>
      {/* Navigation */}
      <nav className={cn(
        "sticky top-0 z-50 bg-background/30 backdrop-blur supports-[backdrop-filter]:bg-background/20 border-b",
        scrolled ? "border-border/40" : "border-transparent"
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
            <Button variant="ghost" asChild>
              <Link href="/dashboard/strategies">Strategies</Link>
            </Button>
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
                <span className="bg-gradient-to-r from-primary to-primary/75 bg-clip-text text-transparent">
                  Hypixel Bazaar
                </span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto md:mx-0">
                Handcrafted tools and real-time pricing to help you flip confidently with empirical data, not guesses.
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
              <div className="relative rounded-xl border bg-background/60 backdrop-blur overflow-hidden shadow-sm">
                <Image
                  src="/hero-preview.png"
                  alt="Modern Bazaar dashboard preview"
                  width={1120}
                  height={720}
                  className="w-full h-auto"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </GradientSection>

      {/* Highlights */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-3 mb-10">
            <h2 className="text-2xl md:text-3xl font-bold">What You Get</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Clear tools that help you trade. Fine-tunable, trustworthy, and easy to understand.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <FeatureCard>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <ArrowRightLeft className="h-4 w-4 text-emerald-500" />
                  <h3 className="text-base font-semibold">Flip finder</h3>
                </div>
                <p className="text-sm text-muted-foreground">Buy/sell gap scoring with volume, fill-rate, and fees in mind.</p>
              </div>
            </FeatureCard>
            <FeatureCard>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-amber-500" />
                  <h3 className="text-base font-semibold">Historical trends</h3>
                </div>
                <p className="text-sm text-muted-foreground">Price history and volatility to see stability, not just spikes.</p>
              </div>
            </FeatureCard>
            <FeatureCard>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-rose-500" />
                  <h3 className="text-base font-semibold">Favorites & pin</h3>
                </div>
                <p className="text-sm text-muted-foreground">Star the best picks and pin them to the top of lists.</p>
              </div>
            </FeatureCard>
            <FeatureCard>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <h3 className="text-base font-semibold">Real-time pricing</h3>
                </div>
                <p className="text-sm text-muted-foreground">Live prices and spreads across tracked items.</p>
              </div>
            </FeatureCard>
            <FeatureCard>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-purple-500" />
                  <h3 className="text-base font-semibold">Explainable scoring</h3>
                </div>
                <p className="text-sm text-muted-foreground">See why a pick ranks: spread, volume, and risk.</p>
              </div>
            </FeatureCard>
            <FeatureCard>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-rose-500" />
                  <h3 className="text-base font-semibold">Filters & tuning</h3>
                </div>
                <p className="text-sm text-muted-foreground">Set min volume, margin, and risk to fit your style.</p>
              </div>
            </FeatureCard>
          </div>
        </div>
      </section>


      {/* Section Separator */}
      <div className="mx-8 my-12">
        <div className="h-px bg-gradient-to-r from-transparent via-border/60 to-transparent"></div>
      </div>

      {/* Pricing Plans */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-2xl md:text-3xl font-bold">Fair, simple pricing</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Start free. Upgrade only if it's genuinely useful for you.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Starter Plan */}
            <Card className="relative border-2 hover:border-primary/50 transition-all duration-200 hover:shadow-lg">
              <CardHeader className="text-center space-y-4">
                <div className="mx-auto w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Boxes className="h-6 w-6 text-blue-500" />
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
              <CardContent className="space-y-4">
                <ul className="space-y-3">
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
                <Button asChild className="w-full" variant="outline">
                  <Link href="/dashboard">Choose Starter</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Flipper Plan */}
            <Card className="relative border-2 border-primary shadow-lg scale-105">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground px-3 py-1">
                  <Star className="h-3 w-3 mr-1" />
                  Most Popular
                </Badge>
              </div>
              <CardHeader className="text-center space-y-4">
                <div className="mx-auto w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl">Flipper</CardTitle>
                  <CardDescription>For serious traders</CardDescription>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground line-through">$12.99</div>
                  <div className="text-3xl font-bold">$9.99</div>
                  <div className="text-xs text-green-500">limited-time discount</div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3">
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
                <Button asChild className="w-full">
                  <Link href="/dashboard">Choose Flipper</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Elite Plan */}
            <Card className="relative border-2 hover:border-primary/50 transition-all duration-200 hover:shadow-lg">
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
              <CardContent className="space-y-4">
                <ul className="space-y-3">
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
                <Button asChild className="w-full" variant="outline">
                  <Link href="/dashboard">Choose Elite</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
          <div className="text-center mt-8">
            <Button asChild variant="ghost">
              <Link href="/pricing/compare">Compare plans</Link>
            </Button>
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
              <Accordion type="multiple" defaultValue={["what-it-is","what-it-isnt","privacy","how-it-ranks","data-refresh","getting-started","roadmap"]}>
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

      {/* Simple CTA (near the end) */}
      <section className="text-center space-y-6 mx-4 mb-8 p-8 md:p-12">
        <h2 className="text-2xl md:text-3xl font-bold">Ready to Start Trading?</h2>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          Flip confidently with tools that explain the why.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button asChild size="lg" className="transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 px-8 py-3 text-lg bg-primary hover:bg-primary/90">
            <Link href="/dashboard">
              <Zap className="h-5 w-5 mr-2" />
              Launch Dashboard
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 px-8 py-3 text-lg">
            <Link href="/dashboard/strategies">
              <TrendingUp className="h-5 w-5 mr-2" />
              Explore Strategies
            </Link>
          </Button>
        </div>
        <div aria-hidden className="text-xl">💜</div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="container mx-auto px-4 py-8 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-muted-foreground">© 2025 Modern Bazaar. All rights reserved.</div>
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
