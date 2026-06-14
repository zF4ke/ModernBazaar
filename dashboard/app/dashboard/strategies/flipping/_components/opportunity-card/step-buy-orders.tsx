import { ArrowDown } from "lucide-react"
import { format, formatTime } from "../utils"

export function StepBuyOrders({ o, buy }: any) {
  return (
    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        <ArrowDown className="h-4 w-4 text-red-400" />
        <span className="font-medium text-red-300">Step 2: Place Buy Orders</span>
      </div>
      <div className="text-xs text-muted-foreground space-y-1">
        <div>• Go to the Bazaar and search for <span className="font-mono text-red-300">{o.displayName || o.productId}</span></div>
        <div>• Place buy orders at <span className="font-mono text-red-300">{format(buy, 2)} coins</span> each</div>
        <div>• Expected fill time: <span className="text-red-300">{(o as any).suggestedBuyFillHours ? formatTime((o as any).suggestedBuyFillHours) : 'Unknown'}</span></div>
      </div>
    </div>
  )
}
