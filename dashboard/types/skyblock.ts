export interface SkyblockItem {
  id: string
  name: string
  material: string
  color: string
  category: string
  tier: string
  npcSellPrice: number | null
  statsJson: string
  lastRefreshed: string
}

export interface SkyblockItemQuery {
  q?: string
  tier?: string
  category?: string
  inBazaar?: boolean
  minNpc?: number
  maxNpc?: number
  limit?: number
  page?: number
}

export interface SkyblockItemsResponse {
  items: SkyblockItem[]
  page: number
  limit: number
  totalItems: number
  totalPages: number
  hasNext: boolean
  hasPrevious: boolean
} 