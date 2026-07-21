import { format } from "../utils"
import { StepShell, StepRow } from "./step-shell"

export function StepProfit({ o, buy, sell, bazaarTaxRate, query }: any) {
  return (
    <StepShell n={4} title="What you make">
      <StepRow label="Gross profit per item" value={<span className="font-mono text-foreground">{format(sell - buy, 2)} coins</span>} />
      <StepRow label={`Tax (${(bazaarTaxRate * 100).toFixed(2)}%)`} value={<span className="font-mono text-loss">-{format(sell * bazaarTaxRate, 2)} coins</span>} />
      <div className="border-t border-border/60 pt-1.5">
        <StepRow label="Net profit per item" value={<span className="font-mono font-semibold text-gain">{format((sell * (1 - bazaarTaxRate)) - buy, 2)} coins</span>} />
      </div>
      <div className="pt-1.5">
        <StepRow label="Profit per hour" value={<span className="font-mono text-gain">{format((o.reasonableProfitPerHour || 0) * (1 - bazaarTaxRate), 0)} coins</span>} />
        {query.horizonHours && (
          <StepRow label={`Total over ${query.horizonHours}h`} value={<span className="font-mono font-semibold text-gain">{format((o.reasonableProfitPerHour || 0) * query.horizonHours * (1 - bazaarTaxRate), 0)} coins</span>} />
        )}
      </div>
    </StepShell>
  )
}
