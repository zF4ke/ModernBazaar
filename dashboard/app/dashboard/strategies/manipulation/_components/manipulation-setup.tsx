"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FeatureCard } from "@/components/feature-card"
import { ManipulationQuery } from "@/types/strategies"
import {
  Search,
  ChevronUp,
  ChevronDown,
  Coins,
  TrendingUp,
  Calculator,
  ArrowUpDown,
  Trophy,
  Scale,
  Crosshair,
  Star,
  Eraser,
  DollarSign,
  Package,
  Tag,
} from "lucide-react"

interface ManipulationSetupProps {
  query: ManipulationQuery
  updateQuery: (u: Partial<ManipulationQuery>) => void
  resetSetup: () => void
  searchText: string
  setSearchText: (v: string) => void
  budgetInput: string
  setBudgetInput: (v: string) => void
  filtersOpen: boolean
  setFiltersOpen: (v: boolean) => void
  pinFavoritesToTop: boolean
  setPinFavoritesToTop: (v: boolean) => void
  favCount: number
}

const taxValue = (rate: number | undefined): string => {
  const p = (rate ?? 0.01125) * 100
  if (p === 1.25) return "1.25"
  if (p === 1.1) return "1.1"
  if (p === 1.0) return "1"
  return "1.125"
}

export function ManipulationSetup(props: ManipulationSetupProps) {
  const {
    query, updateQuery, resetSetup, searchText, setSearchText,
    budgetInput, setBudgetInput, filtersOpen, setFiltersOpen,
    pinFavoritesToTop, setPinFavoritesToTop, favCount,
  } = props

  return (
    <FeatureCard backgroundStyle="flat">
      <CardHeader className="pb-4 p-0 mb-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <CardTitle>Manipulation Setup</CardTitle>
            <CardDescription>Set your budget and target return to find corner-able markets</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={resetSetup} variant="ghost" size="sm" className="text-sm text-muted-foreground/60 hover:text-muted-foreground/80">
              <Eraser className="h-4 w-4 mr-0" />
              Reset
            </Button>
            <Button onClick={() => setFiltersOpen(!filtersOpen)} variant="ghost" size="sm" className="text-sm text-muted-foreground hover:text-foreground">
              {filtersOpen ? (<><ChevronUp className="h-4 w-4" /><span>Collapse</span></>) : (<><ChevronDown className="h-4 w-4" /><span>Expand</span></>)}
            </Button>
          </div>
        </div>
      </CardHeader>

      <div className="space-y-6">
        {/* Primary: Budget / ROI / Tax */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Coins className="h-4 w-4" />
              Max Budget
            </Label>
            <Input
              inputMode="numeric"
              type="text"
              placeholder="e.g. 50,000,000"
              value={budgetInput}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9]/g, "")
                setBudgetInput(value ? new Intl.NumberFormat("en-US").format(parseInt(value)) : "")
              }}
              className="h-12 text-base"
            />
            <p className="text-xs text-muted-foreground">Hides items you can&apos;t fully corner</p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Target ROI
            </Label>
            <Select value={(query.roi ?? 2).toString()} onValueChange={(v) => updateQuery({ roi: parseFloat(v) })}>
              <SelectTrigger className="h-12 text-sm"><SelectValue placeholder="Return multiplier" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1.5">1.5x — conservative</SelectItem>
                <SelectItem value="2">2x — double up</SelectItem>
                <SelectItem value="3">3x — aggressive</SelectItem>
                <SelectItem value="5">5x — greedy</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">How inflated your buy order is vs break-even</p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Bazaar Tax Rate
            </Label>
            <Select value={taxValue(query.taxRate)} onValueChange={(v) => updateQuery({ taxRate: parseFloat(v) / 100 })}>
              <SelectTrigger className="h-12 text-sm"><SelectValue placeholder="Tax rate" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1.25">1.25%</SelectItem>
                <SelectItem value="1.125">1.125%</SelectItem>
                <SelectItem value="1.1">1.1%</SelectItem>
                <SelectItem value="1">1.0%</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Tax applied when selling items</p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4" />
              Max Units
            </Label>
            <Input
              inputMode="numeric"
              type="text"
              placeholder="e.g. 50,000"
              value={query.maxCornerSupply ? new Intl.NumberFormat("en-US").format(query.maxCornerSupply) : ""}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9]/g, "")
                updateQuery({ maxCornerSupply: value ? parseInt(value) : undefined })
              }}
              className="h-12 text-base"
            />
            <p className="text-xs text-muted-foreground">Hides markets with too many units to handle</p>
          </div>
        </div>

        {filtersOpen && (
          <>
            <Separator />
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2"><Search className="h-4 w-4" />Search Items</Label>
                <Input value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Search by item name or ID..." className="h-10" />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2"><ArrowUpDown className="h-4 w-4" />Sort By</Label>
                <Select value={query.sort ?? "score"} onValueChange={(v) => updateQuery({ sort: v })}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="Choose sorting" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="score"><div className="flex items-center gap-2"><Trophy className="h-4 w-4" />Recommended Score</div></SelectItem>
                    <SelectItem value="profit"><div className="flex items-center gap-2"><Coins className="h-4 w-4" />Total Profit</div></SelectItem>
                    <SelectItem value="ratio"><div className="flex items-center gap-2"><Scale className="h-4 w-4" />Demand / Supply</div></SelectItem>
                    <SelectItem value="cornerCost"><div className="flex items-center gap-2"><Crosshair className="h-4 w-4" />Cheapest to Corner</div></SelectItem>
                    <SelectItem value="demand"><div className="flex items-center gap-2"><TrendingUp className="h-4 w-4" />Highest Demand</div></SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2"><Trophy className="h-4 w-4" />Formula</Label>
                <Select value={query.formulaVersion ?? "balanced"} onValueChange={(v) => updateQuery({ formulaVersion: v as ManipulationQuery["formulaVersion"] })}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="Choose formula" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="overclocker">Overclocker</SelectItem>
                    <SelectItem value="attention">Attention</SelectItem>
                    <SelectItem value="balanced">Balanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2"><Scale className="h-4 w-4" />Min Demand / Supply</Label>
                  <Input
                    type="number" step="0.1" min="0" placeholder="e.g. 2"
                    value={query.minDemandSupplyRatio ?? ""}
                    onChange={(e) => updateQuery({ minDemandSupplyRatio: e.target.value ? parseFloat(e.target.value) : undefined })}
                    className="h-10"
                  />
                  <p className="text-xs text-muted-foreground">Only items where buyers outnumber sellers by this much</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2"><Tag className="h-4 w-4" />Max Item Price</Label>
                  <Input
                    type="number" step="0.1" min="0" placeholder="e.g. 500000"
                    value={query.maxItemPrice ?? ""}
                    onChange={(e) => updateQuery({ maxItemPrice: e.target.value ? parseFloat(e.target.value) : undefined })}
                    className="h-10"
                  />
                  <p className="text-xs text-muted-foreground">Uses the current lowest sell order price</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2"><DollarSign className="h-4 w-4" />Min Total Profit</Label>
                  <Input
                    type="number" min="0" placeholder="e.g. 1000000"
                    value={query.minProfit ?? ""}
                    onChange={(e) => updateQuery({ minProfit: e.target.value ? parseFloat(e.target.value) : undefined })}
                    className="h-10"
                  />
                  <p className="text-xs text-muted-foreground">Hide opportunities below this expected profit</p>
                </div>
              </div>

              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-sm font-medium flex items-center gap-2"><Star className="h-4 w-4" />Pin Favorites to Top</Label>
                  <p className="text-xs text-muted-foreground">Show your starred opportunities first ({favCount} items)</p>
                </div>
                <Switch checked={pinFavoritesToTop} onCheckedChange={setPinFavoritesToTop} />
              </div>
            </div>
          </>
        )}
      </div>
    </FeatureCard>
  )
}
