export interface SystemMetrics {
  totalItems: number
  avgSpread: number
  volume24h: number
  apiLatency: number
  heapUsage: number
  lastFetch: string | null
  status: string
  dbStatus: string
}

export interface TimeSeriesData {
  timestamp: string
  value: number
}

export interface SystemHealth {
  status: string
} 