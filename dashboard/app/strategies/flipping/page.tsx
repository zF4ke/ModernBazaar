"use client"

import { useEffect, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
// Removed unused Link and many icons; keep only those needed here (refresh + preset icons)
import { RefreshCw, Trophy, Zap, Mountain } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TooltipProvider } from "@/components/ui/tooltip"
import type { FlipOpportunity, FlippingQuery, PagedResponse } from "@/types/strategies"
import { fetchWithBackendUrl, buildQueryParams } from "@/lib/api"
import { useDebounce } from "@/hooks/use-debounce"
import { TradingSetup } from "./_components/trading-setup"
import { OpportunitiesGrid } from "./_components/opportunities-grid"

async function fetchFlipping(query: FlippingQuery): Promise<PagedResponse<FlipOpportunity>> {
  const params = buildQueryParams(query as Record<string, any>)
  const response = await fetchWithBackendUrl(`/api/strategies/flipping?${params}`)
  if (!response.ok) throw new Error("Failed to fetch flipping opportunities")
  return response.json()
}

export default function FlippingPage() {
  const [query, setQuery] = useState<FlippingQuery>({
    sort: "score",
    limit: 50,
    page: 0,
  })
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [expandedCard, setExpandedCard] = useState<string | null>(null)
  const [pinFavoritesToTop, setPinFavoritesToTop] = useState(false)
  const [bazaarTaxRate, setBazaarTaxRate] = useState(0.01125) // Default 1.125%
  const [currentPreset, setCurrentPreset] = useState<string>("default")

  // Trading presets configuration
  const tradingPresets: Record<string, {
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
  }> = {
    default: {
      name: "Default",
      description: "1h items, Recommended Score",
      icon: Trophy,
      iconColor: "text-blue-600",
      bgColor: "bg-muted/50",
      borderColor: "border-border",
      activeBorderColor: "border-blue-500",
      activeBgColor: "bg-blue-50/50 dark:bg-blue-950/10",
      horizonHours: 1,
      maxTime: 1,
      sort: "score",
      disableCompetitionPenalties: false,
      disableRiskPenalties: false,
    },
    fast: {
      name: "Fast",
      description: "30min items, Max Profit per Hour",
      icon: Zap,
      iconColor: "text-emerald-600",
      bgColor: "bg-muted/50",
      borderColor: "border-border",
      activeBorderColor: "border-emerald-500",
      activeBgColor: "bg-emerald-50/50 dark:bg-emerald-950/10",
      horizonHours: 0.5,
      maxTime: 0.5,
      sort: "profitPerHour",
      disableCompetitionPenalties: false,
      disableRiskPenalties: true,
    },
    stable: {
      name: "Stable",
      description: "Stable prices, Long-term orders",
      icon: Mountain,
      iconColor: "text-amber-600",
      bgColor: "bg-muted/50",
      borderColor: "border-border",
      activeBorderColor: "border-amber-500",
      activeBgColor: "bg-amber-50/50 dark:bg-amber-950/10",
      horizonHours: 6, // Longer horizon for stable trading
      maxTime: 6,
      sort: "score",
      disableCompetitionPenalties: false,
      disableRiskPenalties: false,
      // Stable trading filters - more permissive for better profits
      maxCompetitionPerHour: 30, // Allow moderate competition
      maxRiskScore: 0.2, // Allow slightly higher risk for better returns
    },
  }

  // Handle preset change
  const applyPreset = (presetKey: string) => {
    const preset = tradingPresets[presetKey as keyof typeof tradingPresets]
    if (!preset) return

    setCurrentPreset(presetKey)
    
    // Apply basic preset settings
    const updates: Partial<FlippingQuery> = {
      horizonHours: preset.horizonHours,
      maxTime: preset.maxTime,
      sort: preset.sort,
      disableCompetitionPenalties: preset.disableCompetitionPenalties,
      disableRiskPenalties: preset.disableRiskPenalties,
    }

    // Apply preset-specific filters
    if (presetKey === 'stable') {
      updates.maxCompetitionPerHour = preset.maxCompetitionPerHour
      updates.maxRiskScore = preset.maxRiskScore
    } else {
      // Clear preset-specific filters for other presets
      updates.maxCompetitionPerHour = undefined
      updates.maxRiskScore = undefined
    }

    updateQuery(updates)
  }

  // persisted favorites
  const [favs, setFavs] = useState<Set<string>>(new Set())
  useEffect(() => {
    try {
      const raw = localStorage.getItem("flipFavs")
      if (raw) setFavs(new Set(JSON.parse(raw)))
    } catch {}
  }, [])
  useEffect(() => {
    try {
      localStorage.setItem("flipFavs", JSON.stringify(Array.from(favs)))
    } catch {}
  }, [favs])
  const toggleFav = (id: string) => setFavs(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })

  // Flag to prevent budget sync during loading
  const [isLoadingSetup, setIsLoadingSetup] = useState(true)

  // persisted trading setup
  useEffect(() => {
    try {
      const savedSetup = localStorage.getItem("tradingSetup")
      if (savedSetup) {
        const parsed = JSON.parse(savedSetup)

        // Set all query state at once
        setQuery(prev => ({
          ...prev,
          sort: parsed.sort,
          limit: parsed.limit,
          budget: parsed.budget,
          horizonHours: parsed.horizonHours,
          disableCompetitionPenalties: parsed.disableCompetitionPenalties,
          disableRiskPenalties: parsed.disableRiskPenalties,
          maxTime: parsed.maxTime,
          minUnitsPerHour: parsed.minUnitsPerHour,
          maxUnitsPerHour: parsed.maxUnitsPerHour,
          maxCompetitionPerHour: parsed.maxCompetitionPerHour,
          maxRiskScore: parsed.maxRiskScore,
        }))

        // Set preset if saved
        if (parsed.currentPreset) {
          setCurrentPreset(parsed.currentPreset)
        } else {
          // Auto-detect preset based on current settings
          const detectPreset = () => {
            for (const [key, preset] of Object.entries(tradingPresets)) {
              if (
                parsed.horizonHours === preset.horizonHours &&
                parsed.maxTime === preset.maxTime &&
                parsed.sort === preset.sort &&
                parsed.disableCompetitionPenalties === preset.disableCompetitionPenalties &&
                parsed.disableRiskPenalties === preset.disableRiskPenalties
              ) {
                return key
              }
            }
            return "default" // fallback to default if no match
          }
          setCurrentPreset(detectPreset())
        }

        // Set budget input to match the saved budget
        if (parsed.budget) {
          setBudgetInput(new Intl.NumberFormat().format(parsed.budget))
        } else {
          setBudgetInput("")
        }

        // Set other states
        if (parsed.pinFavoritesToTop !== undefined) {
          setPinFavoritesToTop(parsed.pinFavoritesToTop)
        }
        if (parsed.bazaarTaxRate !== undefined) {
          setBazaarTaxRate(parsed.bazaarTaxRate)
        }
      }
    } catch {} finally {
      // Allow budget sync after loading is complete
      setTimeout(() => setIsLoadingSetup(false), 100)
    }
  }, [])

  // Save budget directly to localStorage when it changes
  useEffect(() => {
    try {
      const currentSetup = JSON.parse(localStorage.getItem("tradingSetup") || "{}")
      currentSetup.budget = query.budget
      localStorage.setItem("tradingSetup", JSON.stringify(currentSetup))
    } catch {}
  }, [query.budget])

  // Save other settings to localStorage (preserving budget)
  useEffect(() => {
    try {
      const currentSetup = JSON.parse(localStorage.getItem("tradingSetup") || "{}")
      currentSetup.sort = query.sort
      currentSetup.limit = query.limit
      currentSetup.horizonHours = query.horizonHours
      currentSetup.bazaarTaxRate = bazaarTaxRate
      currentSetup.disableCompetitionPenalties = query.disableCompetitionPenalties
      currentSetup.disableRiskPenalties = query.disableRiskPenalties
      currentSetup.maxTime = query.maxTime
      currentSetup.minUnitsPerHour = query.minUnitsPerHour
      currentSetup.maxUnitsPerHour = query.maxUnitsPerHour
      currentSetup.maxCompetitionPerHour = query.maxCompetitionPerHour
      currentSetup.maxRiskScore = query.maxRiskScore
      currentSetup.pinFavoritesToTop = pinFavoritesToTop
      currentSetup.currentPreset = currentPreset
      localStorage.setItem("tradingSetup", JSON.stringify(currentSetup))
    } catch {}
  }, [query.sort, query.limit, query.horizonHours, bazaarTaxRate, query.disableCompetitionPenalties, query.disableRiskPenalties, query.maxTime, query.minUnitsPerHour, query.maxUnitsPerHour, query.maxCompetitionPerHour, query.maxRiskScore, pinFavoritesToTop, currentPreset])

  // debounced search
  const [searchText, setSearchText] = useState("")
  const debouncedSearch = useDebounce(searchText, 300)

  // debounced budget
  const [budgetInput, setBudgetInput] = useState("")
  const debouncedBudget = useDebounce(budgetInput, 500)

  // Sync budget input with query (only after loading is complete)
  useEffect(() => {
    if (!isLoadingSetup) {
      if (query.budget) {
        setBudgetInput(new Intl.NumberFormat().format(query.budget))
      } else {
        setBudgetInput("")
      }
    }
  }, [query.budget, isLoadingSetup])

  const finalQuery: FlippingQuery = useMemo(() => {
    const result = {
      ...query,
      q: debouncedSearch || undefined,
      budget: debouncedBudget ? parseFloat(debouncedBudget.replace(/[^0-9]/g, '')) : undefined,
    }
    console.log('Final query computed:', result)
    console.log('Stable filters:', {
      maxCompetitionPerHour: result.maxCompetitionPerHour,
      maxRiskScore: result.maxRiskScore
    })
    return result
  }, [query, debouncedSearch, debouncedBudget])

  const { data: response, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["strategies-flipping", finalQuery],
    queryFn: () => fetchFlipping(finalQuery),
    staleTime: 30000,
    refetchOnWindowFocus: false,
  })

  const allItems = response?.items || []
  const itemsArray = pinFavoritesToTop 
    ? (() => {
        const favoriteItems = allItems.filter(item => favs.has(item.productId))
        const nonFavoriteItems = allItems.filter(item => !favs.has(item.productId))
        return [...favoriteItems, ...nonFavoriteItems]
      })()
    : allItems
  const currentPage = response?.page ?? 0
  const totalPages = response?.totalPages ?? 1
  const totalItems = response?.totalItems ?? 0

  const updateQuery = (updates: Partial<FlippingQuery>) => {
    setQuery((prev) => ({ ...prev, ...updates, page: 0 }))
  }

  const updatePage = (page: number) => setQuery((prev) => ({ ...prev, page }))

  const goToPreviousPage = () => currentPage > 0 && updatePage(currentPage - 1)
  const goToNextPage = () => currentPage < (totalPages - 1) && updatePage(currentPage + 1)

  const resetTradingSetup = () => {
    setQuery(prev => ({
      ...prev,
      sort: "score",
      horizonHours: 1,
      maxTime: 1,
      disableCompetitionPenalties: false,
      disableRiskPenalties: false,
      minUnitsPerHour: undefined,
      maxUnitsPerHour: undefined,
      maxCompetitionPerHour: undefined,
      maxRiskScore: undefined,
    }))
    setBazaarTaxRate(0.01125)
    setCurrentPreset("default")
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Bazaar Flipping</h2>
          <Button onClick={() => refetch()} variant="outline" size="sm" disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            {isFetching ? 'Refreshing…' : 'Refresh'}
          </Button>
        </div>

        {/* Trading Setup */}
        <TradingSetup
          query={query}
          updateQuery={updateQuery}
          resetTradingSetup={resetTradingSetup}
          searchText={searchText}
          setSearchText={setSearchText}
          budgetInput={budgetInput}
          setBudgetInput={setBudgetInput}
          setQuery={setQuery}
          filtersOpen={filtersOpen}
          setFiltersOpen={setFiltersOpen}
          pinFavoritesToTop={pinFavoritesToTop}
            setPinFavoritesToTop={setPinFavoritesToTop}
          favCount={favs.size}
          bazaarTaxRate={bazaarTaxRate}
          setBazaarTaxRate={setBazaarTaxRate}
          currentPreset={currentPreset}
          applyPreset={applyPreset}
          tradingPresets={tradingPresets}
        />

        {/* Opportunities grid */}
        <OpportunitiesGrid
          items={itemsArray as FlipOpportunity[]}
          isLoading={isLoading}
          isFetching={isFetching}
          totalPages={totalPages}
          currentPage={currentPage}
          totalItems={totalItems}
          query={query}
          limit={query.limit || 50}
          goToPreviousPage={goToPreviousPage}
          goToNextPage={goToNextPage}
          bazaarTaxRate={bazaarTaxRate}
          favs={favs}
          toggleFav={toggleFav}
          expandedCard={expandedCard}
          setExpandedCard={setExpandedCard}
        />
      </div>
    </TooltipProvider>
  )
}
