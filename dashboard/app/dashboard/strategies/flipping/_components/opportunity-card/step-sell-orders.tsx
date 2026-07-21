import { format, formatTime } from "../utils"
import { StepShell } from "./step-shell"

export function StepSellOrders({ o, sell, bazaarTaxRate }: any) {
  return (
    <StepShell n={3} title="Place sell orders">
      <p>Once the items are bought, list sell orders at <span className="font-mono text-gain">{format(sell, 2)} coins</span> each. After {(bazaarTaxRate * 100).toFixed(2)}% tax you receive <span className="font-mono text-gain">{format(sell * (1 - bazaarTaxRate), 2)} coins</span> net.</p>
      <p>
        Expected fill: <span className="font-mono text-foreground">{(o as any).suggestedSellFillHours ? formatTime((o as any).suggestedSellFillHours) : 'unknown'}</span>
        <span className="ml-3">Total: <span className="font-mono text-foreground">{(o as any).suggestedTotalFillHours ? formatTime((o as any).suggestedTotalFillHours) : 'unknown'}</span></span>
      </p>
    </StepShell>
  )
}
