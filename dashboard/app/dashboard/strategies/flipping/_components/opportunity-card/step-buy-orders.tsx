import { format, formatTime } from "../utils"
import { StepShell } from "./step-shell"

export function StepBuyOrders({ o, buy }: any) {
  return (
    <StepShell n={2} title="Place buy orders">
      <p>Search the Bazaar for <span className="font-medium text-foreground">{o.displayName || o.productId}</span> and place buy orders at <span className="font-mono text-loss">{format(buy, 2)} coins</span> each.</p>
      <p>Expected fill time: <span className="font-mono text-foreground">{(o as any).suggestedBuyFillHours ? formatTime((o as any).suggestedBuyFillHours) : 'unknown'}</span></p>
    </StepShell>
  )
}
