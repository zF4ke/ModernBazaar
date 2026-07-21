import { AlertCircle } from "lucide-react"

export function RiskWarning({ riskPct }: { riskPct: number }) {
  return (
    <div className="rounded-lg bg-warn/[0.08] p-3">
      <div className="mb-1.5 flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-warn" />
        <span className="font-medium text-warn">Risky flip</span>
      </div>
      <div className="text-xs leading-relaxed text-muted-foreground">
        Risk score <span className="font-mono text-warn">{riskPct}%</span>. Market conditions can change quickly, so monitor your orders closely.
      </div>
    </div>
  )
}
