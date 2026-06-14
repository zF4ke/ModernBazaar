import { Badge } from "@/components/ui/badge"
import { Zap, Clock, Info } from "lucide-react"
import { strategies } from "./strategies-data"

export function StrategyNavigationTabs({
  activeStrategy,
  setActiveStrategy
}: {
  activeStrategy: string
  setActiveStrategy: (id: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {strategies.map((strategy) => {
        const IconComponent = strategy.icon
        const isActive = activeStrategy === strategy.id
        const isReleased = strategy.status === "released"
        const isComingSoon = strategy.status === "coming-soon"
        const isPlanned = strategy.status === "planned"

        return (
          <button
            key={strategy.id}
            onClick={() => setActiveStrategy(strategy.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-200 ${
              isActive
                ? 'bg-card border-border text-foreground shadow-lg'
                : 'bg-muted/50 border-border/50 text-muted-foreground hover:bg-muted hover:border-border hover:text-foreground'
            }`}
          >
            <IconComponent className="h-4 w-4" />
            <span className="text-sm font-medium">{strategy.title}</span>
              {isReleased && (
               <Badge className="ml-1 bg-green-500/20 text-green-400 border-green-500/40 text-xs pointer-events-none">
                 <Zap className="h-3 w-3 mr-1" />
                 Live
               </Badge>
             )}
             {isComingSoon && (
               <Badge className="ml-1 bg-muted text-muted-foreground border-border text-xs pointer-events-none">
                 <Clock className="h-3 w-3 mr-1" />
                 Soon
               </Badge>
             )}
             {isPlanned && (
               <Badge className="ml-1 bg-muted text-muted-foreground border-border text-xs pointer-events-none">
                 <Info className="h-3 w-3 mr-1" />
                 Planned
               </Badge>
             )}
          </button>
        )
      })}
    </div>
  )
}
