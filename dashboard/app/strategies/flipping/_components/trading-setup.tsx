"use client"

import { useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { FlippingQuery } from "@/types/strategies"
import {
  Search,
  ChevronUp,
  ChevronDown,
  Target,
  Coins,
  Timer,
  Calculator,
  ArrowUpDown,
  Trophy,
  TrendingUp,
  ArrowUp,
  ArrowDown,
  TrendingDown,
  Star,
  Users,
  ShieldAlert,
  Eraser
} from "lucide-react"

interface TradingPresetConfig {
  name: string
  description: string
  icon: any
  iconColor: string
  bgColor: string
  borderColor: string
  activeBorderColor: string
  activeBgColor: string
  horizonHours: number
  maxTime: number
  sort: string
  disableCompetitionPenalties: boolean
  disableRiskPenalties: boolean
  minUnitsPerHour?: number
  maxUnitsPerHour?: number
  maxCompetitionPerHour?: number
  maxRiskScore?: number
}

interface TradingSetupProps {
  query: FlippingQuery
  updateQuery: (u: Partial<FlippingQuery>) => void
  resetTradingSetup: () => void
  searchText: string
  setSearchText: (v: string) => void
  budgetInput: string
  setBudgetInput: (v: string) => void
  setQuery: React.Dispatch<React.SetStateAction<FlippingQuery>>
  filtersOpen: boolean
  setFiltersOpen: (v: boolean) => void
  pinFavoritesToTop: boolean
  setPinFavoritesToTop: (v: boolean) => void
  favCount: number
  bazaarTaxRate: number
  setBazaarTaxRate: (v: number) => void
  currentPreset: string
  applyPreset: (key: string) => void
  tradingPresets: Record<string, TradingPresetConfig>
}

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
    if (percentage === 1.1) return "1.1"
    if (percentage === 1.25) return "1.25"
    if (percentage === 1.0) return "1"
    return "1.1"
  }, [])

  return (
    <Card>
      <CardHeader className="pb-4">
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
      <CardContent className="space-y-6">
        {/* Trading Preset Selector */}
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Target className="h-4 w-4" />
            Trading Strategy
          </Label>

          <Select value={currentPreset} onValueChange={applyPreset}>
            <SelectTrigger className="h-10">
              <SelectValue>
                <div className="flex items-center gap-2">
                  {(() => {
                    const current = tradingPresets[currentPreset as keyof typeof tradingPresets]
                    const IconComponent = current.icon
                    return (
                      <>
                        <div className={`p-1 rounded ${current.iconColor} bg-primary/10`}>
                          <IconComponent className="h-3.5 w-3.5" />
                        </div>
                        <span className="font-medium">{current.name}</span>
                        <span className="text-xs text-muted-foreground">• {current.description}</span>
                      </>
                    )
                  })()}
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(tradingPresets).map(([key, preset]) => {
                const IconComponent = preset.icon
                return (
                  <SelectItem key={key} value={key} className="cursor-pointer">
                    <div className="flex items-center gap-3 py-1">
                      <div className={`p-1.5 rounded ${preset.iconColor} bg-primary/10`}>
                        <IconComponent className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium">{preset.name}</span>
                        <span className="text-xs text-muted-foreground">{preset.description}</span>
                      </div>
                    </div>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>

          <p className="text-xs text-muted-foreground">
            Select a preset to automatically configure your trading settings
          </p>
        </div>

        <Separator />

        {/* Budget & Horizon - Primary */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Coins className="h-4 w-4" />
              Your Budget
            </Label>
            <Input
              inputMode="numeric"
              type="text"
              placeholder="Enter your budget (e.g. 1,000,000)"
              value={budgetInput}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9]/g, '')
                if (value) {
                  const numValue = parseInt(value)
                  setBudgetInput(new Intl.NumberFormat().format(numValue))
                  setQuery(prev => ({ ...prev, budget: numValue }))
                } else {
                  setBudgetInput("")
                  setQuery(prev => ({ ...prev, budget: undefined }))
                }
              }}
              className="h-12 text-base"
            />
            <p className="text-xs text-muted-foreground">How many coins you want to invest</p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Timer className="h-4 w-4" />
              Time Horizon & Max Time
            </Label>
            <Select value={query.horizonHours?.toString() ?? "1"} onValueChange={(value) => {
              const hours = parseFloat(value)
              updateQuery({ horizonHours: hours, maxTime: hours })
            }}>
              <SelectTrigger className="h-12 text-sm">
                <SelectValue placeholder="Select timeframe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0.25">15 minutes</SelectItem>
                <SelectItem value="0.5">30 minutes</SelectItem>
                <SelectItem value="1">1 hour</SelectItem>
                <SelectItem value="3">3 hours</SelectItem>
                <SelectItem value="6">6 hours</SelectItem>
                <SelectItem value="12">12 hours</SelectItem>
                <SelectItem value="24">1 day</SelectItem>
                <SelectItem value="168">1 week</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">How long you plan to hold items (also sets max completion time)</p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Bazaar Tax Rate
            </Label>
            <Select
              value={getTaxRateValue(bazaarTaxRate)}
              onValueChange={(value) => {
                const rate = parseFloat(value) / 100
                setBazaarTaxRate(rate)
              }}
            >
              <SelectTrigger className="h-12 text-sm">
                <SelectValue placeholder="Select tax rate" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1.25" className="cursor-pointer">1.25%</SelectItem>
                <SelectItem value="1.1" className="cursor-pointer">1.1%</SelectItem>
                <SelectItem value="1" className="cursor-pointer">1.0%</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Tax applied when selling items</p>
          </div>
        </div>

        {filtersOpen && (
          <>
            <Separator />

            {/* Advanced options */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Search Items
                </Label>
                <Input
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Search by item name or ID..."
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <ArrowUpDown className="h-4 w-4" />
                  Sort By
                </Label>
                <Select value={query.sort} onValueChange={(value) => updateQuery({ sort: value })}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Choose sorting" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="score">
                      <div className="flex items-center gap-2">
                        <Trophy className="h-4 w-4" />
                        Recommended Score
                      </div>
                    </SelectItem>
                    <SelectItem value="profitPerHour">
                      <div className="flex items-center gap-2">
                        <Coins className="h-4 w-4" />
                        Profit per Hour
                      </div>
                    </SelectItem>
                    <SelectItem value="spread">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Highest Spread
                      </div>
                    </SelectItem>
                    <SelectItem value="iselldesc">
                      <div className="flex items-center gap-2">
                        <ArrowUp className="h-4 w-4" />
                        Highest Sell Price
                      </div>
                    </SelectItem>
                    <SelectItem value="ibuydesc">
                      <div className="flex items-center gap-2">
                        <ArrowDown className="h-4 w-4" />
                        Highest Buy Price
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* New Advanced Filters */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Min Units/Hour
                  </Label>
                  <Input
                    type="number"
                    placeholder="e.g. 10"
                    value={query.minUnitsPerHour || ""}
                    onChange={(e) => updateQuery({ minUnitsPerHour: e.target.value ? parseFloat(e.target.value) : undefined })}
                    className="h-10"
                    min="0"
                  />
                  <p className="text-xs text-muted-foreground">Show only items with at least this trading volume</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <TrendingDown className="h-4 w-4" />
                    Max Units/Hour
                  </Label>
                  <Input
                    type="number"
                    placeholder="e.g. 1000"
                    value={query.maxUnitsPerHour || ""}
                    onChange={(e) => updateQuery({ maxUnitsPerHour: e.target.value ? parseFloat(e.target.value) : undefined })}
                    className="h-10"
                    min="0"
                  />
                  <p className="text-xs text-muted-foreground">Hide items with higher trading volume than this</p>
                </div>
              </div>

              {/* Advanced Competition & Risk Filters */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Max Competition/Hour
                  </Label>
                  <Input
                    type="number"
                    placeholder="e.g. 30"
                    value={query.maxCompetitionPerHour || ""}
                    onChange={(e) => updateQuery({ maxCompetitionPerHour: e.target.value ? parseFloat(e.target.value) : undefined })}
                    className="h-10"
                    min="0"
                  />
                  <p className="text-xs text-muted-foreground">Hide items with competition higher than this</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4" />
                    Max Risk Score
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 0.2"
                    value={query.maxRiskScore || ""}
                    onChange={(e) => updateQuery({ maxRiskScore: e.target.value ? parseFloat(e.target.value) : undefined })}
                    className="h-10"
                    min="0"
                    max="1"
                  />
                  <p className="text-xs text-muted-foreground">Hide items with risk score higher than this (0-1)</p>
                </div>
              </div>

              {/* Scoring Penalty Toggles */}
              <Separator />
              <div className="space-y-3">
                {/* Favorites priority */}
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Star className="h-4 w-4" />
                      Pin Favorites to Top
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Show your starred opportunities first ({favCount} items)
                    </p>
                  </div>
                  <Switch
                    checked={pinFavoritesToTop}
                    onCheckedChange={setPinFavoritesToTop}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Calculator className="h-4 w-4" />
                      Disable Competition Penalties
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Ignore competition when calculating scores (see raw profit potential)
                    </p>
                  </div>
                  <Switch
                    checked={query.disableCompetitionPenalties || false}
                    onCheckedChange={(checked) => updateQuery({ disableCompetitionPenalties: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Disable Risk Penalties
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Ignore risk scores when calculating scores (see raw profit potential)
                    </p>
                  </div>
                  <Switch
                    checked={query.disableRiskPenalties || false}
                    onCheckedChange={(checked) => updateQuery({ disableRiskPenalties: checked })}
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

