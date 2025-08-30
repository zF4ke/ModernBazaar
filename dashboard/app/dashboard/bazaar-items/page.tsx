"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { Search, Filter, RefreshCw, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import type { BazaarItemLiveView, BazaarItemsQuery, BazaarItemsResponse } from "@/types/bazaar"
import { buildQueryParams } from "@/lib/api"
import { useBackendQuery } from "@/hooks/use-backend-query"
import { useDebounce } from "@/hooks/use-debounce"

// Fetch handled by useBackendQuery (auth by default)

export default function BazaarItemsPage() {
  const [query, setQuery] = useState<BazaarItemsQuery>({
    sort: 'spreaddesc',
    limit: 50,
    page: 0,
  })
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [spreadRange, setSpreadRange] = useState([0])
  
  // Separate state for text inputs that need debouncing
  const [searchText, setSearchText] = useState("")
  const [priceFilters, setPriceFilters] = useState({
    minBuy: "",
    maxBuy: "",
    minSell: "",
    maxSell: "",
  })
  
  // Debounce text inputs
  const debouncedSearch = useDebounce(searchText, 300)
  const debouncedPriceFilters = useDebounce(priceFilters, 500)

  // Combine query with debounced text inputs
  const finalQuery = {
    ...query,
    q: debouncedSearch || undefined,
    minBuy: debouncedPriceFilters.minBuy ? Number.parseFloat(debouncedPriceFilters.minBuy) : undefined,
    maxBuy: debouncedPriceFilters.maxBuy ? Number.parseFloat(debouncedPriceFilters.maxBuy) : undefined,
    minSell: debouncedPriceFilters.minSell ? Number.parseFloat(debouncedPriceFilters.minSell) : undefined,
    maxSell: debouncedPriceFilters.maxSell ? Number.parseFloat(debouncedPriceFilters.maxSell) : undefined,
  }





  const params = buildQueryParams(finalQuery)
  const endpoint = `/api/bazaar/items?${params}`
  const {
    data: response,
    isLoading,
    isFetching,
    refetch,
  } = useBackendQuery<BazaarItemsResponse>(endpoint, {
    staleTime: 30000,
    refetchOnWindowFocus: false,
  })

  const itemsArray = response?.items || []
  const currentPage = response?.page ?? 0
  const totalPages = response?.totalPages ?? 1
  const totalItems = response?.totalItems ?? 0

  const updateQuery = (updates: Partial<BazaarItemsQuery>) => {
    setQuery((prev) => ({ ...prev, ...updates, page: 0 }))
  }

  const updatePage = (page: number) => {
    setQuery((prev) => ({ ...prev, page }))
  }

  const resetFilters = () => {
    setQuery({ sort: undefined, limit: 50, page: 0 })
    setSpreadRange([0])
    setSearchText("")
    setPriceFilters({
      minBuy: "",
      maxBuy: "",
      minSell: "",
      maxSell: "",
    })
  }

  const goToPage = (page: number) => {
    if (page >= 0 && page < totalPages) {
      updatePage(page)
    }
  }

  const goToPreviousPage = () => {
    if (currentPage > 0) {
      updatePage(currentPage - 1)
    }
  }

  const goToNextPage = () => {
    if (currentPage < totalPages - 1) {
      updatePage(currentPage + 1)
    }
  }

  const PaginationControls = () => (
    <div className="flex items-center justify-between">
      <div className="text-sm text-muted-foreground">
        Showing {currentPage * (query.limit || 50) + 1}-{Math.min((currentPage + 1) * (query.limit || 50), totalItems)} of {totalItems} items
      </div>
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={goToPreviousPage}
          disabled={currentPage === 0}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <span className="text-sm">
          Page {currentPage + 1} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={goToNextPage}
          disabled={currentPage >= totalPages - 1}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Bazaar Items</h2>
        <Button onClick={() => refetch()} variant="outline" size="sm" disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
          {isFetching ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              <CardTitle>Filters & Search</CardTitle>
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
          {/* Always visible: Search and basic controls */}
          <div className="grid gap-4 md:grid-cols-4">
            <div className="md:col-span-2">
              <Label htmlFor="search" className="text-sm font-medium">Search Bazaar Items</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by name or product ID..."
                  className="pl-9"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
                {searchText !== debouncedSearch && searchText && (
                  <div className="absolute right-3 top-2.5">
                    <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="sort" className="text-sm font-medium">Sort By</Label>
              <Select value={query.sort} onValueChange={(value) => updateQuery({ sort: value })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="spreaddesc" className="cursor-pointer">Highest Spread</SelectItem>
                  <SelectItem value="spreadasc" className="cursor-pointer">Lowest Spread</SelectItem>
                  <SelectItem value="selldesc" className="cursor-pointer">Highest Sell Price</SelectItem>
                  <SelectItem value="sellasc" className="cursor-pointer">Lowest Sell Price</SelectItem>
                  <SelectItem value="buydesc" className="cursor-pointer">Highest Buy Price</SelectItem>
                  <SelectItem value="buyasc" className="cursor-pointer">Lowest Buy Price</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="limit" className="text-sm font-medium">Show Results</Label>
              <Select
                value={query.limit?.toString()}
                onValueChange={(value) => updateQuery({ limit: Number.parseInt(value) })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25" className="cursor-pointer">25 items</SelectItem>
                  <SelectItem value="50" className="cursor-pointer">50 items</SelectItem>
                  <SelectItem value="100" className="cursor-pointer">100 items</SelectItem>
                  <SelectItem value="200" className="cursor-pointer">200 items</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Collapsible advanced filters */}
          <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
            <CollapsibleContent className="space-y-4">
              <Separator />
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="min-buy" className="text-sm font-medium">Min Buy Price</Label>
                  <Input
                    id="min-buy"
                    type="number"
                    placeholder="0.00"
                    value={priceFilters.minBuy}
                    onChange={(e) => setPriceFilters(prev => ({ ...prev, minBuy: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max-buy" className="text-sm font-medium">Max Buy Price</Label>
                  <Input
                    id="max-buy"
                    type="number"
                    placeholder="1000.00"
                    value={priceFilters.maxBuy}
                    onChange={(e) => setPriceFilters(prev => ({ ...prev, maxBuy: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="min-sell" className="text-sm font-medium">Min Sell Price</Label>
                  <Input
                    id="min-sell"
                    type="number"
                    placeholder="0.00"
                    value={priceFilters.minSell}
                    onChange={(e) => setPriceFilters(prev => ({ ...prev, minSell: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max-sell" className="text-sm font-medium">Max Sell Price</Label>
                  <Input
                    id="max-sell"
                    type="number"
                    placeholder="1000.00"
                    value={priceFilters.maxSell}
                    onChange={(e) => setPriceFilters(prev => ({ ...prev, maxSell: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={resetFilters} variant="outline" size="sm">
                  Reset Filters
                </Button>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {/* Bazaar Items Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex items-end">
              <span>
                Bazaar Items ({itemsArray.length})
              </span>
              {isLoading && (
                <span className="ml-2 text-xs text-muted-foreground">• Loading...</span>
              )}
              {isFetching && !isLoading && (
                <span className="ml-2 text-xs text-muted-foreground">• Updating...</span>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className={`transition-opacity duration-200 ${isFetching ? 'opacity-75' : 'opacity-100'}`}>
          {/* Top Pagination Controls */}
          {!isLoading && totalPages > 1 && (
            <div className="mb-4">
              <PaginationControls />
            </div>
          )}
          
          <Table className="my-4">
            <TableHeader>
              <TableRow>
                <TableHead>Product ID</TableHead>
                <TableHead>Display Name</TableHead>
                <TableHead className="text-right">Instant Buy Price</TableHead>
                <TableHead className="text-right">Instant Sell Price</TableHead>
                <TableHead className="text-right">Spread</TableHead>
                <TableHead className="text-right">Buy Orders</TableHead>
                <TableHead className="text-right">Sell Orders</TableHead>
                <TableHead className="text-right">Last Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Loading bazaar items...
                  </TableCell>
                </TableRow>
              ) : itemsArray.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    No bazaar items found
                  </TableCell>
                </TableRow>
              ) : (
                itemsArray.map((item: BazaarItemLiveView) => {
                  const snapshot = item.snapshot
                  const hourSummary = item.lastHourSummary
                  
                  if (!snapshot) return null // Skip items without snapshot data
                  
                  return (
                    <TableRow
                      key={snapshot.productId}
                      className="cursor-pointer hover:bg-muted-foreground/5"
                    >
                      <TableCell>
                        <Link href={`/bazaar-items/${snapshot.productId}`} className="font-medium text-primary hover:underline">
                          {snapshot.productId}
                        </Link>
                      </TableCell>
                      <TableCell>{snapshot.displayName || "Unknown"}</TableCell>
                      <TableCell className="text-right">
                        <div className="font-mono">{snapshot.instantBuyPrice.toFixed(2)}</div>
                        <div className="text-xs text-muted-foreground font-mono">
                          weighted: {snapshot.weightedTwoPercentBuyPrice.toFixed(2)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="font-mono">{snapshot.instantSellPrice.toFixed(2)}</div>
                        <div className="text-xs text-muted-foreground font-mono">
                          weighted: {snapshot.weightedTwoPercentSellPrice.toFixed(2)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        <span className={snapshot.spread > 0.5 ? "text-green-500 font-semibold" : ""}>
                          {snapshot.spread.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{snapshot.activeBuyOrdersCount}</TableCell>
                      <TableCell className="text-right">{snapshot.activeSellOrdersCount}</TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {new Date(snapshot.lastUpdated).toLocaleTimeString()}
                      </TableCell>
                    </TableRow>
                  )
                }).filter(Boolean)
              )}
            </TableBody>
          </Table>

          {/* Bottom Pagination Controls */}
          {!isLoading && totalPages > 1 && (
            <div className="mt-4">
              <PaginationControls />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 
