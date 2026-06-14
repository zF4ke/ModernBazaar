import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Calculator, TrendingUp, Star } from "lucide-react"
import { FlippingQuery } from "@/types/strategies"

interface ScoringTogglesProps {
  query: FlippingQuery
  updateQuery: (u: Partial<FlippingQuery>) => void
  pinFavoritesToTop: boolean
  setPinFavoritesToTop: (v: boolean) => void
  favCount: number
}

export function ScoringToggles({
  query,
  updateQuery,
  pinFavoritesToTop,
  setPinFavoritesToTop,
  favCount
}: ScoringTogglesProps) {
  return (
    <div className="space-y-3">
      {/* Favorites priority */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Star className="h-4 w-4" />
            Pin Favorites to Top
          </Label>
          <p className="text-xs text-muted-foreground">
            Show your starred opportunities first ({favCount} items)
          </p>
        </div>
        <Switch
          checked={pinFavoritesToTop}
          onCheckedChange={setPinFavoritesToTop}
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Disable Competition Penalties
          </Label>
          <p className="text-xs text-muted-foreground">
            Ignore competition when calculating scores (see raw profit potential)
          </p>
        </div>
        <Switch
          checked={query.disableCompetitionPenalties || false}
          onCheckedChange={(checked) => updateQuery({ disableCompetitionPenalties: checked })}
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Label className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Disable Risk Penalties
          </Label>
          <p className="text-xs text-muted-foreground">
            Ignore risk scores when calculating scores (see raw profit potential)
          </p>
        </div>
        <Switch
          checked={query.disableRiskPenalties || false}
          onCheckedChange={(checked) => updateQuery({ disableRiskPenalties: checked })}
        />
      </div>
    </div>
  )
}
