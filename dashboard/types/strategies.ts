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
  riskNote?: string // nota textual de risco para tooltip
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
  maxCompetitionPerHour?: number
  maxRiskScore?: number
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

// Mirrors ManipulationOpportunityResponseDTO on the backend.
export interface ManipulationOpportunity {
  productId: string
  displayName?: string
  // current market
  instantBuyPrice: number
  instantSellPrice: number
  currentHighestBuyOrder: number
  // cornering the market
  cornerSupplyUnits: number
  cornerCost: number
  avgBuyCostPerUnit: number
  // pricing
  taxRate: number
  minResellPrice: number
  roi: number
  targetBuyOrderPrice: number
  suggestedSellOrderPrice: number
  buyOrderDoublingSteps: number
  // demand / supply
  demandPerHour?: number
  supplyPerHour?: number
  demandSupplyRatio?: number
  activeSellOrders: number
  activeBuyOrders: number
  createdBuyOrdersPerHour?: number
  createdSellOrdersPerHour?: number
  buyOrderUnitsPerHour?: number
  sellPressureUnitsPerHour?: number
  bidUpMovesPerHour?: number
  bidUpPriceDeltaPerHour?: number
  sellVolume: number
  buyVolume: number
  // economics
  netProfitPerUnit: number
  totalProfit: number
  estimatedSellThroughHours?: number
  // risk + ranking
  risky?: boolean
  riskNote?: string
  score: number
}

export interface ManipulationQuery {
  q?: string
  budget?: number
  roi?: number
  taxRate?: number
  sellWallFactor?: number
  minDemandSupplyRatio?: number
  minProfit?: number
  maxCornerSupply?: number
  sort?: string
  page?: number
  limit?: number
}
