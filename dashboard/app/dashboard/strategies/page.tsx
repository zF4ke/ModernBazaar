"use client"

import { useState } from 'react'
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
  Shuffle
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
          question: "What's the minimum investment for Bazaar flipping?",
          answer: "You can start with as little as 1,000 coins, but we recommend at least 10,000 coins for meaningful profits. Start small and scale up as you gain experience."
        },
        {
          question: "How often should I check for opportunities?",
          answer: "For active flipping, check every 15-30 minutes. For long-term investments, daily monitoring is sufficient. Use our real-time alerts to stay informed without constant checking."
        },
        {
          question: "What are the best items to flip?",
          answer: "High-volume items like enchanted materials, potion ingredients, and common drops tend to have consistent spreads. Avoid low-liquidity items that are hard to sell quickly."
        },
        {
          question: "How do I manage risk?",
          answer: "Never invest more than you can afford to lose, diversify across multiple items, and monitor market conditions. Start with small amounts until you understand the market better."
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
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                                         <h3 className="text-lg font-semibold mb-3">How It Works</h3>
                     <div className="space-y-3">
                       <IconTextSection
                         icon={DollarSign}
                         title="Find Opportunities"
                         description="Identify items with significant buy/sell spreads"
                       />
                       <IconTextSection
                         icon={Zap}
                         title="Execute Trades"
                         description="Buy at lowest sell price, sell at highest buy price"
                       />
                       <IconTextSection
                         icon={TrendingUp}
                         title="Profit"
                         description="Earn the difference minus Bazaar fees"
                       />
                     </div>
                  </div>
                  
                                     <div>
                     <h3 className="text-lg font-semibold mb-3">Key Features</h3>
                     <div className="space-y-2">
                       <div className="flex items-center gap-2 text-sm">
                         <CheckCircle className="h-4 w-4 text-emerald-400" />
                         Live Bazaar price monitoring with buy/sell spreads
                       </div>
                       <div className="flex items-center gap-2 text-sm">
                         <CheckCircle className="h-4 w-4 text-emerald-400" />
                         Profit calculation including 1% Bazaar fees
                       </div>
                       <div className="flex items-center gap-2 text-sm">
                         <CheckCircle className="h-4 w-4 text-emerald-400" />
                         Item volume and liquidity indicators
                       </div>
                       <div className="flex items-center gap-2 text-sm">
                         <CheckCircle className="h-4 w-4 text-emerald-400" />
                         Quick buy/sell execution tools
                       </div>
                       <div className="flex items-center gap-2 text-sm">
                         <CheckCircle className="h-4 w-4 text-emerald-400" />
                         Market trend analysis and insights
                       </div>
                     </div>
                   </div>
                </div>
              </CardContent>
            </Card>

            {/* Risk Management Section */}
            <Card className="border">
              <CardHeader className="pb-4">
                                 <div className="flex items-center gap-3">
                   <div className="p-2 rounded-lg bg-muted border">
                     <Shield className="h-6 w-6 text-muted-foreground" />
                   </div>
                   <CardTitle>Risk Management</CardTitle>
                 </div>
              </CardHeader>
              
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                                     <div className="space-y-3">
                     <div className="p-3 rounded-lg bg-muted/50 border">
                       <h4 className="font-medium text-foreground mb-2">Investment Limits</h4>
                       <p className="text-sm text-muted-foreground">Never invest more than you can afford to lose. Start small and scale up as you gain experience.</p>
                     </div>
                     <div className="p-3 rounded-lg bg-muted/50 border">
                       <h4 className="font-medium text-foreground mb-2">Diversification</h4>
                       <p className="text-sm text-muted-foreground">Spread your investments across multiple items to reduce risk and increase stability.</p>
                     </div>
                   </div>
                   
                   <div className="space-y-3">
                     <div className="p-3 rounded-lg bg-muted/50 border">
                       <h4 className="font-medium text-foreground mb-2">Market Monitoring</h4>
                       <p className="text-sm text-muted-foreground">Stay informed about market conditions and adjust your strategies accordingly.</p>
                     </div>
                     <div className="p-3 rounded-lg bg-muted/50 border">
                       <h4 className="font-medium text-foreground mb-2">Fee Awareness</h4>
                       <p className="text-sm text-muted-foreground">Remember that Bazaar charges 1% on all transactions, which affects your profit margins.</p>
                     </div>
                   </div>
                </div>
              </CardContent>
            </Card>

            {/* Getting Started Section */}
            <Card className="border">
              <CardHeader className="pb-4">
                                 <div className="flex items-center gap-3">
                   <div className="p-2 rounded-lg bg-muted border">
                     <BookOpen className="h-6 w-6 text-muted-foreground" />
                   </div>
                   <CardTitle>Getting Started</CardTitle>
                 </div>
              </CardHeader>
              
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <Link href="/dashboard/strategies/flipping" className="block">
                    <Button className="w-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/30 hover:border-emerald-500/50">
                      <Target className="h-4 w-4 mr-2" />
                      Try Bazaar Flipping
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                      </Link>
                  <Button variant="outline" className="w-full">
                    <FileText className="h-4 w-4 mr-2" />
                    Documentation
                    </Button>
                  <Button variant="outline" className="w-full">
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
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted border">
                  <Hammer className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Craft Flipping</CardTitle>
                  <CardDescription>Profit from crafting items by analyzing material costs vs. final product prices</CardDescription>
                </div>
                <Badge className="ml-auto bg-muted text-muted-foreground border-border pointer-events-none">
                  <Clock className="h-3 w-3 mr-1" />
                  Coming Soon
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                                     <h3 className="text-lg font-semibold mb-3">How It Works</h3>
                   <div className="space-y-3">
                     <IconTextSection
                       icon={BarChart}
                       title="Recipe Analysis"
                       description="Calculate total material costs for any craftable item"
                       iconBgColor="bg-blue-500/20"
                       iconColor="text-blue-400"
                     />
                     <IconTextSection
                       icon={DollarSign}
                       title="Profit Calculation"
                       description="Compare material costs vs. final product market price"
                       iconBgColor="bg-blue-500/20"
                       iconColor="text-blue-400"
                     />
                     <IconTextSection
                       icon={Settings}
                       title="Optimization"
                       description="Find the most profitable crafting opportunities"
                       iconBgColor="bg-blue-500/20"
                       iconColor="text-blue-400"
                     />
                   </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold mb-3">Planned Features</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-blue-400" />
                      Recipe database with all craftable items
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-blue-400" />
                      Real-time material price tracking
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-blue-400" />
                      Profit margin calculations
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-blue-400" />
                      Crafting time optimization
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-blue-400" />
                      Bulk crafting analysis
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-4 rounded-lg bg-muted/50 border">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-400 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-200">Coming Soon</h4>
                    <p className="text-sm text-muted-foreground">
                      Craft Flipping tools are currently in development. This will include comprehensive recipe analysis, 
                      material cost tracking, and profit optimization features to help you maximize your crafting profits.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* NPC Flipping Content */}
        {activeStrategy === "npc-flipping" && (
          <Card className="border">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted border">
                  <Coins className="h-6 w-6 text-amber-400" />
                </div>
                <div>
                  <CardTitle className="text-2xl">NPC Flipping</CardTitle>
                  <CardDescription>Maximize profits from the 200M daily NPC limit by finding the highest margin items</CardDescription>
                </div>
                <Badge className="ml-auto bg-muted text-muted-foreground border-border pointer-events-none">
                  <Clock className="h-3 w-3 mr-1" />
                  Coming Soon
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                                     <h3 className="text-lg font-semibold mb-3">How It Works</h3>
                   <div className="space-y-3">
                     <IconTextSection
                       icon={Eye}
                       title="NPC Price Tracking"
                       description="Monitor fixed NPC buy prices for all items"
                       iconBgColor="bg-amber-500/20"
                       iconColor="text-amber-400"
                     />
                     <IconTextSection
                       icon={BarChart}
                       title="Margin Analysis"
                       description="Calculate profit margins vs. market prices"
                       iconBgColor="bg-amber-500/20"
                       iconColor="text-amber-400"
                     />
                     <IconTextSection
                       icon={Users}
                       title="Daily Limit Management"
                       description="Track and optimize your 200M daily limit usage"
                       iconBgColor="bg-amber-500/20"
                       iconColor="text-amber-400"
                     />
                   </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold mb-3">Planned Features</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-amber-400" />
                      Real-time NPC price monitoring
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-amber-400" />
                      Profit margin calculations
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-amber-400" />
                      Daily limit tracking
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-amber-400" />
                      Market price comparisons
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-amber-400" />
                      Automated profit alerts
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-4 rounded-lg bg-muted/50 border">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-amber-400 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-amber-200">Coming Soon</h4>
                    <p className="text-sm text-muted-foreground">
                      NPC Flipping tools are currently in development. This will help you maximize your daily NPC limit 
                      by identifying the most profitable items to sell to NPCs based on current market conditions.
                    </p>
                  </div>
                </div>
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

             {/* FAQ Section */}
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
    </div>
  )
}

