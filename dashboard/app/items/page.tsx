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
import type { BazaarItem, ItemsQuery, ItemsResponse } from "@/types/bazaar"
import { fetchWithBackendUrl, buildQueryParams } from "@/lib/api"
import { useDebounce } from "@/hooks/use-debounce"

async function fetchItems(query: ItemsQuery): Promise<ItemsResponse> {
  const params = buildQueryParams(query)
  const response = await fetchWithBackendUrl(`/api/items?${params}`)
  if (!response.ok) throw new Error("Failed to fetch items")
  
  return response.json()
}

export default function ItemsPage() {
  const [query, setQuery] = useState<ItemsQuery>({
    sort: "spreadDesc",
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

  const {
    data: response,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["items", finalQuery],
    queryFn: () => fetchItems(finalQuery),
    placeholderData: (previousData) => previousData,
    staleTime: 30000, // 30 seconds
  })

  const itemsArray = response?.items || []
  const currentPage = response?.page ?? 0
  const totalPages = response?.totalPages ?? 1
  const totalItems = response?.totalItems ?? 0

  const updateQuery = (updates: Partial<ItemsQuery>) => {
    setQuery((prev) => ({ ...prev, ...updates }))
  }

  const resetFilters = () => {
    setQuery({ sort: "spreadDesc", limit: 50, page: 0 })
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
      updateQuery({ page })
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
          onClick={() => goToPage(currentPage - 1)}
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
          onClick={() => goToPage(currentPage + 1)}
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
        <h2 className="text-3xl font-bold tracking-tight">Items</h2>
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
              <Label htmlFor="search" className="text-sm font-medium">Search Items</Label>
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
                  <SelectItem value="spreadDesc" className="cursor-pointer">Highest Spread</SelectItem>
                  <SelectItem value="sellDesc" className="cursor-pointer">Highest Sell Price</SelectItem>
                  <SelectItem value="sellAsc" className="cursor-pointer">Lowest Sell Price</SelectItem>
                  <SelectItem value="buyDesc" className="cursor-pointer">Highest Buy Price</SelectItem>
                  <SelectItem value="buyAsc" className="cursor-pointer">Lowest Buy Price</SelectItem>
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

          <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
            <CollapsibleContent className="space-y-6">
              <Separator />
              
              {/* Advanced Filters */}
              <div>
                <h4 className="text-sm font-medium mb-3">Price Filters</h4>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <Label htmlFor="minBuy" className="text-sm">Min Buy Price</Label>
                    <Input
                      id="minBuy"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className="mt-1"
                      value={priceFilters.minBuy}
                      onChange={(e) =>
                        setPriceFilters(prev => ({ ...prev, minBuy: e.target.value }))
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="maxBuy" className="text-sm">Max Buy Price</Label>
                    <Input
                      id="maxBuy"
                      type="number"
                      step="0.01"
                      placeholder="100000.00"
                      className="mt-1"
                      value={priceFilters.maxBuy}
                      onChange={(e) =>
                        setPriceFilters(prev => ({ ...prev, maxBuy: e.target.value }))
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="minSell" className="text-sm">Min Sell Price</Label>
                    <Input
                      id="minSell"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className="mt-1"
                      value={priceFilters.minSell}
                      onChange={(e) =>
                        setPriceFilters(prev => ({ ...prev, minSell: e.target.value }))
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="maxSell" className="text-sm">Max Sell Price</Label>
                    <Input
                      id="maxSell"
                      type="number"
                      step="0.01"
                      placeholder="100000.00"
                      className="mt-1"
                      value={priceFilters.maxSell}
                      onChange={(e) =>
                        setPriceFilters(prev => ({ ...prev, maxSell: e.target.value }))
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={resetFilters} variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset All Filters
                </Button>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {/* Items Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex items-end">
              <span>
                Items ({itemsArray.length})
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
                  <TableHead className="text-right">Weighted Buy Price</TableHead>
                  <TableHead className="text-right">Weighted Sell Price</TableHead>
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
                    Loading items...
                  </TableCell>
                </TableRow>
              ) : itemsArray.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    No items found
                  </TableCell>
                </TableRow>
              ) : (
                itemsArray.map((item: BazaarItem) => (
                  <TableRow
                    key={item.productId}
                    className="cursor-pointer hover:bg-muted-foreground/5"
                  >
                    <TableCell>
                      <Link href={`/items/${item.productId}`} className="font-medium text-primary hover:underline">
                        {item.productId}
                      </Link>
                    </TableCell>
                    <TableCell>{item.displayName}</TableCell>
                    <TableCell className="text-right font-mono">{item.weightedTwoPercentBuyPrice.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono">{item.weightedTwoPercentSellPrice.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono">
                      <span className={item.spread > 0.5 ? "text-green-500 font-semibold" : ""}>
                        {item.spread.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{item.activeBuyOrdersCount}</TableCell>
                    <TableCell className="text-right">{item.activeSellOrdersCount}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {new Date(item.lastUpdated).toLocaleTimeString()}
                    </TableCell>
                  </TableRow>
                ))
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
