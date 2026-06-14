import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FlippingQuery } from "@/types/strategies"
import {
  Search,
  Coins,
  ArrowUpDown,
  Trophy,
  TrendingUp,
  ArrowUp,
  ArrowDown,
  TrendingDown,
  Users,
  ShieldAlert
} from "lucide-react"

interface AdvancedFiltersProps {
  query: FlippingQuery
  updateQuery: (u: Partial<FlippingQuery>) => void
  searchText: string
  setSearchText: (v: string) => void
}

export function AdvancedFilters({ query, updateQuery, searchText, setSearchText }: AdvancedFiltersProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Search className="h-4 w-4" />
          Search Items
        </Label>
        <Input
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="Search by item name or ID..."
          className="h-10"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4" />
          Sort By
        </Label>
        <Select value={query.sort} onValueChange={(value) => updateQuery({ sort: value })}>
          <SelectTrigger className="h-10">
            <SelectValue placeholder="Choose sorting" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="score">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4" />
                Recommended Score
              </div>
            </SelectItem>
            <SelectItem value="profitPerHour">
              <div className="flex items-center gap-2">
                <Coins className="h-4 w-4" />
                Profit per Hour
              </div>
            </SelectItem>
            <SelectItem value="spread">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Highest Spread
              </div>
            </SelectItem>
            <SelectItem value="iselldesc">
              <div className="flex items-center gap-2">
                <ArrowUp className="h-4 w-4" />
                Highest Sell Price
              </div>
            </SelectItem>
            <SelectItem value="ibuydesc">
              <div className="flex items-center gap-2">
                <ArrowDown className="h-4 w-4" />
                Highest Buy Price
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* New Advanced Filters */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Min Units/Hour
          </Label>
          <Input
            type="number"
            placeholder="e.g. 10"
            value={query.minUnitsPerHour || ""}
            onChange={(e) => updateQuery({ minUnitsPerHour: e.target.value ? parseFloat(e.target.value) : undefined })}
            className="h-10"
            min="0"
          />
          <p className="text-xs text-muted-foreground">Show only items with at least this trading volume</p>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <TrendingDown className="h-4 w-4" />
            Max Units/Hour
          </Label>
          <Input
            type="number"
            placeholder="e.g. 1000"
            value={query.maxUnitsPerHour || ""}
            onChange={(e) => updateQuery({ maxUnitsPerHour: e.target.value ? parseFloat(e.target.value) : undefined })}
            className="h-10"
            min="0"
          />
          <p className="text-xs text-muted-foreground">Hide items with higher trading volume than this</p>
        </div>
      </div>

      {/* Advanced Competition & Risk Filters */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            Max Competition/Hour
          </Label>
          <Input
            type="number"
            placeholder="e.g. 30"
            value={query.maxCompetitionPerHour || ""}
            onChange={(e) => updateQuery({ maxCompetitionPerHour: e.target.value ? parseFloat(e.target.value) : undefined })}
            className="h-10"
            min="0"
          />
          <p className="text-xs text-muted-foreground">Hide items with competition higher than this</p>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <ShieldAlert className="h-4 w-4" />
            Max Risk Score
          </Label>
          <Input
            type="number"
            step="0.1"
            placeholder="e.g. 0.2"
            value={query.maxRiskScore || ""}
            onChange={(e) => updateQuery({ maxRiskScore: e.target.value ? parseFloat(e.target.value) : undefined })}
            className="h-10"
            min="0"
            max="1"
          />
          <p className="text-xs text-muted-foreground">Hide items with risk score higher than this (0-1)</p>
        </div>
      </div>
    </div>
  )
}
