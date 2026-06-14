import { FlippingQuery } from "@/types/strategies"

export interface TradingPresetConfig {
  name: string
  description: string
  icon: any
  iconColor: string
  bgColor: string
  borderColor: string
  activeBorderColor: string
  activeBgColor: string
  horizonHours: number
  maxTime: number
  sort: string
  disableCompetitionPenalties: boolean
  disableRiskPenalties: boolean
  minUnitsPerHour?: number
  maxUnitsPerHour?: number
  maxCompetitionPerHour?: number
  maxRiskScore?: number
}

export interface TradingSetupProps {
  query: FlippingQuery
  updateQuery: (u: Partial<FlippingQuery>) => void
  resetTradingSetup: () => void
  searchText: string
  setSearchText: (v: string) => void
  budgetInput: string
  setBudgetInput: (v: string) => void
  setQuery: React.Dispatch<React.SetStateAction<FlippingQuery>>
  filtersOpen: boolean
  setFiltersOpen: (v: boolean) => void
  pinFavoritesToTop: boolean
  setPinFavoritesToTop: (v: boolean) => void
  favCount: number
  bazaarTaxRate: number
  setBazaarTaxRate: (v: number) => void
  currentPreset: string
  applyPreset: (key: string) => void
  tradingPresets: Record<string, TradingPresetConfig>
}
