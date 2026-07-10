"use client"

import { CardHeader, CardTitle } from "@/components/ui/card"
import { FeatureCard } from "@/components/feature-card"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import type { ManipulationOpportunity } from "@/types/strategies"
import { OpportunitySkeletonCard } from "../../flipping/_components/opportunity-skeleton-card"
import { ManipulationCard } from "./manipulation-card"

interface ManipulationInspectorProps {
  searchText: string
  setSearchText: (value: string) => void
  items: ManipulationOpportunity[]
  isLoading: boolean
  isFetching: boolean
  enabled: boolean
  favs: Set<string>
  toggleFav: (id: string) => void
  expandedCard: string | null
  setExpandedCard: (id: string | null) => void
}

export function ManipulationInspector(props: ManipulationInspectorProps) {
  const {
    searchText, setSearchText, items, isLoading, isFetching, enabled,
    favs, toggleFav, expandedCard, setExpandedCard,
  } = props

  return (
    <FeatureCard backgroundStyle="flat">
      <CardHeader className="p-0 mb-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <CardTitle>Inspect Item</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Pull up a known item with the same manipulation math, ignoring your current budget/unit/price filters.
            </p>
          </div>
          {isFetching && !isLoading ? <span className="text-xs text-muted-foreground">Updating...</span> : null}
        </div>
      </CardHeader>

      <div className="space-y-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search item name or ID, e.g. Tool Exp Capsule"
            className="h-11 pl-9"
          />
        </div>

        {enabled && isLoading ? (
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (<OpportunitySkeletonCard key={i} index={i} />))}
          </div>
        ) : enabled && items.length === 0 ? (
          <div className="rounded border border-border/50 bg-border/10 px-3 py-4 text-sm text-muted-foreground">
            No eligible manipulation result found for this search.
          </div>
        ) : items.length > 0 ? (
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3 auto-rows-max items-start">
            {items.map((o) => (
              <ManipulationCard
                key={o.productId}
                o={o}
                fav={favs.has(o.productId)}
                onToggleFav={toggleFav}
                expandedCard={expandedCard}
                setExpandedCard={setExpandedCard}
              />
            ))}
          </div>
        ) : null}
      </div>
    </FeatureCard>
  )
}
