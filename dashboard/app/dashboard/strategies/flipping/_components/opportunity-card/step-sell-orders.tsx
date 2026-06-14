import { ArrowUp } from "lucide-react"
import { format, formatTime } from "../utils"

export function StepSellOrders({ o, sell, bazaarTaxRate }: any) {
  return (
    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        <ArrowUp className="h-4 w-4 text-emerald-400" />
        <span className="font-medium text-emerald-300">Step 3: Place Sell Orders</span>
      </div>
      <div className="text-xs text-muted-foreground space-y-1">
        <div>• Once items are bought, place sell orders at <span className="font-mono text-emerald-300">{format(sell, 2)} coins</span> each</div>
        <div>• After {(bazaarTaxRate * 100).toFixed(2)}% tax, you'll receive <span className="font-mono text-emerald-300">{format(sell * (1 - bazaarTaxRate), 2)} coins</span> net</div>
        <div>• Expected fill time: <span className="text-emerald-300">{(o as any).suggestedSellFillHours ? formatTime((o as any).suggestedSellFillHours) : 'Unknown'}</span></div>
        <div>• Total expected time: <span className="text-emerald-300">{(o as any).suggestedTotalFillHours ? formatTime((o as any).suggestedTotalFillHours) : 'Unknown'}</span></div>
      </div>
    </div>
  )
}
