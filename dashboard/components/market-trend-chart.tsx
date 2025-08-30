"use client"

import { useMemo } from "react"
import ReactECharts from "echarts-for-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, BarChart3, DollarSign, Activity, Target } from "lucide-react"
import { useBackendQuery } from "@/hooks/use-backend-query"
import type { BazaarItemsResponse } from "@/types/bazaar"

interface MarketInsightCardProps {
  title: string
  description?: string
  className?: string
  metric: 'activity' | 'opportunities' | 'volatility'
}

export function MarketInsightCard({ title, description, className, metric }: MarketInsightCardProps) {
  // Get real data - top items sorted by spread for opportunities
  const { data: itemsData, isLoading } = useBackendQuery<BazaarItemsResponse>(
    '/api/bazaar/items?limit=10&sort=spread',
    {
      refetchInterval: 300000, // Refresh every 5 minutes
      queryKey: ['market-insights', metric],
      requireAuth: true
    }
  )

  const insightData = useMemo(() => {
    if (!itemsData?.items?.length) return null

    const items = itemsData.items.slice(0, 10)
    
    switch (metric) {
      case 'opportunities': {
        // Count items with good profit potential
        const profitableCount = items.filter(item => {
          const snapshot = item.snapshot
          const hourSummary = item.lastHourSummary
          const buyPrice = snapshot?.instantBuyPrice || hourSummary?.closeInstantBuyPrice || 0
          const sellPrice = snapshot?.instantSellPrice || hourSummary?.closeInstantSellPrice || 0
          const margin = sellPrice > 0 ? ((buyPrice - sellPrice) / sellPrice) * 100 : 0
          return margin > 1 // More than 1% profit
        }).length
        
        return {
          value: profitableCount,
          maxValue: 10,
          percentage: (profitableCount / 10) * 100,
          trend: profitableCount > 5 ? 'up' : profitableCount < 3 ? 'down' : 'neutral',
          color: '#10b981',
          label: 'Good Opportunities',
          suffix: `/10 items`
        }
      }
      
      case 'activity': {
        // Calculate average market activity based on order counts
        const totalActivity = items.reduce((sum, item) => {
          const snapshot = item.snapshot
          if (!snapshot) return sum
          return sum + (snapshot.activeBuyOrdersCount + snapshot.activeSellOrdersCount)
        }, 0)
        
        const avgActivity = Math.round(totalActivity / items.length)
        
        return {
          value: avgActivity,
          maxValue: 1000,
          percentage: Math.min((avgActivity / 500) * 100, 100),
          trend: avgActivity > 300 ? 'up' : avgActivity < 100 ? 'down' : 'neutral',
          color: '#3b82f6',
          label: 'Avg Active Orders',
          suffix: ' orders'
        }
      }
      
      case 'volatility': {
        // Calculate price volatility based on buy/sell spread
        const spreads = items.map(item => {
          const snapshot = item.snapshot
          const hourSummary = item.lastHourSummary
          const buyPrice = snapshot?.instantBuyPrice || hourSummary?.closeInstantBuyPrice || 0
          const sellPrice = snapshot?.instantSellPrice || hourSummary?.closeInstantSellPrice || 0
          return sellPrice > 0 ? Math.abs(buyPrice - sellPrice) : 0
        }).filter(spread => spread > 0)
        
        const avgSpread = spreads.length > 0 ? spreads.reduce((a, b) => a + b, 0) / spreads.length : 0
        const volatilityScore = Math.min(Math.round((avgSpread / 100) * 100), 100)
        
        return {
          value: volatilityScore,
          maxValue: 100,
          percentage: volatilityScore,
          trend: volatilityScore > 60 ? 'up' : volatilityScore < 30 ? 'down' : 'neutral',
          color: '#f59e0b',
          label: 'Price Volatility',
          suffix: '/100'
        }
      }
      
      default:
        return null
    }
  }, [itemsData, metric])

  if (isLoading || !insightData) {
    return null // Don't show anything if no data
  }

  const TrendIcon = insightData.trend === 'up' ? TrendingUp : insightData.trend === 'down' ? TrendingDown : Activity
  const trendColor = insightData.trend === 'up' ? 'text-green-600 dark:text-green-400' : 
                    insightData.trend === 'down' ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'
  
  const MetricIcon = metric === 'opportunities' ? Target : metric === 'activity' ? BarChart3 : DollarSign

  return (
    <Card className={`${className} hover:shadow-md transition-shadow`}>
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MetricIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{title}</span>
            </div>
            <TrendIcon className={`h-3 w-3 ${trendColor}`} />
          </div>
          
          <div className="space-y-1">
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold">
                {insightData.value}
              </span>
              <span className="text-sm text-muted-foreground">
                {insightData.suffix}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
