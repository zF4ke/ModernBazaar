export interface FlipOpportunity {
  productId: string
  displayName?: string
  instantBuyPrice: number
  instantSellPrice: number
  spread: number
  spreadPct: number
  demandPerHour?: number
  supplyPerHour?: number
  competitionPerHour?: number
  riskScore?: number
  risky?: boolean
  scoreBalanced: number
  scoreDelta: number
}

export interface FlippingQuery {
  q?: string
  minSell?: number
  maxSell?: number
  minBuy?: number
  maxBuy?: number
  minSpread?: number
  sort?: string
  mode?: "balanced" | "delta"
  page?: number
  limit?: number
}

export interface PagedResponse<T> {
  items: T[]
  page: number
  limit: number
  totalItems: number
  totalPages: number
  hasNext: boolean
  hasPrevious: boolean
}

