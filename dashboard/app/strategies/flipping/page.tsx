"use client"

import { useEffect, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import {
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Star,
  TrendingUp,
  Package,
  ShieldAlert,
  BarChart3,
  ArrowUpDown,
  Trophy,
  Coins,
  Timer,
  Activity,
  ArrowUp,
  ArrowDown,
  Clock,
  Info,
  Target,
  Calculator,
  AlertCircle,
  Users
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import type { FlipOpportunity, FlippingQuery, PagedResponse } from "@/types/strategies"
import { fetchWithBackendUrl, buildQueryParams } from "@/lib/api"
import { useDebounce } from "@/hooks/use-debounce"

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

  // debounced search
  const [searchText, setSearchText] = useState("")
  const debouncedSearch = useDebounce(searchText, 300)

  // debounced budget
  const [budgetInput, setBudgetInput] = useState("")
  const debouncedBudget = useDebounce(budgetInput, 500)

  // Sync budget input with query
  useEffect(() => {
    if (query.budget) {
      setBudgetInput(new Intl.NumberFormat().format(query.budget))
    } else {
      setBudgetInput("")
    }
  }, [query.budget])

  const finalQuery: FlippingQuery = useMemo(() => {
    const result = {
      ...query,
      q: debouncedSearch || undefined,
      budget: debouncedBudget ? parseFloat(debouncedBudget.replace(/[^0-9]/g, '')) : undefined,
    }
    console.log('Final query computed:', result)
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

  const resetAll = () => {
    setQuery({ sort: "score", limit: query.limit ?? 50, page: 0 })
    setSearchText("")
    setBudgetInput("")
    setPinFavoritesToTop(false)
  }

  const PaginationControls = () => (
    <div className="flex items-center justify-between">
      <div className="text-sm text-muted-foreground">
        Showing {currentPage * (query.limit || 50) + 1}-{Math.min((currentPage + 1) * (query.limit || 50), totalItems)} of {totalItems} items
      </div>
      <div className="flex items-center space-x-2">
        <Button variant="outline" size="sm" onClick={goToPreviousPage} disabled={currentPage === 0}>
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <span className="text-sm">Page {currentPage + 1} of {totalPages}</span>
        <Button variant="outline" size="sm" onClick={goToNextPage} disabled={currentPage >= totalPages - 1}>
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )

  const format = (n: number | undefined, d = 0) => n !== undefined ? new Intl.NumberFormat(undefined, { maximumFractionDigits: d, minimumFractionDigits: d }).format(n) : "-"
  
  const formatTime = (hours: number | undefined) => {
    if (!hours) return "N/A"
    if (hours < 1) return `${Math.round(hours * 60)}m`
    if (hours < 24) return `${hours.toFixed(1)}h`
    return `${Math.round(hours / 24)}d`
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
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <CardTitle>Trading Setup</CardTitle>
              <CardDescription>Configure your budget and time horizon</CardDescription>
            </div>
            <Button
              onClick={() => setFiltersOpen(!filtersOpen)}
              variant="ghost" 
              size="sm"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {filtersOpen ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  <span>Collapse</span>
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  <span>Expand</span>
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Budget & Horizon - Primary */}
          <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Coins className="h-4 w-4" />
                  Your Budget
                </Label>
              <Input
                  inputMode="numeric" 
                  type="text" 
                  placeholder="Enter your budget (e.g. 1,000,000)" 
                  value={budgetInput} 
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, '');
                    if (value) {
                      const numValue = parseInt(value);
                      setBudgetInput(new Intl.NumberFormat().format(numValue));
                    } else {
                      setBudgetInput("");
                    }
                  }}
                  className="h-12 text-base"
                />
                <p className="text-xs text-muted-foreground">How many coins you want to invest</p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Timer className="h-4 w-4" />
                Time Horizon & Max Time
              </Label>
                              <Select value={query.horizonHours?.toString() ?? "1"} onValueChange={(value) => {
                                const hours = parseFloat(value);
                                updateQuery({ horizonHours: hours, maxTime: hours });
                              }}>
                  <SelectTrigger className="h-12 text-sm">
                    <SelectValue placeholder="Select timeframe" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="0.25">15 minutes</SelectItem>
                    <SelectItem value="0.5">30 minutes</SelectItem>
                    <SelectItem value="1">1 hour</SelectItem>
                    <SelectItem value="2">2 hours</SelectItem>
                    <SelectItem value="6">6 hours</SelectItem>
                    <SelectItem value="24">1 day</SelectItem>
                    <SelectItem value="168">1 week</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">How long you plan to hold items (also sets max completion time)</p>
                  </div>
          </div>

          {filtersOpen && (
            <>
              <Separator />
              
              {/* Advanced options */}
              <div className="space-y-4">
                {/* Favorites priority */}
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Star className="h-4 w-4" />
                      Pin Favorites to Top
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Show your starred opportunities first ({favs.size} items)
                    </p>
                  </div>
                  <Switch
                    checked={pinFavoritesToTop}
                    onCheckedChange={setPinFavoritesToTop}
                  />
                </div>

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
                <Separator />

                <div className="grid gap-4 md:grid-cols-2">

                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Activity className="h-4 w-4" />
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
                      <Target className="h-4 w-4" />
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



                {/* Scoring Penalty Toggles */}
                <Separator />
                <div className="space-y-3">
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

              </div>
            </>
          )}


        </CardContent>
      </Card>

      {/* Opportunities grid */}
      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex items-end">
              <span>Opportunities ({itemsArray.length})</span>
              {isLoading && (<span className="ml-2 text-xs text-muted-foreground">• Loading...</span>)}
              {isFetching && !isLoading && (<span className="ml-2 text-xs text-muted-foreground">• Updating...</span>)}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className={`transition-opacity duration-200 ${isFetching ? 'opacity-75' : 'opacity-100'}`}>
          {(totalPages > 1 || (isLoading && (query.page ?? 0) > 0)) && (
            <div className="mb-4"><PaginationControls /></div>
          )}

          {isLoading ? (
             <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
               {Array.from({ length: 6 }).map((_, i) => (
                 <Card key={i} className="h-full overflow-hidden bg-background/80 border-border/50">
                   <CardHeader className="pb-4 pt-5">
                     <div className="flex items-start justify-between gap-3">
                       <div className="min-w-0 flex-1">
                         <div className="flex items-center gap-2 mb-1">
                           <div className="h-5 bg-neutral-700 rounded w-32"></div>
                           <div className="h-4 w-4 bg-neutral-700 rounded"></div>
                         </div>
                         <div className="h-3 bg-neutral-700 rounded w-24 mb-3"></div>
                         
                         {/* Key metric highlight skeleton */}
                         <div className="flex items-center gap-3 mb-3">
                           <div className="flex items-center gap-1">
                             <div className="h-4 w-4 bg-neutral-700 rounded"></div>
                             <div className="h-5 bg-neutral-700 rounded w-16"></div>
                             <div className="h-3 bg-neutral-700 rounded w-12"></div>
                           </div>
                           <div className="flex items-center gap-1">
                             <div className="h-3 w-3 bg-neutral-700 rounded"></div>
                             <div className="h-4 bg-neutral-700 rounded w-8"></div>
                           </div>
                         </div>

                         {/* Status badges skeleton */}
                         <div className="flex flex-wrap items-center gap-1.5">
                           <div className="h-5 bg-neutral-700 rounded w-16"></div>
                           <div className="h-5 bg-neutral-700 rounded w-12"></div>
                           <div className="h-5 bg-neutral-700 rounded w-10"></div>
                         </div>
                       </div>
                     </div>
                   </CardHeader>
                   <CardContent className="space-y-4 pt-0 pb-5">
                     {/* Buy/Sell prices skeleton */}
                     <div className="grid grid-cols-2 gap-3">
                       <div className="bg-neutral-800/50 border border-neutral-700/50 rounded-lg p-3">
                         <div className="h-3 bg-neutral-700 rounded w-12 mb-1"></div>
                         <div className="h-4 bg-neutral-700 rounded w-16"></div>
                       </div>
                       <div className="bg-neutral-800/50 border border-neutral-700/50 rounded-lg p-3">
                         <div className="h-3 bg-neutral-700 rounded w-12 mb-1"></div>
                         <div className="h-4 bg-neutral-700 rounded w-16"></div>
                       </div>
                     </div>

                     {/* Market data skeleton */}
                     <div className="flex items-center justify-between pt-2 border-t border-neutral-700/50">
                       <div className="h-3 bg-neutral-700 rounded w-24"></div>
                       <div className="h-3 bg-neutral-700 rounded w-16"></div>
                     </div>
                   </CardContent>
                 </Card>
               ))}
             </div>
          ) : itemsArray.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">No opportunities found</div>
          ) : (
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3 auto-rows-max items-start">
              {itemsArray.map((o: FlipOpportunity) => {
                const buy = (o.buyOrderPrice ?? o.instantSellPrice) || 0
                const sell = (o.sellOrderPrice ?? o.instantBuyPrice) || 0
                const d = o.demandPerHour ?? 0
                const s = o.supplyPerHour ?? 0
                const ratio = d > 0 ? s / d : 0
                const riskPct = o.riskScore !== undefined ? Math.round(o.riskScore * 100) : undefined
                const fav = favs.has(o.productId)
                const href = `/bazaar-items/${o.productId}`
                const spreadPctVal = (o.spreadPct ?? 0) * 100
                const strongGreen = 'bg-emerald-500/10 text-emerald-300'
                const strongAmber = 'bg-amber-500/10 text-amber-300'
                const strongRed = 'bg-red-500/10 text-red-300'
                const neutral = 'bg-zinc-800/60 text-zinc-300'
                                 const spreadBadge = spreadPctVal >= 20 ? strongGreen : spreadPctVal >= 10 ? strongAmber : neutral
                 const riskBadge = riskPct !== undefined && riskPct >= 50 ? strongRed : neutral
                 const ratioBadge = ratio >= 0.8 ? strongGreen : ratio >= 0.5 ? strongAmber : strongRed
                 
                 // Competition score badge
                 const competitionScore = o.competitionPerHour ?? 0
                 const competitionBadge = competitionScore >= 1000 ? strongRed : competitionScore >= 500 ? strongAmber : strongGreen

                const profitColor = (o.reasonableProfitPerHour ?? 0) * (query.horizonHours || 1) >= 900000
                  ? 'text-emerald-400'
                  : 'text-foreground'
                
                const isExpanded = expandedCard === o.productId
                const handleCardClick = (e: React.MouseEvent) => {
                  // Don't expand if clicking on links or buttons
                  if ((e.target as HTMLElement).closest('a, button')) return
                  
                  const cardElement = e.currentTarget as HTMLElement
                  
                  // Only expand, don't collapse on card click
                  if (!isExpanded) {
                    setExpandedCard(o.productId)
                    // Scroll to center the card after animation completes
                    setTimeout(() => {
                      // Use requestAnimationFrame for better timing
                      requestAnimationFrame(() => {
                        if (cardElement) {
                          cardElement.scrollIntoView({
                            behavior: 'smooth',
                            block: 'center',
                            inline: 'nearest'
                          })
                        }
                      })
                    }, 0)
                  }
                }

                const handleCollapse = (e: React.MouseEvent) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setExpandedCard(null)
                }

                return (
                                     <Card 
                     key={o.productId}
                     className={`group overflow-hidden transition-all ease-out bg-background/80 border-border/50 cursor-pointer hover:shadow-lg hover:border-border ${isExpanded ? 'shadow-xl' : 'hover:border-muted-foreground/30'}`}
                     onClick={handleCardClick}
                   >
                     <CardHeader className="pb-3 pt-6">
                        <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="font-semibold truncate text-base">
                              {o.displayName || o.productId}
                            </div>
                            <button
                              aria-label={fav ? 'Unfavorite' : 'Favorite'}
                              aria-pressed={fav}
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFav(o.productId); }}
                               className={`p-1 rounded-md transition-colors ${fav ? 'bg-amber-500/20 text-amber-400' : 'text-muted-foreground hover:bg-muted hover:text-amber-400'}`}
                            >
                              <Star className={`h-4 w-4 ${fav ? 'fill-amber-400' : ''}`} />
                            </button>
                           </div>
                           <Link href={href}>
                             <div className="text-xs text-muted-foreground truncate hover:underline hover:decoration-2 transition-all cursor-pointer">
                               {o.productId}
                             </div>
                           </Link>
                         </div>
                                                  {/* Move score to corner with subtle expand indicator */}
                         <div className="text-right">
                           <div className="text-xs text-muted-foreground">Score</div>
                           <div className="text-sm font-semibold">{format(o.score, 2)}</div>
                           <div className={`text-xs text-muted-foreground/50 transition-all mt-1 ${isExpanded ? 'text-muted-foreground/70' : 'group-hover:text-muted-foreground'}`}>
                             ⋯
                           </div>
                          </div>
                        </div>
                      </CardHeader>
                     <CardContent className="space-y-4 pt-0 pb-4">
                       {/* Profit & Suggested Amount - Prominent */}
                       <div className="bg-border/20 border border-border/40 rounded-lg p-4">
                         <div className="flex items-center justify-between mb-2">
                           <div className="flex items-center gap-1">
                             <Activity className="h-4 w-4 text-muted-foreground" />
                             <span className="text-sm font-medium">
                               Expected Profit
                               {query.horizonHours && query.horizonHours !== 1 && (
                                 <span className="text-muted-foreground"> ({format(query.horizonHours, 1)}h)</span>
                               )}
                             </span>
                           </div>
                           <div className="flex items-center gap-1">
                             <Package className="h-4 w-4 text-muted-foreground" />
                             <span className="text-sm font-semibold text-muted-foreground">
                               {format(o.suggestedUnitsPerHour, 0)} units/hr
                             </span>
                           </div>
                         </div>
                         <div className={`text-2xl font-bold mb-1 ${profitColor}`}>
                           {format((o.reasonableProfitPerHour || 0) * (query.horizonHours || 1), 0)} coins
                           {query.horizonHours && query.horizonHours !== 1 && (
                             <span className="text-sm text-muted-foreground ml-1">
                               ({format(query.horizonHours, 1)}h)
                             </span>
                           )}
                         </div>
                         
                         {/* ETA Information */}
                         {((o as any).suggestedTotalFillHours || (o as any).suggestedBuyFillHours || (o as any).suggestedSellFillHours) && (
                           <div className="flex items-center gap-4 text-xs text-muted-foreground mt-3">
                             {(o as any).suggestedBuyFillHours && (
                               <div className="flex items-center gap-1">
                                 <ArrowDown className="h-3 w-3 text-red-400" />
                                 <span>Buy: {formatTime((o as any).suggestedBuyFillHours)}</span>
                               </div>
                             )}
                             {(o as any).suggestedSellFillHours && (
                               <div className="flex items-center gap-1">
                                 <ArrowUp className="h-3 w-3 text-emerald-400" />
                                 <span>Sell: {formatTime((o as any).suggestedSellFillHours)}</span>
                               </div>
                             )}
                             {(o as any).suggestedTotalFillHours && (
                               <div className="flex items-center gap-1">
                                 <Clock className="h-3 w-3 text-muted-foreground" />
                                 <span>Total: {formatTime((o as any).suggestedTotalFillHours)}</span>
                               </div>
                             )}
                           </div>
                         )}
                       </div>
 
                       {/* Buy/Sell prices - Compact */}
                       <div className="grid grid-cols-2 gap-2">
                         <div className="bg-red-500/10 border border-red-500/20 rounded p-2">
                           <div className="flex items-center gap-1 text-xs text-red-300 mb-1">
                             <ArrowDown className="h-3 w-3" />
                             Buy at
                           </div>
                           <div className="text-sm font-mono font-semibold text-red-400">{format(buy, 2)}</div>
                         </div>
                         <div className="bg-emerald-500/10 border border-emerald-500/20 rounded p-2">
                           <div className="flex items-center gap-1 text-xs text-emerald-300 mb-1">
                             <ArrowUp className="h-3 w-3" />
                             Sell at
                           </div>
                           <div className="text-sm font-mono font-semibold text-emerald-400">{format(sell, 2)}</div>
                         </div>
                       </div>

                       {/* Status badges & Market data */}
                       <div className="space-y-2">
                         <div className="flex flex-wrap items-center gap-1.5">
                           <Badge variant="outline" className={`text-[10px] px-2 py-0.5 ${spreadPctVal >= 20 ? 'border-emerald-500/50 text-emerald-400' : spreadPctVal >= 10 ? 'border-amber-500/50 text-amber-400' : 'border-zinc-600 text-zinc-400'}`}>
                             <TrendingUp className="h-3 w-3 mr-1" />
                             {format(spreadPctVal, 0)}% spread
                           </Badge>
                           {riskPct !== undefined && (
                             o.riskNote ? (
                               <Tooltip>
                                 <TooltipTrigger asChild>
                                   <Badge variant="outline" className={`text-[10px] px-2 py-0.5 cursor-help ${riskPct >= 50 ? 'border-red-500/50 text-red-400' : 'border-zinc-600 text-zinc-400'}`}>
                                     <ShieldAlert className="h-3 w-3 mr-1" />
                                     {riskPct}% risk
                                   </Badge>
                                 </TooltipTrigger>
                                 <TooltipContent>
                                   <p className="max-w-xs text-sm">{o.riskNote}</p>
                                 </TooltipContent>
                               </Tooltip>
                             ) : (
                               <Badge variant="outline" className={`text-[10px] px-2 py-0.5 ${riskPct >= 50 ? 'border-red-500/50 text-red-400' : 'border-zinc-600 text-zinc-400'}`}>
                                 <ShieldAlert className="h-3 w-3 mr-1" />
                                 {riskPct}% risk
                               </Badge>
                             )
                           )}
                           <Badge variant="outline" className={`text-[10px] px-2 py-0.5 ${competitionScore >= 1000 ? 'border-red-500/50 text-red-400' : competitionScore >= 500 ? 'border-amber-500/50 text-amber-400' : 'border-zinc-600 text-zinc-400'}`}>
                             <Users className="h-3 w-3 mr-1" />
                             {format(competitionScore, 0)} comp
                           </Badge>
                           <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                             <BarChart3 className="h-3 w-3" />
                             <span>Demand {format(d,0)} · Supply {format(s,0)}</span>
                           </div>
                         </div>
                       </div>

                       {/* Expanded Tutorial Content */}
                       <div className={`overflow-hidden transition-all duration-100 ease-out ${isExpanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
                         <div className="mt-4 pt-4 border-t border-border/50">
                           <div className="flex items-center gap-2 mb-3">
                             <Info className="h-4 w-4 text-blue-400" />
                             <span className="text-sm font-medium text-blue-400">Trading Tutorial</span>
                           </div>
                           
                           <div className="space-y-3 text-sm">
                             {/* Step 1: How many to buy */}
                             <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                               <div className="flex items-center gap-2 mb-2">
                                 <Target className="h-4 w-4 text-blue-400" />
                                 <span className="font-medium text-blue-300">Step 1: Calculate Purchase Amount</span>
                               </div>
                               <div className="text-xs text-muted-foreground space-y-1">
                                 <div className="flex items-center justify-between">
                                   <span>Suggested amount per hour:</span>
                                   <span className="font-mono text-blue-300">{format(o.suggestedUnitsPerHour, 0)} units</span>
                                 </div>
                                 {query.horizonHours && (
                                   <div className="flex items-center justify-between">
                                     <span>For {query.horizonHours}h timeframe:</span>
                                     <span className="font-mono text-blue-300">{format((o.suggestedUnitsPerHour || 0) * query.horizonHours, 0)} units</span>
                                   </div>
                                 )}
                                 <div className="flex items-center justify-between border-t border-blue-500/20 pt-1">
                                   <span>Total investment needed:</span>
                                   <span className="font-mono text-blue-300">
                                     {format((query.horizonHours || 1) * Math.round(o.suggestedUnitsPerHour || 0) * buy, 0)} coins
                                   </span>
                                 </div>
                               </div>
                             </div>

                             {/* Step 2: Buy orders */}
                             <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                               <div className="flex items-center gap-2 mb-2">
                                 <ArrowDown className="h-4 w-4 text-red-400" />
                                 <span className="font-medium text-red-300">Step 2: Place Buy Orders</span>
                               </div>
                               <div className="text-xs text-muted-foreground space-y-1">
                                 <div>• Go to the Bazaar and search for <span className="font-mono text-red-300">{o.displayName || o.productId}</span></div>
                                 <div>• Place buy orders at <span className="font-mono text-red-300">{format(buy, 2)} coins</span> each</div>
                                 <div>• Expected fill time: <span className="text-red-300">{(o as any).suggestedBuyFillHours ? formatTime((o as any).suggestedBuyFillHours) : 'Unknown'}</span></div>
                               </div>
                             </div>

                             {/* Step 3: Sell orders */}
                             <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
                               <div className="flex items-center gap-2 mb-2">
                                 <ArrowUp className="h-4 w-4 text-emerald-400" />
                                 <span className="font-medium text-emerald-300">Step 3: Place Sell Orders</span>
                               </div>
                               <div className="text-xs text-muted-foreground space-y-1">
                                 <div>• Once items are bought, place sell orders at <span className="font-mono text-emerald-300">{format(sell, 2)} coins</span> each</div>
                                 <div>• Expected fill time: <span className="text-emerald-300">{(o as any).suggestedSellFillHours ? formatTime((o as any).suggestedSellFillHours) : 'Unknown'}</span></div>
                                 <div>• Total expected time: <span className="text-emerald-300">{(o as any).suggestedTotalFillHours ? formatTime((o as any).suggestedTotalFillHours) : 'Unknown'}</span></div>
                               </div>
                             </div>

                             {/* Step 4: Profit Setup */}
                             <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
                               <div className="flex items-center gap-2 mb-2">
                                 <Calculator className="h-4 w-4 text-purple-400" />
                                 <span className="font-medium text-purple-300">Step 4: Profit Setup</span>
                               </div>
                               <div className="text-xs text-muted-foreground space-y-1">
                                 <div className="flex items-center justify-between">
                                   <span>Per unit profit:</span>
                                   <span className="font-mono text-purple-300">{format(sell - buy, 2)} coins</span>
                                 </div>
                                 <div className="flex items-center justify-between">
                                   <span>Per hour profit:</span>
                                   <span className="font-mono text-purple-300">{format(o.reasonableProfitPerHour, 0)} coins</span>
                                 </div>
                                 {query.horizonHours && (
                                   <div className="flex items-center justify-between border-t border-purple-500/20 pt-1">
                                     <span>Timeframe profit:</span>
                                     <span className="font-mono text-purple-300">{format((o.reasonableProfitPerHour || 0) * query.horizonHours, 0)} coins</span>
                                   </div>
                                 )}
                               </div>
                             </div>

                             {/* Risk Warning */}
                             {riskPct !== undefined && riskPct >= 30 && (
                               <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                                 <div className="flex items-center gap-2 mb-2">
                                   <AlertCircle className="h-4 w-4 text-amber-400" />
                                   <span className="font-medium text-amber-300">Risk Warning</span>
                          </div>
                                 <div className="text-xs text-muted-foreground">
                                   This flip has a <span className="text-amber-300">{riskPct}% risk score</span>. Market conditions can change quickly - monitor your orders closely.
                          </div>
                        </div>
                             )}

                             <div className="text-center pt-2">
                               <Button
                                 variant="ghost"
                                 size="sm"
                                 onClick={handleCollapse}
                                 className="h-8 w-8 p-0 hover:bg-muted hover:text-foreground transition-colors"
                               >
                                 <ChevronUp className="h-4 w-4" />
                               </Button>
                             </div>
                          </div>
                        </div>
                        </div>
                      </CardContent>
                    </Card>
                )
              })}
            </div>
          )}

          {(totalPages > 1 || (isLoading && (query.page ?? 0) > 0)) && (
            <div className="mt-4"><PaginationControls /></div>
          )}
        </CardContent>
      </Card>
    </div>
    </TooltipProvider>
  )
}
