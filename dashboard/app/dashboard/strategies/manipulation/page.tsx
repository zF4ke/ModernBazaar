"use client"

import { useEffect, useMemo, useState } from "react"
import { RefreshCw, Crosshair } from "lucide-react"

import { Button } from "@/components/ui/button"
import { TooltipProvider } from "@/components/ui/tooltip"
import type { ManipulationOpportunity, ManipulationQuery, PagedResponse } from "@/types/strategies"
import { buildQueryParams } from "@/lib/api"
import { useBackendQuery } from "@/hooks/use-backend-query"
import { useDebounce } from "@/hooks/use-debounce"
import { useHasPermission } from "@/hooks/use-has-permission"
import { PermissionCheck } from "@/components/permission-check"
import { LoginCheck } from "@/components/login-check"
import { GradientSection } from "@/components/gradient-section"
import { PERMISSIONS } from "@/constants/permissions"
import { ManipulationSetup } from "./_components/manipulation-setup"
import { ManipulationGrid } from "./_components/manipulation-grid"

const DEFAULT_QUERY: ManipulationQuery = {
  sort: "score",
  limit: 50,
  page: 0,
  roi: 2,
  taxRate: 0.01125,
  maxCornerSupply: 20000,
  formulaVersion: "balanced",
}

export default function ManipulationPage() {
  const [query, setQuery] = useState<ManipulationQuery>(DEFAULT_QUERY)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [expandedCard, setExpandedCard] = useState<string | null>(null)
  const [pinFavoritesToTop, setPinFavoritesToTop] = useState(false)

  // persisted favorites
  const [favs, setFavs] = useState<Set<string>>(new Set())
  useEffect(() => {
    try {
      const raw = localStorage.getItem("manipFavs")
      if (raw) setFavs(new Set(JSON.parse(raw)))
    } catch {}
  }, [])
  useEffect(() => {
    try { localStorage.setItem("manipFavs", JSON.stringify(Array.from(favs))) } catch {}
  }, [favs])
  const toggleFav = (id: string) => setFavs((prev) => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })

  // persisted setup
  const [isLoadingSetup, setIsLoadingSetup] = useState(true)
  useEffect(() => {
    try {
      const saved = localStorage.getItem("manipSetup")
      if (saved) {
        const parsed = JSON.parse(saved)
        setQuery((prev) => ({
          ...prev,
          sort: parsed.sort ?? prev.sort,
          roi: parsed.roi ?? prev.roi,
          taxRate: parsed.taxRate ?? prev.taxRate,
          minDemandSupplyRatio: parsed.minDemandSupplyRatio,
          minProfit: parsed.minProfit,
          maxCornerSupply: parsed.maxCornerSupply === 50000
            ? prev.maxCornerSupply
            : parsed.maxCornerSupply ?? prev.maxCornerSupply,
          formulaVersion: parsed.formulaVersion === "overclocker"
            ? prev.formulaVersion
            : parsed.formulaVersion ?? prev.formulaVersion,
        }))
        if (parsed.budget) setBudgetInput(new Intl.NumberFormat("en-US").format(parsed.budget))
        if (parsed.pinFavoritesToTop !== undefined) setPinFavoritesToTop(parsed.pinFavoritesToTop)
      }
    } catch {} finally {
      setTimeout(() => setIsLoadingSetup(false), 100)
    }
  }, [])

  // debounced inputs
  const [searchText, setSearchText] = useState("")
  const debouncedSearch = useDebounce(searchText, 300)
  const [budgetInput, setBudgetInput] = useState("")
  const debouncedBudget = useDebounce(budgetInput, 800)

  // persist setup (excluding budget, handled below)
  useEffect(() => {
    if (isLoadingSetup) return
    try {
      const cur = JSON.parse(localStorage.getItem("manipSetup") || "{}")
      cur.sort = query.sort
      cur.roi = query.roi
      cur.taxRate = query.taxRate
      cur.minDemandSupplyRatio = query.minDemandSupplyRatio
      cur.minProfit = query.minProfit
      cur.maxCornerSupply = query.maxCornerSupply
      cur.formulaVersion = query.formulaVersion
      cur.pinFavoritesToTop = pinFavoritesToTop
      localStorage.setItem("manipSetup", JSON.stringify(cur))
    } catch {}
  }, [query.sort, query.roi, query.taxRate, query.minDemandSupplyRatio, query.minProfit, query.maxCornerSupply, query.formulaVersion, pinFavoritesToTop, isLoadingSetup])

  useEffect(() => {
    if (isLoadingSetup) return
    try {
      const cur = JSON.parse(localStorage.getItem("manipSetup") || "{}")
      cur.budget = debouncedBudget ? parseFloat(debouncedBudget.replace(/[^0-9]/g, "")) : undefined
      localStorage.setItem("manipSetup", JSON.stringify(cur))
    } catch {}
  }, [debouncedBudget, isLoadingSetup])

  const finalQuery: ManipulationQuery = useMemo(() => ({
    ...query,
    q: debouncedSearch || undefined,
    budget: debouncedBudget ? parseFloat(debouncedBudget.replace(/[^0-9]/g, "")) : undefined,
  }), [query, debouncedSearch, debouncedBudget])

  const params = buildQueryParams(finalQuery as Record<string, any>)
  const endpoint = `/api/strategies/manipulation?${params}`
  const { data: response, isLoading, isFetching, refetch } = useBackendQuery<PagedResponse<ManipulationOpportunity>>(endpoint, {
    staleTime: 30000,
    refetchOnWindowFocus: false,
  })

  const allItems = response?.items || []
  const itemsArray = pinFavoritesToTop
    ? [...allItems.filter((i) => favs.has(i.productId)), ...allItems.filter((i) => !favs.has(i.productId))]
    : allItems
  const currentPage = response?.page ?? 0
  const totalPages = response?.totalPages ?? 1
  const totalItems = response?.totalItems ?? 0

  const updateQuery = (updates: Partial<ManipulationQuery>) => setQuery((prev) => ({ ...prev, ...updates, page: 0 }))
  const updatePage = (page: number) => setQuery((prev) => ({ ...prev, page }))
  const goToPreviousPage = () => currentPage > 0 && updatePage(currentPage - 1)
  const goToNextPage = () => currentPage < totalPages - 1 && updatePage(currentPage + 1)

  const resetSetup = () => {
    setQuery({ ...DEFAULT_QUERY })
    setBudgetInput("")
    setSearchText("")
  }

  const { hasPermission, loading: permissionLoading } = useHasPermission(PERMISSIONS.USE_BAZAAR_MANIPULATION)

  return (
    <LoginCheck
      featureName="Bazaar Manipulation"
      featureDescription="Corner thin markets and set the price"
      icon={<Crosshair className="h-8 w-8 text-muted-foreground" />}
    >
      <PermissionCheck
        requiredPermission={PERMISSIONS.USE_BAZAAR_MANIPULATION}
        featureName="Bazaar Manipulation"
        featureDescription="Corner thin markets and set the price"
        icon={<Crosshair className="h-8 w-8 text-muted-foreground" />}
        hasPermission={hasPermission}
        loading={permissionLoading}
        upgradeMessage="Unlock Bazaar Manipulation to find thin-supply, high-demand markets you can corner within your budget, with a full step-by-step plan: cost to corner, break-even resell, the inflated buy/sell orders, and expected profit."
        adminErrorDetails={
          <div className="space-y-2 text-sm">
            <p>• User lacks the <code className="bg-muted px-1 rounded">use:bazaar-manipulation</code> permission</p>
            <p>• This may be due to subscription plan restrictions</p>
            <p>• Check user&apos;s current plan and permissions in the admin panel</p>
          </div>
        }
      >
        <TooltipProvider>
          <div className="space-y-6">
            <GradientSection variant="hero" padding="md">
              <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full blur-3xl opacity-60 bg-blue-500/20" />
              <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-500/15">
                    <Crosshair className="h-6 w-6 text-blue-400" />
                  </div>
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Corner the market</h1>
                    <p className="text-sm text-muted-foreground">Thin-supply markets you can control, with the full plan and break-even.</p>
                  </div>
                </div>
                <Button onClick={() => refetch()} variant="outline" size="sm" disabled={isFetching}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
                  {isFetching ? "Refreshing…" : "Refresh"}
                </Button>
              </div>
            </GradientSection>

            <ManipulationSetup
              query={query}
              updateQuery={updateQuery}
              resetSetup={resetSetup}
              searchText={searchText}
              setSearchText={setSearchText}
              budgetInput={budgetInput}
              setBudgetInput={setBudgetInput}
              filtersOpen={filtersOpen}
              setFiltersOpen={setFiltersOpen}
              pinFavoritesToTop={pinFavoritesToTop}
              setPinFavoritesToTop={setPinFavoritesToTop}
              favCount={favs.size}
            />

            <ManipulationGrid
              items={itemsArray}
              isLoading={isLoading}
              isFetching={isFetching}
              totalPages={totalPages}
              currentPage={currentPage}
              totalItems={totalItems}
              query={query}
              limit={query.limit || 50}
              goToPreviousPage={goToPreviousPage}
              goToNextPage={goToNextPage}
              favs={favs}
              toggleFav={toggleFav}
              expandedCard={expandedCard}
              setExpandedCard={setExpandedCard}
            />
          </div>
        </TooltipProvider>
      </PermissionCheck>
    </LoginCheck>
  )
}
