import { AlertCircle } from "lucide-react"

export function RiskWarning({ riskPct }: { riskPct: number }) {
  return (
    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        <AlertCircle className="h-4 w-4 text-amber-400" />
        <span className="font-medium text-amber-300">Risk Warning</span>
      </div>
      <div className="text-xs text-muted-foreground">
        This flip has a <span className="text-amber-300">{riskPct}% risk score</span>. Market conditions can change quickly - monitor your orders closely.
      </div>
    </div>
  )
}
