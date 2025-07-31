export interface BazaarItemSnapshot {
  productId: string
  displayName?: string
  lastUpdated: string
  fetchedAt: string
  weightedTwoPercentBuyPrice: number
  weightedTwoPercentSellPrice: number
  instantBuyPrice: number
  instantSellPrice: number
  spread: number
  buyMovingWeek: number
  sellMovingWeek: number
  activeBuyOrdersCount: number
  activeSellOrdersCount: number
  buyOrders: OrderBookEntry[]
  sellOrders: OrderBookEntry[]
}

export interface BazaarItemHourSummary {
  productId: string
  displayName?: string
  hourStart: string
  openInstantBuyPrice: number
  closeInstantBuyPrice: number
  minInstantBuyPrice: number
  maxInstantBuyPrice: number
  openInstantSellPrice: number
  closeInstantSellPrice: number
  minInstantSellPrice: number
  maxInstantSellPrice: number
  newSellOrders: number
  deltaNewSellOrders: number
  newBuyOrders: number
  deltaNewBuyOrders: number
  itemsListedSellOrders: number
  itemsListedBuyOrders: number
  points?: BazaarItemHourPoint[]
}

export interface BazaarItemLiveView {
  snapshot?: BazaarItemSnapshot
  lastHourSummary?: BazaarItemHourSummary
}

export interface BazaarItemHourPoint {
  snapshotTime: string
  instantBuyPrice: number
  instantSellPrice: number
  activeBuyOrdersCount: number
  activeSellOrdersCount: number
  buyOrders: OrderBookEntry[]
  sellOrders: OrderBookEntry[]
}

export interface OrderBookEntry {
  orderIndex: number
  pricePerUnit: number
  amount: number
  orders: number
}

export interface BazaarItemsQuery {
  q?: string
  minSell?: number
  maxSell?: number
  minBuy?: number
  maxBuy?: number
  minSpread?: number
  sort?: string
  page?: number
  limit?: number
}

export interface BazaarItemsResponse {
  items: BazaarItemLiveView[]
  page: number
  limit: number
  totalItems: number
  totalPages: number
  hasNext: boolean
  hasPrevious: boolean
}

// Legacy types for backward compatibility (can be removed later)
export interface BazaarItem {
  productId: string
  displayName: string
  lastUpdated: string
  fetchedAt: string
  weightedTwoPercentBuyPrice: number
  weightedTwoPercentSellPrice: number
  instantBuyPrice: number
  instantSellPrice: number
  spread: number
  buyMovingWeek: number
  sellMovingWeek: number
  activeBuyOrdersCount: number
  activeSellOrdersCount: number
}

export interface BazaarItemDetail extends BazaarItem {
  buyOrders: OrderBookEntry[]
  sellOrders: OrderBookEntry[]
}
