export interface BazaarItem {
  productId: string
  displayName: string
  lastUpdated: string
  fetchedAt: string
  weightedTwoPercentBuyPrice: number
  weightedTwoPercentSellPrice: number
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

export interface OrderBookEntry {
  orderIndex: number
  pricePerUnit: number
  amount: number
  orders: number
}

export interface ItemsQuery {
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

export interface ItemsResponse {
  items: BazaarItem[]
  page: number
  limit: number
  totalItems: number
  totalPages: number
  hasNext: boolean
  hasPrevious: boolean
}

export interface SystemMetrics {
  totalItems: number
  avgSpread: number
  volume24h: number
  apiLatency: number
  heapUsage: number
}

export interface TimeSeriesData {
  timestamp: string
  value: number
}
