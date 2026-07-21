import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { TrendingUp, ShieldAlert, Users, BarChart3 } from "lucide-react"
import { SPREAD_GREEN, SPREAD_AMBER, RISK_RED, COMP_RED, COMP_AMBER } from "../badge-thresholds"

/* Traffic-light badges: color IS the information (good spread, risky, crowded).
   Values are mono; hues come from the semantic tokens. */
export function StatusBadges({ o, riskPct, spreadPctVal, d, s, format }: any) {
  const competitionScore = o.competitionPerHour ?? 0
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge variant="outline" className={`text-[10px] px-2 py-0.5 ${spreadPctVal >= SPREAD_GREEN ? 'border-gain/50 text-gain' : spreadPctVal >= SPREAD_AMBER ? 'border-warn/50 text-warn' : 'border-border text-muted-foreground'}`}>
        <TrendingUp className="h-3 w-3 mr-1" />
        <span className="font-mono">{format(spreadPctVal, 0)}%</span>&nbsp;spread
      </Badge>
      {riskPct !== undefined && (
        o.riskNote ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className={`text-[10px] px-2 py-0.5 cursor-help ${riskPct >= RISK_RED ? 'border-loss/50 text-loss' : 'border-border text-muted-foreground'}`}>
                <ShieldAlert className="h-3 w-3 mr-1" />
                <span className="font-mono">{riskPct}%</span>&nbsp;risk
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs text-sm">{o.riskNote}</p>
            </TooltipContent>
          </Tooltip>
        ) : (
          <Badge variant="outline" className={`text-[10px] px-2 py-0.5 ${riskPct >= RISK_RED ? 'border-loss/50 text-loss' : 'border-border text-muted-foreground'}`}>
            <ShieldAlert className="h-3 w-3 mr-1" />
            <span className="font-mono">{riskPct}%</span>&nbsp;risk
          </Badge>
        )
      )}
      <Badge variant="outline" className={`text-[10px] px-2 py-0.5 ${competitionScore >= COMP_RED ? 'border-loss/50 text-loss' : competitionScore >= COMP_AMBER ? 'border-warn/50 text-warn' : 'border-border text-muted-foreground'}`}>
        <Users className="h-3 w-3 mr-1" />
        <span className="font-mono">{format(competitionScore, 0)}</span>&nbsp;comp
      </Badge>
      <div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
        <BarChart3 className="h-3 w-3" />
        <span>Demand <span className="font-mono">{format(d, 0)}</span></span>
        <span className="ml-1">Supply <span className="font-mono">{format(s, 0)}</span></span>
      </div>
    </div>
  )
}
