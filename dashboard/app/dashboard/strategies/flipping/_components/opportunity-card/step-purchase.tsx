import { Target } from "lucide-react"
import { format } from "../utils"

export function StepPurchase({ o, query, buy }: any) {
  return (
    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        <Target className="h-4 w-4 text-blue-400" />
        <span className="font-medium text-blue-300">Step 1: Calculate Purchase Amount</span>
      </div>
      <div className="text-xs text-muted-foreground space-y-1">
        <div className="flex items-center justify-between">
          <span>Suggested amount per hour:</span>
          <span className="font-mono text-blue-300">{format(o.suggestedUnitsPerHour, 0)} units</span>
        </div>
        {query.horizonHours && (
          <div className="flex items-center justify-between">
            <span>For {query.horizonHours}h timeframe:</span>
            <span className="font-mono text-blue-300">{format((o.suggestedUnitsPerHour || 0) * query.horizonHours, 0)} units</span>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-blue-500/20 pt-1">
          <span>Total investment needed:</span>
          <span className="font-mono text-blue-300">
            {format((query.horizonHours || 1) * Math.round(o.suggestedUnitsPerHour || 0) * buy, 0)} coins
          </span>
        </div>
      </div>
    </div>
  )
}
