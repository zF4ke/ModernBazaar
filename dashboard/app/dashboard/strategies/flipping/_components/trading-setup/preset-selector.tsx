import { Label } from "@/components/ui/label"
import { Segmented } from "@/components/ui/segmented"
import { Target } from "lucide-react"
import type { TradingPresetConfig } from "./types"

interface PresetSelectorProps {
  currentPreset: string
  applyPreset: (key: string) => void
  tradingPresets: Record<string, TradingPresetConfig>
}

/* Three bounded choices deserve a segmented control with a sliding pill, not a
   dropdown. The active preset's description sits under the control so the
   choice explains itself. */
export function PresetSelector({ currentPreset, applyPreset, tradingPresets }: PresetSelectorProps) {
  const current = tradingPresets[currentPreset as keyof typeof tradingPresets]
  return (
    <div className="space-y-2.5">
      <Label className="flex items-center gap-2 text-sm font-medium">
        <Target className="h-4 w-4 text-muted-foreground" />
        Trading strategy
      </Label>
      <Segmented
        value={currentPreset}
        onChange={applyPreset}
        options={Object.entries(tradingPresets).map(([key, preset]) => {
          const Icon = preset.icon
          return { value: key, label: preset.name, icon: <Icon className="h-3.5 w-3.5" /> }
        })}
      />
      {current ? (
        <p className="text-xs text-muted-foreground">{current.description}</p>
      ) : null}
    </div>
  )
}
