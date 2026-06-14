import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { TrendingUp, ShieldAlert, Users, BarChart3 } from "lucide-react"
import { SPREAD_GREEN, SPREAD_AMBER, RISK_RED, COMP_RED, COMP_AMBER } from "../badge-thresholds"

export function StatusBadges({ o, riskPct, spreadPctVal, d, s, format }: any) {
  const competitionScore = o.competitionPerHour ?? 0
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge variant="outline" className={`text-[10px] px-2 py-0.5 ${spreadPctVal >= SPREAD_GREEN ? 'border-emerald-500/50 text-emerald-400' : spreadPctVal >= SPREAD_AMBER ? 'border-amber-500/50 text-amber-400' : 'border-zinc-600 text-zinc-400'}`}>
        <TrendingUp className="h-3 w-3 mr-1" />
        {format(spreadPctVal, 0)}% spread
      </Badge>
      {riskPct !== undefined && (
        o.riskNote ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className={`text-[10px] px-2 py-0.5 cursor-help ${riskPct >= RISK_RED ? 'border-red-500/50 text-red-400' : 'border-zinc-600 text-zinc-400'}`}>
                <ShieldAlert className="h-3 w-3 mr-1" />
                {riskPct}% risk
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs text-sm">{o.riskNote}</p>
            </TooltipContent>
          </Tooltip>
        ) : (
          <Badge variant="outline" className={`text-[10px] px-2 py-0.5 ${riskPct >= RISK_RED ? 'border-red-500/50 text-red-400' : 'border-zinc-600 text-zinc-400'}`}>
            <ShieldAlert className="h-3 w-3 mr-1" />
            {riskPct}% risk
          </Badge>
        )
      )}
      <Badge variant="outline" className={`text-[10px] px-2 py-0.5 ${competitionScore >= COMP_RED ? 'border-red-500/50 text-red-400' : competitionScore >= COMP_AMBER ? 'border-amber-500/50 text-amber-400' : 'border-zinc-600 text-zinc-400'}`}>
        <Users className="h-3 w-3 mr-1" />
        {format(competitionScore, 0)} comp
      </Badge>
      <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
        <BarChart3 className="h-3 w-3" />
        <span>Demand {format(d,0)} · Supply {format(s,0)}</span>
      </div>
    </div>
  )
}
