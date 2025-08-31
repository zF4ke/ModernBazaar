"use client"

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { 
  TrendingUp, 
  BarChart3, 
  Target, 
  Zap, 
  BookOpen, 
  ExternalLink, 
  ArrowRight,
  Lightbulb,
  Shield,
  Clock,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Info,
  Hammer, 
  Coins, 
  Star,
  ChevronRight,
  Play,
  FileText,
  Users,
  BarChart,
  TrendingDown,
  Settings,
  Eye,
  Shuffle,
  Rocket
} from "lucide-react"
import Link from "next/link"
import { GradientSection } from '@/components/gradient-section'

const strategies = [
  {
    id: "bazaar-flipping",
    title: "Bazaar Flipping",
    description: "Buy low, sell high on the Hypixel Bazaar. The most reliable way to generate consistent profits.",
    icon: Shuffle,
    status: "released",
    href: "/dashboard/strategies/flipping",
    color: "emerald"
  },
  {
    id: "craft-flipping",
    title: "Craft Flipping",
    description: "Profit from crafting items by analyzing material costs vs. final product prices.",
    icon: Hammer,
    status: "coming-soon",
    href: "#",
    color: "blue"
  },
  {
    id: "npc-flipping",
    title: "NPC Flipping",
    description: "Maximize profits from the 200M daily NPC limit by finding the highest margin items.",
    icon: Coins,
    status: "coming-soon",
    href: "#",
    color: "amber"
  },
  {
    id: "bazaar-manipulation",
    title: "Bazaar Manipulation",
    description: "Set market prices and manipulate supply to create profitable opportunities. High risk, high reward.",
    icon: Shield,
    status: "planned",
    href: "#",
    color: "rose"
  },
  {
    id: "budget-planner",
    title: "Budget Planner",
    description: "Allocate coins across strategies with risk-adjusted projections.",
    icon: DollarSign,
    status: "planned",
    href: "#",
    color: "rose"
  },
  {
    id: "auction-house",
    title: "Auction House",
    description: "Snipe underpriced items and flip them for profit. Requires quick reflexes and market knowledge.",
    icon: BarChart3,
    status: "planned",
    href: "#",
    color: "purple"
  }
]

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

// FAQ data for different strategies
const getFAQData = (strategyId: string) => {
  switch (strategyId) {
    case "bazaar-flipping":
      return [
        {
          question: "How does the scoring system work?",
          answer: "Our scoring formula starts with profit per hour, then applies small penalties for risk (volatile prices, suspicious jumps) and competition (how many people are flipping the same item). The system also considers demand/supply per hour and order creation rates. We can't reveal all the formula details to maintain our competitive edge, but this gives you the key concepts."
        },
        {
          question: "What do the risk percentages mean?",
          answer: "Risk percentages show how much the scoring system reduces an item's score due to price volatility. Higher percentages mean the system thinks prices are jumping around, look manipulated, or have thin order books. You can toggle off risk penalties if you're comfortable with volatility."
        },
        {
          question: "How do I interpret competition levels?",
          answer: "Competition per hour shows how busy an item is. Lower numbers mean fewer people are trying to flip it, which usually means better opportunities. Higher competition means more people competing for the same profits."
        },
        {
          question: "What's the difference between the trading presets?",
          answer: "Fast (30min) maximizes profit per hour and disables risk penalties. Default (1h) balances profit with safety. Stable (6h) focuses on items with stable prices so you can hold them longer and be confident the prices won't change much, ensuring you still make profit even after several hours."
        }
      ]
    case "craft-flipping":
      return [
        {
          question: "How do I calculate crafting costs?",
          answer: "Our tools will automatically calculate total material costs by analyzing current market prices for all required ingredients."
        },
        {
          question: "What's a good profit margin for crafting?",
          answer: "Aim for at least 15-20% profit margin after accounting for material costs and time investment."
        },
        {
          question: "Which items are best for craft flipping?",
          answer: "Focus on items with consistent material availability and stable end-product demand."
        },
        {
          question: "How do I track material prices?",
          answer: "We'll provide real-time monitoring of material costs to help you time your purchases optimally."
        }
      ]
    case "npc-flipping":
      return [
        {
          question: "What's the daily NPC limit?",
          answer: "You can sell up to 200 million coins worth of items to NPCs per day."
        },
        {
          question: "How do I find the best NPC margins?",
          answer: "Compare fixed NPC buy prices with current market prices to identify items with the highest profit potential."
        },
        {
          question: "Which items have the best NPC margins?",
          answer: "Common drops and materials often have the best margins since NPCs pay fixed prices regardless of market conditions."
        },
        {
          question: "When should I sell to NPCs?",
          answer: "Sell to NPCs when market prices are low or when you need quick liquidity."
        }
      ]
    default:
      return [
        {
          question: "When will this strategy be available?",
          answer: "This strategy is currently in development. Check back later for updates and release information."
        },
        {
          question: "What features are planned?",
          answer: "We're working on comprehensive tools and analysis features. Stay tuned for announcements."
        },
        {
          question: "Can I suggest features?",
          answer: "Yes! We welcome feedback and suggestions for improving our trading tools."
        },
        {
          question: "How do I stay updated?",
          answer: "Check our dashboard regularly for updates on strategy development and new features."
        }
      ]
  }
}

