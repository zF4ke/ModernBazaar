"use client"

import Link from "next/link"
import { 
  TrendingUp, 
  Hammer, 
  Coins, 
  ArrowRightLeft, 
  Clock,
  Target,
  Zap,
  BarChart3,
  ChevronRight,
  Star,
  Info,
  Activity,
  Shield,
  Compass
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

const strategies = [
  {
    id: "flipping",
    title: "Bazaar Flipping",
    description: "Discover quick buy/sell opportunities with intelligent scoring and risk assessment.",
    icon: ArrowRightLeft,
    status: "active",
    href: "/dashboard/strategies/flipping",
    features: ["Real-time opportunities", "Risk scoring", "Profit calculations", "ETA predictions"],
    color: "emerald"
  },
  {
    id: "craft-flipping",
    title: "Craft Flipping",
    description: "Profit from crafting items by analyzing material costs vs. final product prices.",
    icon: Hammer,
    status: "coming-soon",
    features: ["Recipe analysis", "Material cost tracking", "Profit margins", "Crafting time optimization"],
    color: "blue"
  },
  {
    id: "npc-flipping",
    title: "NPC Flipping",
    description: "Maximize profits from the 200M daily NPC limit by finding the highest margin items.",
    icon: Coins,
    status: "coming-soon",
    features: ["NPC price tracking", "Margin optimization", "Daily limit management", "Profit maximization"],
    color: "amber"
  },
  {
    id: "bazaar-manipulation",
    title: "Bazaar Manipulation",
    description: "Set market prices and manipulate supply to create profitable opportunities. High risk, high reward.",
    icon: Shield,
    status: "planned",
    features: ["Price setting", "Supply manipulation", "Market control", "Risk management"],
    color: "purple"
  }
]

export default function StrategiesLandingPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Compass className="h-8 w-8 text-muted-foreground" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Trading Strategies</h1>
              <p className="text-muted-foreground">Discover profitable trading opportunities with data-driven strategies</p>
            </div>
          </div>
          <Badge variant="outline" className="px-3 py-1">
            <Activity className="h-3 w-3 mr-1" />
            Live Market Data
          </Badge>
        </div>
      </div>



      {/* Strategy Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {strategies.map((strategy) => {
          const IconComponent = strategy.icon
          const isActive = strategy.status === "active"
          const isComingSoon = strategy.status === "coming-soon"
          const isPlanned = strategy.status === "planned"
          
          const colorMap = {
            emerald: {
              icon: "text-emerald-400",
              badge: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
              gradient: "from-emerald-500/5 to-emerald-600/5"
            },
            blue: {
              icon: "text-blue-400", 
              badge: "bg-blue-500/10 text-blue-300 border-blue-500/20",
              gradient: "from-blue-500/5 to-blue-600/5"
            },
            amber: {
              icon: "text-amber-400",
              badge: "bg-amber-500/10 text-amber-300 border-amber-500/20", 
              gradient: "from-amber-500/5 to-amber-600/5"
            },
            purple: {
              icon: "text-purple-400",
              badge: "bg-purple-500/10 text-purple-300 border-purple-500/20",
              gradient: "from-purple-500/5 to-purple-600/5"
            }
          }
          
          const colors = colorMap[strategy.color as keyof typeof colorMap]
          
          return (
            <Card 
              key={strategy.id}
              className={`transition-all duration-200 hover:shadow-lg ${
                isActive ? `bg-gradient-to-br ${colors.gradient} hover:shadow-xl` : 'opacity-75 hover:opacity-100'
              }`}
            >
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${colors.badge}`}>
                    <IconComponent className={`h-6 w-6 ${colors.icon}`} />
                  </div>
                  <div>
                    <CardTitle className="text-xl">{strategy.title}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      {isActive && (
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-300 border-emerald-500/20">
                          <Zap className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      )}
                      {isComingSoon && (
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-300 border-amber-500/20">
                          <Clock className="h-3 w-3 mr-1" />
                          Coming Soon
                        </Badge>
                      )}
                      {isPlanned && (
                        <Badge variant="outline" className="bg-slate-500/10 text-slate-300 border-slate-500/20">
                          <Info className="h-3 w-3 mr-1" />
                          Planned
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <CardDescription className="text-base leading-relaxed">
                  {strategy.description}
                </CardDescription>
                
                {/* Features */}
                <div className="space-y-2">
                  <p className="text-sm font-medium">Key Features:</p>
                  <div className="grid grid-cols-2 gap-1">
                    {strategy.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Star className="h-3 w-3" />
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Action Button */}
                <div className="pt-2">
                  {isActive ? (
                    <Button asChild className="w-full group bg-emerald-600 hover:bg-emerald-700">
                      <Link href={strategy.href!}>
                        Start Trading
                        <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                      </Link>
                    </Button>
                  ) : (
                    <Button disabled variant="outline" className="w-full">
                      {isComingSoon ? "Coming Soon" : "In Development"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>


    </div>
  )
}

