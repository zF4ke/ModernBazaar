"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { Search, Filter, RefreshCw, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Layers } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { FeatureCard } from "@/components/feature-card"
import { GradientSection } from "@/components/gradient-section"
import type { SkyblockItem, SkyblockItemQuery, SkyblockItemsResponse } from "@/types/skyblock"
import { useBackendQuery } from "@/hooks/use-backend-query"
import { useDebounce } from "@/hooks/use-debounce"

// Fetch handled by useBackendQuery (auth by default)

export default function SkyblockItemsPage() {
  const [query, setQuery] = useState<SkyblockItemQuery>({ 
    limit: 50,
    page: 0,
  })
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [searchText, setSearchText] = useState("")
  const [npcFilters, setNpcFilters] = useState({
    minNpc: "",
    maxNpc: "",
  })
  
  // Separate state for text inputs that need debouncing
  const debouncedSearch = useDebounce(searchText, 300)
  const debouncedNpcFilters = useDebounce(npcFilters, 500)

  // Combine query with debounced text inputs
  const finalQuery = {
    ...query,
    q: debouncedSearch || undefined,
    minNpc: debouncedNpcFilters.minNpc ? Number.parseFloat(debouncedNpcFilters.minNpc) : undefined,
    maxNpc: debouncedNpcFilters.maxNpc ? Number.parseFloat(debouncedNpcFilters.maxNpc) : undefined,
  }

  const params = new URLSearchParams()
  if (finalQuery.q) params.append("q", finalQuery.q)
  if (finalQuery.tier) params.append("tier", finalQuery.tier)
  if (finalQuery.category) params.append("category", finalQuery.category)
  if (finalQuery.inBazaar !== undefined) params.append("inBazaar", String(finalQuery.inBazaar))
  if (finalQuery.minNpc !== undefined) params.append("minNpc", String(finalQuery.minNpc))
  if (finalQuery.maxNpc !== undefined) params.append("maxNpc", String(finalQuery.maxNpc))
  if (finalQuery.limit) params.append("limit", String(finalQuery.limit))
  if (finalQuery.page !== undefined) params.append("page", String(finalQuery.page))
  const endpoint = `/api/skyblock/items?${params.toString()}`

  const {
    data: response,
    isLoading,
    isFetching,
    refetch,
  } = useBackendQuery<SkyblockItemsResponse>(endpoint, {
    placeholderData: (prev) => prev as any,
    staleTime: 30000,
  })

  const itemsArray = response?.items || []
  const currentPage = response?.page ?? 0
  const totalPages = response?.totalPages ?? 1
  const totalItems = response?.totalItems ?? 0

  const updateQuery = (updates: Partial<SkyblockItemQuery>) => {
    setQuery((prev) => ({ ...prev, ...updates, page: 0 }))
  }

  const updatePage = (page: number) => {
    setQuery((prev) => ({ ...prev, page }))
  }

  const resetFilters = () => {
    setQuery({ limit: 50, page: 0 })
    setSearchText("")
    setNpcFilters({
      minNpc: "",
      maxNpc: "",
    })
  }

  const goToPage = (page: number) => {
    if (page >= 0 && page < totalPages) {
      updatePage(page)
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
    <div className="space-y-4 w-full max-w-full overflow-hidden">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Layers className="h-8 w-8 text-muted-foreground" />
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Skyblock Items</h2>
            <p className="text-muted-foreground">Browse and search Hypixel SkyBlock item catalog</p>
          </div>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm" disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
          {isFetching ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Filters */}
      <FeatureCard backgroundStyle="flat">
        <CardHeader className="pb-4 p-0 mb-4">
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
        <div className="space-y-6">
          {/* Always visible: Search and basic controls */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2">
              <Label htmlFor="search" className="text-sm font-medium">Search Skyblock Items</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by name or id..."
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

            <div className="w-full lg:col-span-1">
              <Label htmlFor="limit" className="text-sm font-medium">Show Results</Label>
              <Select
                value={query.limit?.toString()}
                onValueChange={(value) => updateQuery({ limit: Number.parseInt(value) })}
              >
                <SelectTrigger className="mt-1 w-full">
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
              
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="tier" className="text-sm font-medium">Tier</Label>
                  <Select value={query.tier} onValueChange={(value) => updateQuery({ tier: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select tier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="COMMON" className="cursor-pointer">Common</SelectItem>
                      <SelectItem value="UNCOMMON" className="cursor-pointer">Uncommon</SelectItem>
                      <SelectItem value="RARE" className="cursor-pointer">Rare</SelectItem>
                      <SelectItem value="EPIC" className="cursor-pointer">Epic</SelectItem>
                      <SelectItem value="LEGENDARY" className="cursor-pointer">Legendary</SelectItem>
                      <SelectItem value="MYTHIC" className="cursor-pointer">Mythic</SelectItem>
                      <SelectItem value="SPECIAL" className="cursor-pointer">Special</SelectItem>
                      <SelectItem value="SUPREME" className="cursor-pointer">Supreme</SelectItem>
                      <SelectItem value="VERY_SPECIAL" className="cursor-pointer">Very Special</SelectItem>
                      <SelectItem value="UNOBTAINABLE" className="cursor-pointer">Unobtainable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category" className="text-sm font-medium">Category</Label>
                  <Select value={query.category} onValueChange={(value) => updateQuery({ category: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACCESSORY" className="cursor-pointer">Accessory</SelectItem>
                      <SelectItem value="ARROW" className="cursor-pointer">Arrow</SelectItem>
                      <SelectItem value="ARROW_POISON" className="cursor-pointer">Arrow Poison</SelectItem>
                      <SelectItem value="AXE" className="cursor-pointer">Axe</SelectItem>
                      <SelectItem value="BAIT" className="cursor-pointer">Bait</SelectItem>
                      <SelectItem value="BELT" className="cursor-pointer">Belt</SelectItem>
                      <SelectItem value="BOOSTER" className="cursor-pointer">Booster</SelectItem>
                      <SelectItem value="BOOTS" className="cursor-pointer">Boots</SelectItem>
                      <SelectItem value="BOW" className="cursor-pointer">Bow</SelectItem>
                      <SelectItem value="BRACELET" className="cursor-pointer">Bracelet</SelectItem>
                      <SelectItem value="CARNIVAL_MASK" className="cursor-pointer">Carnival Mask</SelectItem>
                      <SelectItem value="CHESTPLATE" className="cursor-pointer">Chestplate</SelectItem>
                      <SelectItem value="CHISEL" className="cursor-pointer">Chisel</SelectItem>
                      <SelectItem value="CLOAK" className="cursor-pointer">Cloak</SelectItem>
                      <SelectItem value="CONSUMABLE" className="cursor-pointer">Consumable</SelectItem>
                      <SelectItem value="COSMETIC" className="cursor-pointer">Cosmetic</SelectItem>
                      <SelectItem value="DEPLOYABLE" className="cursor-pointer">Deployable</SelectItem>
                      <SelectItem value="DRILL" className="cursor-pointer">Drill</SelectItem>
                      <SelectItem value="DUNGEON_PASS" className="cursor-pointer">Dungeon Pass</SelectItem>
                      <SelectItem value="FISHING_NET" className="cursor-pointer">Fishing Net</SelectItem>
                      <SelectItem value="FISHING_ROD" className="cursor-pointer">Fishing Rod</SelectItem>
                      <SelectItem value="FISHING_ROD_PART" className="cursor-pointer">Fishing Rod Part</SelectItem>
                      <SelectItem value="GAUNTLET" className="cursor-pointer">Gauntlet</SelectItem>
                      <SelectItem value="GLOVES" className="cursor-pointer">Gloves</SelectItem>
                      <SelectItem value="HELMET" className="cursor-pointer">Helmet</SelectItem>
                      <SelectItem value="HOE" className="cursor-pointer">Hoe</SelectItem>
                      <SelectItem value="LASSO" className="cursor-pointer">Lasso</SelectItem>
                      <SelectItem value="LEGGINGS" className="cursor-pointer">Leggings</SelectItem>
                      <SelectItem value="LONGSWORD" className="cursor-pointer">Longsword</SelectItem>
                      <SelectItem value="MEMENTO" className="cursor-pointer">Memento</SelectItem>
                      <SelectItem value="NECKLACE" className="cursor-pointer">Necklace</SelectItem>
                      <SelectItem value="NONE" className="cursor-pointer">None</SelectItem>
                      <SelectItem value="PET_ITEM" className="cursor-pointer">Pet Item</SelectItem>
                      <SelectItem value="PICKAXE" className="cursor-pointer">Pickaxe</SelectItem>
                      <SelectItem value="PORTAL" className="cursor-pointer">Portal</SelectItem>
                      <SelectItem value="REFORGE_STONE" className="cursor-pointer">Reforge Stone</SelectItem>
                      <SelectItem value="SALT" className="cursor-pointer">Salt</SelectItem>
                      <SelectItem value="SHEARS" className="cursor-pointer">Shears</SelectItem>
                      <SelectItem value="SPADE" className="cursor-pointer">Spade</SelectItem>
                      <SelectItem value="SWORD" className="cursor-pointer">Sword</SelectItem>
                      <SelectItem value="TRAP" className="cursor-pointer">Trap</SelectItem>
                      <SelectItem value="TRAVEL_SCROLL" className="cursor-pointer">Travel Scroll</SelectItem>
                      <SelectItem value="VACUUM" className="cursor-pointer">Vacuum</SelectItem>
                      <SelectItem value="WAND" className="cursor-pointer">Wand</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="in-bazaar"
                  checked={query.inBazaar || false}
                  onCheckedChange={(checked) => updateQuery({ inBazaar: checked })}
                />
                <Label htmlFor="in-bazaar">In Bazaar Only</Label>
              </div>

              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="min-npc-price" className="text-sm font-medium">Min NPC Sell Price</Label>
                  <Input
                    id="min-npc-price"
                    type="number"
                    placeholder="0"
                    value={npcFilters.minNpc}
                    onChange={(e) => setNpcFilters({ ...npcFilters, minNpc: e.target.value })}
                    className="pl-2"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max-npc-price" className="text-sm font-medium">Max NPC Sell Price</Label>
                  <Input
                    id="max-npc-price"
                    type="number"
                    placeholder="Infinity"
                    value={npcFilters.maxNpc}
                    onChange={(e) => setNpcFilters({ ...npcFilters, maxNpc: e.target.value })}
                    className="pl-2"
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
        </div>
      </FeatureCard>

      {/* Skyblock Items Table */}
      <FeatureCard backgroundStyle="flat">
        <CardHeader className="p-0 mb-4">
          <CardTitle>
            <div className="flex items-end">
              <span>
                Skyblock Items ({itemsArray.length})
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
        <div className={`transition-opacity duration-200 ${isFetching ? 'opacity-75' : 'opacity-100'}`}>
          {/* Top Pagination Controls */}
          {!isLoading && totalPages > 1 && (
            <div className="mb-4">
              <PaginationControls />
            </div>
          )}
          
          <div className="overflow-x-auto border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[120px] max-w-[200px]">ID</TableHead>
                  <TableHead className="min-w-[100px] max-w-[150px]">Name</TableHead>
                  <TableHead className="min-w-[80px] max-w-[120px]">Material</TableHead>
                  <TableHead className="min-w-[60px] max-w-[100px]">Color</TableHead>
                  <TableHead className="min-w-[80px] max-w-[120px]">Category</TableHead>
                  <TableHead className="min-w-[60px] max-w-[100px]">Tier</TableHead>
                  <TableHead className="min-w-[80px] max-w-[120px]">NPC Sell Price</TableHead>
                  <TableHead className="min-w-[100px] max-w-[150px]">Last Refreshed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      Loading skyblock items...
                    </TableCell>
                  </TableRow>
                ) : itemsArray.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      No skyblock items found
                    </TableCell>
                  </TableRow>
                ) : (
                  itemsArray.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs break-all max-w-[200px]">{item.id}</TableCell>
                      <TableCell className="break-words max-w-[150px]">{item.name}</TableCell>
                      <TableCell className="break-words max-w-[120px]">{item.material}</TableCell>
                      <TableCell className="break-words max-w-[100px]">{item.color}</TableCell>
                      <TableCell className="break-words max-w-[120px]">{item.category}</TableCell>
                      <TableCell className="break-words max-w-[100px]">{item.tier}</TableCell>
                      <TableCell className="break-words max-w-[120px]">{item.npcSellPrice ?? "-"}</TableCell>
                      <TableCell className="text-xs break-words max-w-[150px]">{item.lastRefreshed ? new Date(item.lastRefreshed).toLocaleString() : "-"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Bottom Pagination Controls */}
          {!isLoading && totalPages > 1 && (
            <div className="mt-4">
              <PaginationControls />
            </div>
          )}
        </div>
      </FeatureCard>
    </div>
  )
} 
