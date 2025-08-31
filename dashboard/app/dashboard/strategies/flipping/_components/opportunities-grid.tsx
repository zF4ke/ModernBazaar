"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FeatureCard } from "@/components/feature-card"
import { FlipOpportunity, FlippingQuery } from "@/types/strategies"
import { OpportunitySkeletonCard } from "./opportunity-skeleton-card"
import { OpportunityCard } from "./opportunity-card"
import { PaginationControls } from "./pagination-controls"
import React from "react"

interface OpportunitiesGridProps {
  items: FlipOpportunity[]
  isLoading: boolean
  isFetching: boolean
  totalPages: number
  currentPage: number
  totalItems: number
  query: FlippingQuery
  limit: number
  goToPreviousPage: () => void
  goToNextPage: () => void
  bazaarTaxRate: number
  favs: Set<string>
  toggleFav: (id: string) => void
  expandedCard: string | null
  setExpandedCard: (id: string | null) => void
}

export function OpportunitiesGrid(props: OpportunitiesGridProps) {
  const { items, isLoading, isFetching, totalPages, currentPage, totalItems, query, limit, goToPreviousPage, goToNextPage, bazaarTaxRate, favs, toggleFav, expandedCard, setExpandedCard } = props

  return (
    <FeatureCard backgroundStyle="flat">
      <CardHeader className="p-0 mb-4">
        <CardTitle>
          <div className="flex items-end">
            <span>Opportunities ({items.length})</span>
            {isLoading && (<span className="ml-2 text-xs text-muted-foreground">• Loading...</span>)}
            {isFetching && !isLoading && (<span className="ml-2 text-xs text-muted-foreground">• Updating...</span>)}
          </div>
        </CardTitle>
      </CardHeader>
      <div className={`transition-opacity duration-200 ${isFetching ? 'opacity-75' : 'opacity-100'}`}>
        {(totalPages > 1 || (isLoading && (query.page ?? 0) > 0)) && (
          <div className="mb-4"><PaginationControls currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} limit={limit} goToPreviousPageAction={goToPreviousPage} goToNextPageAction={goToNextPage} /></div>
        )}
        {isLoading ? (
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <OpportunitySkeletonCard key={i} index={i} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">No opportunities found</div>
        ) : (
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3 auto-rows-max items-start">
            {items.map(o => (
              <OpportunityCard
                key={o.productId}
                o={o}
                query={query}
                bazaarTaxRate={bazaarTaxRate}
                fav={favs.has(o.productId)}
                onToggleFav={toggleFav}
                expandedCard={expandedCard}
                setExpandedCard={setExpandedCard}
              />
            ))}
          </div>
        )}
        {(totalPages > 1 || (isLoading && (query.page ?? 0) > 0)) && (
          <div className="mt-4"><PaginationControls currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} limit={limit} goToPreviousPageAction={goToPreviousPage} goToNextPageAction={goToNextPage} /></div>
        )}
      </div>
    </FeatureCard>
  )
}
