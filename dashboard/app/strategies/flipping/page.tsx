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
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
    sort: "balanced",
    mode: "balanced",
    limit: 50,
    page: 0,
  })
  const [filtersOpen, setFiltersOpen] = useState(false)

  // debounced search
  const [searchText, setSearchText] = useState("")
  const debouncedSearch = useDebounce(searchText, 300)

  const finalQuery: FlippingQuery = {
    ...query,
    q: debouncedSearch || undefined,
  }

  const { data: response, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["strategies-flipping", finalQuery],
    queryFn: () => fetchFlipping(finalQuery),
    staleTime: 30000,
    refetchOnWindowFocus: false,
  })

  const itemsArray = response?.items || []
  const currentPage = response?.page ?? 0
  const totalPages = response?.totalPages ?? 1
  const totalItems = response?.totalItems ?? 0

  const updateQuery = (updates: Partial<FlippingQuery>) => {
    setQuery((prev) => ({ ...prev, ...updates, page: 0 }))
  }

  const updatePage = (page: number) => setQuery((prev) => ({ ...prev, page }))

  const goToPreviousPage = () => currentPage > 0 && updatePage(currentPage - 1)
  const goToNextPage = () => currentPage < (totalPages - 1) && updatePage(currentPage + 1)

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Strategies · Flipping</h2>
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
              <CardTitle>Filters & Ranking</CardTitle>
              <CardDescription>Pesquisa, ordenação e modo de score</CardDescription>
            </div>
            <Button
              onClick={() => setFiltersOpen(!filtersOpen)}
              variant="ghost" size="sm"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {filtersOpen ? (<><ChevronUp className="h-4 w-4" /><span>Collapse</span></>) : (<><ChevronDown className="h-4 w-4" /><span>Expand</span></>)}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="md:col-span-2">
              <Label htmlFor="search" className="text-sm font-medium">Search items</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input id="search" placeholder="By name or product ID..." className="pl-9" value={searchText} onChange={(e) => setSearchText(e.target.value)} />
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
                  <SelectValue placeholder="Score (Balanced)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="balanced" className="cursor-pointer">Score (Balanced)</SelectItem>
                  <SelectItem value="delta" className="cursor-pointer">Score (Delta)</SelectItem>
                  <SelectItem value="spread" className="cursor-pointer">Highest Spread</SelectItem>
                  <SelectItem value="iselldesc" className="cursor-pointer">Highest Sell Price</SelectItem>
                  <SelectItem value="ibuydesc" className="cursor-pointer">Highest Buy Price</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="mode" className="text-sm font-medium">Scoring Mode</Label>
              <Select value={query.mode} onValueChange={(value) => updateQuery({ mode: value as FlippingQuery["mode"] })}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="balanced" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="balanced" className="cursor-pointer">Balanced (volume)</SelectItem>
                  <SelectItem value="delta" className="cursor-pointer">Delta (margin)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Advanced filters */}
          <Separator />
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="min-buy" className="text-sm font-medium">Min Buy Price</Label>
              <Input id="min-buy" type="number" placeholder="0.00" onChange={(e) => updateQuery({ minBuy: e.target.value ? parseFloat(e.target.value) : undefined })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max-buy" className="text-sm font-medium">Max Buy Price</Label>
              <Input id="max-buy" type="number" placeholder="1000.00" onChange={(e) => updateQuery({ maxBuy: e.target.value ? parseFloat(e.target.value) : undefined })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="min-spread" className="text-sm font-medium">Min Spread</Label>
              <Input id="min-spread" type="number" placeholder="0.00" onChange={(e) => updateQuery({ minSpread: e.target.value ? parseFloat(e.target.value) : undefined })} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex items-end">
              <span>Flipping Opportunities ({itemsArray.length})</span>
              {isLoading && (<span className="ml-2 text-xs text-muted-foreground">• Loading...</span>)}
              {isFetching && !isLoading && (<span className="ml-2 text-xs text-muted-foreground">• Updating...</span>)}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className={`transition-opacity duration-200 ${isFetching ? 'opacity-75' : 'opacity-100'}`}>
          {!isLoading && totalPages > 1 && (
            <div className="mb-4"><PaginationControls /></div>
          )}

          <Table className="my-4">
            <TableHeader>
              <TableRow>
                <TableHead>Product ID</TableHead>
                <TableHead>Display Name</TableHead>
                <TableHead className="text-right">Buy</TableHead>
                <TableHead className="text-right">Sell</TableHead>
                <TableHead className="text-right">Spread</TableHead>
                <TableHead className="text-right">Demand/hr</TableHead>
                <TableHead className="text-right">Supply/hr</TableHead>
                <TableHead className="text-right">Competition/hr</TableHead>
                <TableHead className="text-right">Risk</TableHead>
                <TableHead className="text-right">Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8">Loading opportunities...</TableCell>
                </TableRow>
              ) : itemsArray.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8">No opportunities found</TableCell>
                </TableRow>
              ) : (
                itemsArray.map((o: FlipOpportunity) => (
                  <TableRow key={o.productId} className="hover:bg-muted-foreground/5">
                    <TableCell>
                      <Link href={`/bazaar-items/${o.productId}`} className="font-medium text-primary hover:underline">{o.productId}</Link>
                    </TableCell>
                    <TableCell>{o.displayName || "Unknown"}</TableCell>
                    <TableCell className="text-right font-mono">{o.instantBuyPrice.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono">{o.instantSellPrice.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono">{o.spread.toFixed(2)}<span className="text-xs text-muted-foreground"> ({(o.spreadPct * 100).toFixed(2)}%)</span></TableCell>
                    <TableCell className="text-right font-mono">{o.demandPerHour?.toFixed(0) ?? "-"}</TableCell>
                    <TableCell className="text-right font-mono">{o.supplyPerHour?.toFixed(0) ?? "-"}</TableCell>
                    <TableCell className="text-right font-mono">{o.competitionPerHour?.toFixed(1) ?? "-"}</TableCell>
                    <TableCell className="text-right font-mono">{o.riskScore !== undefined ? (o.riskScore * 100).toFixed(0) + '%' : '-'}</TableCell>
                    <TableCell className="text-right font-mono">{(query.mode === 'delta' ? o.scoreDelta : o.scoreBalanced).toFixed(2)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {!isLoading && totalPages > 1 && (
            <div className="mt-4"><PaginationControls /></div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
