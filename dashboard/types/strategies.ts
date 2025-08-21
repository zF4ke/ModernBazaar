export interface FlipOpportunity {
  productId: string
  displayName?: string
  instantBuyPrice: number
  instantSellPrice: number
  buyOrderPrice?: number
  sellOrderPrice?: number
  spread: number
  spreadPct: number
  demandPerHour?: number
  supplyPerHour?: number
  competitionPerHour?: number
  throughputPerHour?: number
  plannedUnitsPerHour?: number
  suggestedUnitsPerHour?: number
  profitPerItem?: number
  profitPerHour?: number
  reasonableProfitPerHour?: number
  riskScore?: number
  risky?: boolean
  score: number
  suggestedBuyFillHours?: number
  suggestedSellFillHours?: number
  suggestedTotalFillHours?: number
}

export interface FlippingQuery {
  q?: string
  minSell?: number
  maxSell?: number
  minBuy?: number
  maxBuy?: number
  minSpread?: number
  maxTime?: number
  minUnitsPerHour?: number
  maxUnitsPerHour?: number
  disableCompetitionPenalties?: boolean
  disableRiskPenalties?: boolean
  sort?: string
  budget?: number
  horizonHours?: number
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
