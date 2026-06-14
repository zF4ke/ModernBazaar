import { Calculator } from "lucide-react"
import { format } from "../utils"

export function StepProfit({ o, buy, sell, bazaarTaxRate, query }: any) {
  return (
    <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        <Calculator className="h-4 w-4 text-purple-400" />
        <span className="font-medium text-purple-300">Step 4: Profit Setup</span>
      </div>
      <div className="text-xs text-muted-foreground space-y-1">
        <div className="text-xs text-muted-foreground/70 mb-1 font-medium">Per Item:</div>
        <div className="flex items-center justify-between">
          <span>Gross profit:</span>
          <span className="font-mono text-purple-300">{format(sell - buy, 2)} coins</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Tax deduction ({(bazaarTaxRate * 100).toFixed(2)}%):</span>
          <span className="font-mono text-red-300">-{format(sell * bazaarTaxRate, 2)} coins</span>
        </div>
        <div className="flex items-center justify-between border-t mb-4 border-purple-500/20 pt-1">
          <span>Net profit per item:</span>
          <span className="font-mono text-purple-300">{format((sell * (1 - bazaarTaxRate)) - buy, 2)} coins</span>
        </div>
        <div className="h-3"></div>
        <div className="text-xs text-muted-foreground/70 mb-1 font-medium">Profit Rates:</div>
        <div className="flex items-center justify-between">
          <span>Profit per hour:</span>
          <span className="font-mono text-purple-300">{format((o.reasonableProfitPerHour || 0) * (1 - bazaarTaxRate), 0)} coins/hour</span>
        </div>
        {query.horizonHours && (
          <div className="flex items-center justify-between border-t border-purple-500/20 pt-1">
            <span>Total profit ({query.horizonHours}h):</span>
            <span className="font-mono text-purple-300">{format((o.reasonableProfitPerHour || 0) * query.horizonHours * (1 - bazaarTaxRate), 0)} coins</span>
          </div>
        )}
      </div>
    </div>
  )
}
