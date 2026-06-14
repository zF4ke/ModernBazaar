"use client"

import { CardHeader, CardTitle } from "@/components/ui/card"
import { FeatureCard } from "@/components/feature-card"
import { ManipulationOpportunity, ManipulationQuery } from "@/types/strategies"
import { OpportunitySkeletonCard } from "../../flipping/_components/opportunity-skeleton-card"
import { PaginationControls } from "../../flipping/_components/pagination-controls"
import { ManipulationCard } from "./manipulation-card"
import React from "react"

interface ManipulationGridProps {
  items: ManipulationOpportunity[]
  isLoading: boolean
  isFetching: boolean
  totalPages: number
  currentPage: number
  totalItems: number
  query: ManipulationQuery
  limit: number
  goToPreviousPage: () => void
  goToNextPage: () => void
  favs: Set<string>
  toggleFav: (id: string) => void
  expandedCard: string | null
  setExpandedCard: (id: string | null) => void
}

export function ManipulationGrid(props: ManipulationGridProps) {
  const { items, isLoading, isFetching, totalPages, currentPage, totalItems, query, limit, goToPreviousPage, goToNextPage, favs, toggleFav, expandedCard, setExpandedCard } = props

  const showPagination = totalPages > 1 || (isLoading && (query.page ?? 0) > 0)

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
      <div className={`transition-opacity duration-200 ${isFetching ? "opacity-75" : "opacity-100"}`}>
        {showPagination && (
          <div className="mb-4"><PaginationControls currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} limit={limit} goToPreviousPageAction={goToPreviousPage} goToNextPageAction={goToNextPage} /></div>
        )}
        {isLoading ? (
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (<OpportunitySkeletonCard key={i} index={i} />))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">No opportunities found. Try raising your budget or lowering the demand/supply filter.</div>
        ) : (
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
        )}
        {showPagination && (
          <div className="mt-4"><PaginationControls currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} limit={limit} goToPreviousPageAction={goToPreviousPage} goToNextPageAction={goToNextPage} /></div>
        )}
      </div>
    </FeatureCard>
  )
}
