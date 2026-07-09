import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Coins, Timer, Calculator } from "lucide-react"
import { FlippingQuery } from "@/types/strategies"

interface BudgetHorizonTaxInputsProps {
  query: FlippingQuery
  updateQuery: (u: Partial<FlippingQuery>) => void
  budgetInput: string
  setBudgetInput: (v: string) => void
  bazaarTaxRate: number
  setBazaarTaxRate: (v: number) => void
  getTaxRateValue: (rate: number) => string
}

export function BudgetHorizonTaxInputs({
  query,
  updateQuery,
  budgetInput,
  setBudgetInput,
  bazaarTaxRate,
  setBazaarTaxRate,
  getTaxRateValue
}: BudgetHorizonTaxInputsProps) {
  return (
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
              setBudgetInput(new Intl.NumberFormat("en-US").format(numValue))
              // Remove immediate setQuery - only use debounced value
            } else {
              setBudgetInput("")
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
            <SelectItem value="1.125" className="cursor-pointer">1.125%</SelectItem>
            <SelectItem value="1.1" className="cursor-pointer">1.1%</SelectItem>
            <SelectItem value="1" className="cursor-pointer">1.0%</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">Tax applied when selling items</p>
      </div>
    </div>
  )
}