export default function TradingStrategiesPage() {
  const [activeStrategy, setActiveStrategy] = useState("bazaar-flipping")
  const searchParams = useSearchParams()
  const [showVideoPopup, setShowVideoPopup] = useState(false)

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
      <div className="flex flex-wrap gap-2">
        {strategies.map((strategy) => {
          const IconComponent = strategy.icon
          const isActive = activeStrategy === strategy.id
          const isReleased = strategy.status === "released"
          const isComingSoon = strategy.status === "coming-soon"
          const isPlanned = strategy.status === "planned"
          
          return (
            <button
              key={strategy.id}
              onClick={() => setActiveStrategy(strategy.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-200 ${
                isActive 
                  ? 'bg-card border-border text-foreground shadow-lg' 
                  : 'bg-muted/50 border-border/50 text-muted-foreground hover:bg-muted hover:border-border hover:text-foreground'
              }`}
            >
              <IconComponent className="h-4 w-4" />
              <span className="text-sm font-medium">{strategy.title}</span>
                {isReleased && (
                 <Badge className="ml-1 bg-green-500/20 text-green-400 border-green-500/40 text-xs pointer-events-none">
                          <Zap className="h-3 w-3 mr-1" />
                   Live
                        </Badge>
                      )}
                      {isComingSoon && (
                 <Badge className="ml-1 bg-muted text-muted-foreground border-border text-xs pointer-events-none">
                          <Clock className="h-3 w-3 mr-1" />
                   Soon
                        </Badge>
                      )}
                      {isPlanned && (
                 <Badge className="ml-1 bg-muted text-muted-foreground border-border text-xs pointer-events-none">
                          <Info className="h-3 w-3 mr-1" />
                          Planned
                        </Badge>
                      )}
            </button>
          )
        })}
      </div>

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
                       <Target className="h-4 w-4 mr-2" />
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

        {/* Other strategies content would go here */}
        {!["bazaar-flipping", "craft-flipping", "npc-flipping"].includes(activeStrategy) && (
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

             {/* FAQ Section - Only show for Bazaar Flipping */}
             {activeStrategy === "bazaar-flipping" && (
               <Card className="border">
                 <CardHeader className="pb-4">
                   <div className="flex items-center gap-3">
                     <div className="p-2 rounded-lg bg-muted border">
                       <Lightbulb className="h-6 w-6 text-muted-foreground" />
                     </div>
                     <CardTitle>Frequently Asked Questions</CardTitle>
                   </div>
                 </CardHeader>
                 
                 <CardContent>
                   <div className="grid md:grid-cols-2 gap-6">
                     {getFAQData(activeStrategy).slice(0, 2).map((faq, index) => (
                       <div key={index} className="space-y-4">
                         <div className="p-4 rounded-lg bg-muted/50 border">
                           <h4 className="font-medium mb-2">{faq.question}</h4>
                           <p className="text-sm text-muted-foreground">{faq.answer}</p>
                         </div>
                       </div>
                     ))}
                     
                     {getFAQData(activeStrategy).slice(2, 4).map((faq, index) => (
                       <div key={index + 2} className="space-y-4">
                         <div className="p-4 rounded-lg bg-muted/50 border">
                           <h4 className="font-medium mb-2">{faq.question}</h4>
                           <p className="text-sm text-muted-foreground">{faq.answer}</p>
                         </div>
                       </div>
                     ))}
    </div>
                 </CardContent>
               </Card>
             )}

             
    {/* Video Tutorial Popup */}
    {showVideoPopup && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-card border rounded-lg p-6 max-w-md mx-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-muted border">
              <Play className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">Video Tutorials</h3>
          </div>
          <p className="text-muted-foreground mb-6">
            We're working on creating helpful video guides to get you started with Bazaar flipping. 
            For now, check out the "How It Works" and "How to Use It" sections above, or jump 
            straight into the flipping tool to explore the features yourself.
          </p>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => setShowVideoPopup(false)}
              className="flex-1"
            >
              Close
            </Button>
            <Button 
              onClick={() => {
                setShowVideoPopup(false)
                window.location.href = '/dashboard/strategies/flipping'
              }}
              className="flex-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/30 hover:border-emerald-500/50 transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 text-sm"
            >
              Try It Now
            </Button>
          </div>
        </div>
      </div>
    )}
</div>
)}