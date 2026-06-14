import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Target } from "lucide-react"
import type { TradingPresetConfig } from "./types"

interface PresetSelectorProps {
  currentPreset: string
  applyPreset: (key: string) => void
  tradingPresets: Record<string, TradingPresetConfig>
}

export function PresetSelector({ currentPreset, applyPreset, tradingPresets }: PresetSelectorProps) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium flex items-center gap-2">
        <Target className="h-4 w-4" />
        Trading Strategy
      </Label>

      <Select value={currentPreset} onValueChange={applyPreset}>
        <SelectTrigger className="h-10">
          <SelectValue>
            <div className="flex items-center gap-2">
              {(() => {
                const current = tradingPresets[currentPreset as keyof typeof tradingPresets]
                const IconComponent = current.icon
                return (
                  <>
                    <div className={`p-1 rounded ${current.iconColor} bg-primary/10`}>
                      <IconComponent className="h-3.5 w-3.5" />
                    </div>
                    <span className="font-medium">{current.name}</span>
                    <span className="text-xs text-muted-foreground">• {current.description}</span>
                  </>
                )
              })()}
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {Object.entries(tradingPresets).map(([key, preset]) => {
            const IconComponent = preset.icon
            return (
              <SelectItem key={key} value={key} className="cursor-pointer">
                <div className="flex items-center gap-3 py-1">
                  <div className={`p-1.5 rounded ${preset.iconColor} bg-primary/10`}>
                    <IconComponent className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium">{preset.name}</span>
                    <span className="text-xs text-muted-foreground">{preset.description}</span>
                  </div>
                </div>
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>

      <p className="text-xs text-muted-foreground">
        Select a preset to automatically configure your trading settings
      </p>
    </div>
  )
}
