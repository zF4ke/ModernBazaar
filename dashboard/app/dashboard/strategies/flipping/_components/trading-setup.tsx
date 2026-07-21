"use client"

import { useCallback } from "react"
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { FeatureCard } from "@/components/feature-card"
import { ChevronUp, ChevronDown, Eraser } from "lucide-react"
import { PresetSelector } from "./trading-setup/preset-selector"
import { BudgetHorizonTaxInputs } from "./trading-setup/budget-horizon-tax-inputs"
import { AdvancedFilters } from "./trading-setup/advanced-filters"
import { ScoringToggles } from "./trading-setup/scoring-toggles"
import type { TradingPresetConfig, TradingSetupProps } from "./trading-setup/types"

export type { TradingPresetConfig, TradingSetupProps }

export function TradingSetup(props: TradingSetupProps) {
  const {
    query,
    updateQuery,
    resetTradingSetup,
    searchText,
    setSearchText,
    budgetInput,
    setBudgetInput,
    setQuery,
    filtersOpen,
    setFiltersOpen,
    pinFavoritesToTop,
    setPinFavoritesToTop,
    favCount,
    bazaarTaxRate,
    setBazaarTaxRate,
    currentPreset,
    applyPreset,
    tradingPresets
  } = props

  const getTaxRateValue = useCallback((rate: number): string => {
    const percentage = rate * 100
    if (percentage === 1.125) return "1.125"
    if (percentage === 1.1) return "1.1"
    if (percentage === 1.25) return "1.25"
    if (percentage === 1.0) return "1"
    return "1.125"
  }, [])

  return (
    <FeatureCard backgroundStyle="flat">
      <CardHeader className="pb-4 p-0 mb-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <CardTitle>Trading Setup</CardTitle>
            <CardDescription>Configure your budget and time horizon</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={resetTradingSetup}
              variant="ghost"
              size="sm"
              className="text-sm text-muted-foreground/60 hover:text-muted-foreground/80"
            >
              <Eraser className="h-4 w-4 mr-0" />
              Reset
            </Button>
            <Button
              onClick={() => setFiltersOpen(!filtersOpen)}
              variant="ghost"
              size="sm"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {filtersOpen ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  <span>Collapse</span>
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  <span>Expand</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <div className="space-y-6">
        {/* Trading Preset Selector */}
        <PresetSelector
          currentPreset={currentPreset}
          applyPreset={applyPreset}
          tradingPresets={tradingPresets}
        />

        <Separator />

        {/* Budget & Horizon - Primary */}
        <BudgetHorizonTaxInputs
          query={query}
          updateQuery={updateQuery}
          budgetInput={budgetInput}
          setBudgetInput={setBudgetInput}
          bazaarTaxRate={bazaarTaxRate}
          setBazaarTaxRate={setBazaarTaxRate}
          getTaxRateValue={getTaxRateValue}
        />

        {/* Advanced options collapse smoothly (grid-rows 0fr -> 1fr, no magic
            pixel heights) instead of popping in and out. */}
        <div
          className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${filtersOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
          aria-hidden={!filtersOpen}
        >
          <div className="overflow-hidden">
            <div className={`space-y-4 pt-0 ${filtersOpen ? "" : "pointer-events-none"}`}>
              <Separator />
              <AdvancedFilters
                query={query}
                updateQuery={updateQuery}
                searchText={searchText}
                setSearchText={setSearchText}
              />

              {/* Scoring Penalty Toggles */}
              <Separator />
              <ScoringToggles
                query={query}
                updateQuery={updateQuery}
                pinFavoritesToTop={pinFavoritesToTop}
                setPinFavoritesToTop={setPinFavoritesToTop}
                favCount={favCount}
              />
            </div>
          </div>
        </div>
      </div>
    </FeatureCard>
  )
}
