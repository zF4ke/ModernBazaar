export interface SystemMetrics {
  // Campos mantidos somente para Settings
  lastFetch: string | null
  dbStatus: string
  // Additional metrics from backend
  totalItems: number
  profitableItems: number
  avgProfitMargin: number
  marketActivityScore: number
}

export interface TimeSeriesData {
  timestamp: string
  value: number
}

export interface SystemHealth {
  status: string
}
