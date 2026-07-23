"use client"

import { ReactNode } from 'react'
import { Coins, Timer, Calculator, Target, Trophy, Zap, Mountain } from 'lucide-react'
import { FeatureCard } from '@/components/feature-card'
import { Label } from '@/components/ui/label'
import { LockedPreview } from '@/components/locked-preview'
import type { FlipOpportunity } from '@/types/strategies'
import { OpportunityCard } from './opportunity-card'

/* Example data: plausible SkyBlock flips, so the preview looks like the real
   instrument and not like lorem ipsum. No riskNote fields (tooltips need a
   provider that the gates do not mount). */
const EXAMPLE_FLIPS: FlipOpportunity[] = [
  {
    productId: 'ENCHANTED_ENDER_PEARL', displayName: 'Enchanted Ender Pearl',
    instantBuyPrice: 26_842, instantSellPrice: 24_120, buyOrderPrice: 24_310, sellOrderPrice: 26_650,
    spread: 2_340, spreadPct: 0.096, demandPerHour: 148, supplyPerHour: 121, competitionPerHour: 6,
    suggestedUnitsPerHour: 74, reasonableProfitPerHour: 2_354_498, riskScore: 0.12, score: 10.9,
    suggestedBuyFillHours: 0.6, suggestedSellFillHours: 0.9, suggestedTotalFillHours: 1.5,
  },
  {
    productId: 'BOOSTER_COOKIE', displayName: 'Booster Cookie',
    instantBuyPrice: 1_928_737, instantSellPrice: 1_704_200, buyOrderPrice: 1_730_000, sellOrderPrice: 1_918_500,
    spread: 188_500, spreadPct: 0.109, demandPerHour: 12, supplyPerHour: 10, competitionPerHour: 11,
    suggestedUnitsPerHour: 8, reasonableProfitPerHour: 1_329_944, riskScore: 0.11, score: 10.8,
    suggestedBuyFillHours: 0.7, suggestedSellFillHours: 0.6, suggestedTotalFillHours: 1.3,
  },
  {
    productId: 'TIGER_SHARK_TOOTH', displayName: 'Tiger Shark Tooth',
    instantBuyPrice: 70_291, instantSellPrice: 52_100, buyOrderPrice: 52_337, sellOrderPrice: 70_100,
    spread: 17_763, spreadPct: 0.34, demandPerHour: 70, supplyPerHour: 83, competitionPerHour: 6,
    suggestedUnitsPerHour: 69, reasonableProfitPerHour: 1_059_182, riskScore: 0.13, score: 10.7,
    suggestedBuyFillHours: 0.8, suggestedSellFillHours: 1.0, suggestedTotalFillHours: 1.8,
  },
  {
    productId: 'ENCHANTED_LAPIS_BLOCK', displayName: 'Enchanted Lapis Block',
    instantBuyPrice: 21_540, instantSellPrice: 18_890, buyOrderPrice: 19_020, sellOrderPrice: 21_400,
    spread: 2_380, spreadPct: 0.125, demandPerHour: 96, supplyPerHour: 104, competitionPerHour: 4,
    suggestedUnitsPerHour: 51, reasonableProfitPerHour: 812_360, riskScore: 0.09, score: 10.2,
    suggestedBuyFillHours: 0.5, suggestedSellFillHours: 0.7, suggestedTotalFillHours: 1.2,
  },
]

const noop = () => {}

/**
 * The locked Flipping page: a crisp (but inert) setup bar so the shape of the
 * tool reads instantly, then the opportunity grid with example data behind the
 * paywall scrim. Uses the REAL card component so what you see is what you get.
 */
export function FlippingPreview({ cta }: { cta: ReactNode }) {
  return (
    <div className="space-y-6">
      <div aria-hidden className="pointer-events-none select-none">
        <FeatureCard>
          <div className="mb-5 space-y-1">
            <div className="text-lg font-semibold leading-none tracking-tight">Trading Setup</div>
            <p className="text-sm text-muted-foreground">Configure your budget and time horizon</p>
          </div>
          <div className="space-y-5">
            <div className="space-y-2.5">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Target className="h-4 w-4 text-muted-foreground" />
                Trading strategy
              </Label>
              <div className="inline-flex rounded-lg border bg-muted/40 p-1">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-background px-3.5 py-1.5 text-sm font-medium shadow-[0_1px_3px_hsl(230_60%_3%/0.5),0_0_0_1px_hsl(var(--border))]"><Trophy className="h-3.5 w-3.5" />Default</span>
                <span className="inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-sm font-medium text-muted-foreground"><Zap className="h-3.5 w-3.5" />Fast</span>
                <span className="inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-sm font-medium text-muted-foreground"><Mountain className="h-3.5 w-3.5" />Stable</span>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-medium"><Coins className="h-4 w-4 text-muted-foreground" />Your Budget</Label>
                <div className="flex h-12 items-center rounded-md border border-input px-3 font-mono text-base">10,000,000</div>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-medium"><Timer className="h-4 w-4 text-muted-foreground" />Time Horizon & Max Time</Label>
                <div className="flex h-12 items-center rounded-md border border-input px-3 text-sm">1 hour</div>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-medium"><Calculator className="h-4 w-4 text-muted-foreground" />Bazaar Tax Rate</Label>
                <div className="flex h-12 items-center rounded-md border border-input px-3 text-sm">1.125%</div>
              </div>
            </div>
          </div>
        </FeatureCard>
      </div>

      <LockedPreview cta={cta}>
        <div className="space-y-4">
          <div className="flex items-end justify-between">
            <h2 className="text-xl font-semibold tracking-tight">Opportunities (50)</h2>
            <span className="text-sm text-muted-foreground">Showing 1-50 of 1,933 items</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {EXAMPLE_FLIPS.map((o) => (
              <OpportunityCard
                key={o.productId}
                o={o}
                query={{ horizonHours: 1 }}
                bazaarTaxRate={0.01125}
                fav={false}
                onToggleFav={noop}
                isExpanded={false}
                setExpandedCard={noop}
              />
            ))}
          </div>
        </div>
      </LockedPreview>
    </div>
  )
}
