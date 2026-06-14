"use client"

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  TrendingUp,
  ArrowRight,
  Shuffle,
  Rocket,
  Crosshair,
  Play
} from "lucide-react"
import Link from "next/link"
import { GradientSection } from '@/components/gradient-section'
import { LoginCheck } from '@/components/login-check'
import { VideoTutorialPopup } from './_components/video-tutorial-popup'
import { StrategyNavigationTabs } from './_components/strategy-navigation-tabs'
import { StrategyFAQSection } from './_components/strategy-faq-section'

// Reusable component for icon + text sections
const IconTextSection = ({
  icon: Icon,
  title,
  description,
  iconBgColor = "bg-emerald-500/20",
  iconColor = "text-emerald-400"
}: {
  icon: any
  title: string
  description: string
  iconBgColor?: string
  iconColor?: string
}) => (
  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
    <div className={`flex-shrink-0 w-8 h-8 rounded-full ${iconBgColor} flex items-center justify-center`}>
      <Icon className={`h-4 w-4 ${iconColor}`} />
    </div>
            <div>
      <h4 className="font-medium">{title}</h4>
      <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          </div>
)

// Component that uses useSearchParams
function TradingStrategiesContent() {
  const [activeStrategy, setActiveStrategy] = useState("bazaar-flipping")
  const [showVideoPopup, setShowVideoPopup] = useState(false)
  const searchParams = useSearchParams()

  useEffect(() => {
    const strategyId = searchParams.get("tab") || "bazaar-flipping"
    setActiveStrategy(strategyId)
  }, [searchParams])

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <GradientSection variant="hero" padding="md" backdropBlur="none">
        <div className="relative z-10 flex flex-col gap-4">
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingUp className="h-4 w-4"/>
            Trading Tools
        </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Professional tools to help you profit
          </h1>
          <p className="text-muted-foreground">
            These are our advanced trading tools designed to give you the edge in the Hypixel SkyBlock market.
          </p>
      </div>
      </GradientSection>

      {/* Strategy Navigation */}
      <StrategyNavigationTabs activeStrategy={activeStrategy} setActiveStrategy={setActiveStrategy} />

      {/* Strategy Content */}
      <div className="space-y-6">
        {/* Bazaar Flipping Content */}
        {activeStrategy === "bazaar-flipping" && (
          <>
            {/* Overview Section */}
            <Card className="border">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted border">
                    <Shuffle className="h-6 w-6 text-emerald-400" />
                    </div>
                  <div>
                    <CardTitle className="text-2xl">Bazaar Flipping</CardTitle>
                    <CardDescription>The most reliable way to generate consistent profits</CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">How It Works</h3>
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      We built this to watch Bazaar prices and see how things are moving, then turn it into useful information. We look at <span className="text-emerald-300 font-medium">48 hours</span>, <span className="text-emerald-300 font-medium">6 hours</span>, and <span className="text-emerald-300 font-medium">1 hour</span> periods to understand what's normal and spot when something unusual happens.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      The score starts with <span className="text-emerald-300 font-medium">how much you'll make per hour</span> (after taxes), then we reduce it slightly for <span className="text-emerald-300 font-medium">risk factors</span> and when <span className="text-emerald-300 font-medium">too many people are competing</span>. Risk means prices that jump around, look suspicious, or have thin order books. Competition means how busy that item is.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Beyond the spread, we also check <span className="text-emerald-300 font-medium">how much people want to buy</span> and <span className="text-emerald-300 font-medium">how much people want to sell</span> per hour, so you know the flips will actually happen. We also watch <span className="text-emerald-300 font-medium">when orders get created</span> to see the busy times and slow times during the day.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      We suggest <span className="text-emerald-300 font-medium">how much to buy per hour</span> based on your budget and how fast things move, and we estimate how long it'll take to buy and sell everything so your 30-minute, 1-hour, or 6-hour plans make sense. You can turn off the risk or competition penalties on the flipping page if you just want to sort by pure profit.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Keep in mind: we won't always get it right. Big orders move prices around, and maintenance or events can affect the data. These are estimates to help you decide. You still need to place and manage the orders yourself. We can't reveal all the details of our scoring formula to maintain our competitive edge, but what we've shared gives you a solid understanding of how the system works.
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">How to Use It</h3>
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Start by setting your <span className="text-emerald-300 font-medium">budget</span> and <span className="text-emerald-300 font-medium">time horizon</span> (15 minutes to 1 week). The time horizon tells the system how long you plan to hold items, which affects the scoring, profit calculations, and helps estimate realistic completion times for your orders.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      You can use the trading presets for quick setup, or configure everything manually if you're into that. The presets are just shortcuts, you can always adjust the settings later. Manual configuration lets you fine-tune exactly how much risk and competition you're comfortable with.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      The results show <span className="text-emerald-300 font-medium">profit per hour</span>, <span className="text-emerald-300 font-medium">risk scores</span>, and <span className="text-emerald-300 font-medium">competition levels</span>. Use <span className="text-emerald-300 font-medium">recommended score</span> for balanced opportunities that consider risk and competition. Switch to <span className="text-emerald-300 font-medium">profit per hour</span> when you want to see raw profit potential regardless of risk.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Use the search to find specific items or filter by trading volume and risk. Lower volume items might have better spreads but take longer to fill. Toggle off <span className="text-emerald-300 font-medium">risk penalties</span> if you're comfortable with volatile prices and want to see maximum profit potential. Turn off <span className="text-emerald-300 font-medium">competition penalties</span> when you want to focus on profit rather than how many other people are flipping the same item.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Set your Bazaar tax rate (1.0% to 1.25%) for accurate profit calculations. The system automatically adjusts all the numbers based on your tax setting.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Getting Started Section */}
            <Card className="border">
              <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted border">
                      <Rocket className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <CardTitle>Getting Started</CardTitle>
                  </div>
              </CardHeader>

              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <Link href="/dashboard/strategies/flipping" className="block">
                     <Button className="w-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/30 hover:border-emerald-500/50 transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200">
                       <Shuffle className="h-4 w-4 mr-2" />
                       Try Bazaar Flipping
                       <ArrowRight className="h-4 w-4 ml-2" />
                     </Button>
                      </Link>
                  <Button variant="outline" className="w-full" title="Video tutorials coming soon! We're working on creating helpful guides to get you started with Bazaar flipping." onClick={() => setShowVideoPopup(true)}>
                    <Play className="h-4 w-4 mr-2" />
                    Video Tutorial
                    </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Craft Flipping Content */}
        {activeStrategy === "craft-flipping" && (
          <Card className="border">
            <CardContent className="p-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">Coming Soon</h2>
                <p className="text-muted-foreground">This strategy is currently in development. Check back later for updates.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* NPC Flipping Content */}
        {activeStrategy === "npc-flipping" && (
          <Card className="border">
            <CardContent className="p-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">Coming Soon</h2>
                <p className="text-muted-foreground">This strategy is currently in development. Check back later for updates.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bazaar Manipulation Content */}
        {activeStrategy === "bazaar-manipulation" && (
          <>
            <Card className="border">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted border">
                    <Crosshair className="h-6 w-6 text-rose-400" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">Bazaar Manipulation</CardTitle>
                    <CardDescription>Corner thin markets, set the price, and lure overpriced buy orders</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">How It Works</h3>
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      We look for items with <span className="text-rose-300 font-medium">thin supply</span> (few standing sell orders, low sell volume) but <span className="text-rose-300 font-medium">strong demand</span> (many buyers per hour). Those are the markets a single trader can corner.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      For each one we add up every visible sell offer to estimate the <span className="text-rose-300 font-medium">cost to buy out the whole market</span> and the average cost per unit. From there we compute your <span className="text-rose-300 font-medium">break-even resell price after tax</span>, a very-high <span className="text-rose-300 font-medium">sell wall</span> to make the item look valuable, and an <span className="text-rose-300 font-medium">inflated buy order</span> set to your target ROI so other players outbid you and you insta-sell into their overpriced orders.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      We also estimate how long it takes to offload your stock based on hourly demand, and how many times you&apos;ll need to double the current top bid to reach your inflated buy order.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      This is the highest-risk strategy we offer. It ties up large capital in one item and relies on demand holding. Use the budget filter so you only see markets you can fully corner, and only risk what you can afford to hold.
                    </p>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-4">How to Use It</h3>
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Set your <span className="text-rose-300 font-medium">max budget</span> and a <span className="text-rose-300 font-medium">target ROI</span> (2x is a sensible default — it aims to at least double your cornering capital). Pick your Bazaar <span className="text-rose-300 font-medium">tax rate</span> so the break-even math is accurate.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Sort by <span className="text-rose-300 font-medium">recommended score</span> for the best blend of profit and demand, or by total profit, demand/supply ratio, or cheapest to corner. Expand any card for the full step-by-step plan.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted border">
                    <Rocket className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <CardTitle>Getting Started</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <Link href="/dashboard/strategies/manipulation" className="block md:w-1/2">
                  <Button className="w-full bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border-rose-500/30 hover:border-rose-500/50 transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200">
                    <Crosshair className="h-4 w-4 mr-2" />
                    Try Bazaar Manipulation
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </>
        )}

        {/* Other strategies content would go here */}
        {!["bazaar-flipping", "craft-flipping", "npc-flipping", "bazaar-manipulation"].includes(activeStrategy) && (
          <Card className="border">
            <CardContent className="p-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">Coming Soon</h2>
                <p className="text-muted-foreground">This strategy is currently in development. Check back later for updates.</p>
                </div>
              </CardContent>
            </Card>
        )}
      </div>

             {/* FAQ Section - shown for released strategies with curated answers */}
             {(activeStrategy === "bazaar-flipping" || activeStrategy === "bazaar-manipulation") && (
               <StrategyFAQSection activeStrategy={activeStrategy} />
             )}


    {/* Video Tutorial Popup */}
    {showVideoPopup && (
      <VideoTutorialPopup onClose={() => setShowVideoPopup(false)} />
    )}
  </div>
  )
}

// Main component wrapped in Suspense
export default function TradingStrategiesPage() {
  return (
    <LoginCheck
      featureName="Trading Strategies"
      featureDescription="Professional tools to help you profit in the Hypixel SkyBlock market"
      icon={<TrendingUp className="h-8 w-8 text-muted-foreground" />}
    >
      <Suspense fallback={
        <div className="space-y-8">
          <div className="animate-pulse">
            <div className="h-32 bg-muted rounded-lg mb-8"></div>
            <div className="h-8 bg-muted rounded w-48 mb-4"></div>
            <div className="h-64 bg-muted rounded-lg"></div>
          </div>
        </div>
      }>
        <TradingStrategiesContent />
      </Suspense>
    </LoginCheck>
  )
}
