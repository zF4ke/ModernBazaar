"use client"

import { ReactNode } from 'react'
import { Coins, TrendingUp } from 'lucide-react'
import { FeatureCard } from '@/components/feature-card'
import { Label } from '@/components/ui/label'
import { LockedPreview } from '@/components/locked-preview'
import type { ManipulationOpportunity } from '@/types/strategies'
import { ManipulationCard } from './manipulation-card'

/* Example data: plausible thin markets. No riskNote fields (tooltips need a
   provider that the gates do not mount); one card is flagged risky for flavor. */
const EXAMPLE_PLAYS: ManipulationOpportunity[] = [
  {
    productId: 'TARANTULA_SILK', displayName: 'Tarantula Silk',
    instantBuyPrice: 4_120, instantSellPrice: 3_580, currentHighestBuyOrder: 3_610,
    cornerSupplyUnits: 4_860, cornerCost: 19_960_000, avgBuyCostPerUnit: 4_107,
    taxRate: 0.01125, minResellPrice: 4_154, roi: 1.92, targetBuyOrderPrice: 14_440,
    suggestedSellOrderPrice: 28_900, buyOrderDoublingSteps: 2,
    demandPerHour: 310, supplyPerHour: 84, demandSupplyRatio: 3.7,
    activeSellOrders: 42, activeBuyOrders: 118, createdBuyOrdersPerHour: 5.2, createdSellOrdersPerHour: 1.4,
    buyOrderUnitsPerHour: 1_240, sellPressureUnitsPerHour: 130, bidUpMovesPerHour: 4.1,
    flipperAttentionScore: 0.62, flipperProfitPerHour: 820_000, sellVolume: 9_400, buyVolume: 31_800,
    netProfitPerUnit: 7_860, totalProfit: 38_200_000, estimatedSellThroughHours: 5.4, score: 11.2,
  },
  {
    productId: 'WOLF_TOOTH', displayName: 'Wolf Tooth',
    instantBuyPrice: 1_890, instantSellPrice: 1_540, currentHighestBuyOrder: 1_565,
    cornerSupplyUnits: 7_420, cornerCost: 13_910_000, avgBuyCostPerUnit: 1_875,
    taxRate: 0.01125, minResellPrice: 1_897, roi: 1.61, targetBuyOrderPrice: 6_260,
    suggestedSellOrderPrice: 12_500, buyOrderDoublingSteps: 2,
    demandPerHour: 190, supplyPerHour: 66, demandSupplyRatio: 2.9,
    activeSellOrders: 58, activeBuyOrders: 96, createdBuyOrdersPerHour: 3.8, createdSellOrdersPerHour: 1.9,
    buyOrderUnitsPerHour: 760, sellPressureUnitsPerHour: 210, bidUpMovesPerHour: 2.6,
    flipperAttentionScore: 0.48, flipperProfitPerHour: 410_000, sellVolume: 12_100, buyVolume: 22_400,
    netProfitPerUnit: 3_030, totalProfit: 22_500_000, estimatedSellThroughHours: 7.8, score: 10.4,
  },
  {
    productId: 'ENCHANTED_GRILLED_PORK', displayName: 'Enchanted Grilled Pork',
    instantBuyPrice: 8_340, instantSellPrice: 7_150, currentHighestBuyOrder: 7_210,
    cornerSupplyUnits: 1_980, cornerCost: 16_520_000, avgBuyCostPerUnit: 8_343,
    taxRate: 0.01125, minResellPrice: 8_438, roi: 1.34, targetBuyOrderPrice: 28_840,
    suggestedSellOrderPrice: 57_700, buyOrderDoublingSteps: 2,
    demandPerHour: 105, supplyPerHour: 47, demandSupplyRatio: 2.2,
    activeSellOrders: 31, activeBuyOrders: 64, createdBuyOrdersPerHour: 2.9, createdSellOrdersPerHour: 2.4,
    buyOrderUnitsPerHour: 420, sellPressureUnitsPerHour: 260, bidUpMovesPerHour: 1.8, risky: true,
    flipperAttentionScore: 0.35, flipperProfitPerHour: 260_000, sellVolume: 6_900, buyVolume: 11_300,
    netProfitPerUnit: 11_180, totalProfit: 22_100_000, estimatedSellThroughHours: 11.2, score: 9.1,
  },
  {
    productId: 'SHARK_FIN', displayName: 'Shark Fin',
    instantBuyPrice: 12_460, instantSellPrice: 10_870, currentHighestBuyOrder: 10_920,
    cornerSupplyUnits: 1_140, cornerCost: 14_200_000, avgBuyCostPerUnit: 12_456,
    taxRate: 0.01125, minResellPrice: 12_601, roi: 1.18, targetBuyOrderPrice: 43_680,
    suggestedSellOrderPrice: 87_400, buyOrderDoublingSteps: 2,
    demandPerHour: 76, supplyPerHour: 39, demandSupplyRatio: 1.9,
    activeSellOrders: 24, activeBuyOrders: 51, createdBuyOrdersPerHour: 2.2, createdSellOrdersPerHour: 1.1,
    buyOrderUnitsPerHour: 310, sellPressureUnitsPerHour: 90, bidUpMovesPerHour: 1.4,
    flipperAttentionScore: 0.29, flipperProfitPerHour: 190_000, sellVolume: 4_200, buyVolume: 8_600,
    netProfitPerUnit: 14_690, totalProfit: 16_700_000, estimatedSellThroughHours: 9.6, score: 8.7,
  },
]

const noop = () => {}

/**
 * The locked Manipulation page: an inert setup bar, then the plays grid with
 * example data behind the paywall scrim. Real card component, real look.
 */
export function ManipulationPreview({ cta }: { cta: ReactNode }) {
  return (
    <div className="space-y-6">
      <div aria-hidden className="pointer-events-none select-none">
        <FeatureCard>
          <div className="mb-5 space-y-1">
            <div className="text-lg font-semibold leading-none tracking-tight">Manipulation Setup</div>
            <p className="text-sm text-muted-foreground">Set your budget and target return to find corner-able markets</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium"><Coins className="h-4 w-4 text-muted-foreground" />Your Budget</Label>
              <div className="flex h-12 items-center rounded-md border border-input px-3 font-mono text-base">50,000,000</div>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium"><TrendingUp className="h-4 w-4 text-muted-foreground" />Target Return</Label>
              <div className="flex h-12 items-center rounded-md border border-input px-3 text-sm">2x invested coins</div>
            </div>
          </div>
        </FeatureCard>
      </div>

      <LockedPreview cta={cta}>
        <div className="space-y-4">
          <div className="flex items-end justify-between">
            <h2 className="text-xl font-semibold tracking-tight">Corner-able markets (50)</h2>
            <span className="text-sm text-muted-foreground">Ranked by score</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {EXAMPLE_PLAYS.map((o) => (
              <ManipulationCard
                key={o.productId}
                o={o}
                fav={false}
                onToggleFav={noop}
                expandedCard={null}
                setExpandedCard={noop}
              />
            ))}
          </div>
        </div>
      </LockedPreview>
    </div>
  )
}
