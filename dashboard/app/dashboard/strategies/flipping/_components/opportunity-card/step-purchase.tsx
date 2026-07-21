import { format } from "../utils"
import { StepShell, StepRow } from "./step-shell"

export function StepPurchase({ o, query, buy }: any) {
  return (
    <StepShell n={1} title="Size the purchase">
      <StepRow label="Suggested amount per hour" value={<span className="font-mono text-foreground">{format(o.suggestedUnitsPerHour, 0)} units</span>} />
      {query.horizonHours && (
        <StepRow label={`For a ${query.horizonHours}h window`} value={<span className="font-mono text-foreground">{format((o.suggestedUnitsPerHour || 0) * query.horizonHours, 0)} units</span>} />
      )}
      <div className="border-t border-border/60 pt-1.5">
        <StepRow label="Total investment needed" value={<span className="font-mono font-semibold text-foreground">{format((query.horizonHours || 1) * Math.round(o.suggestedUnitsPerHour || 0) * buy, 0)} coins</span>} />
      </div>
    </StepShell>
  )
}
