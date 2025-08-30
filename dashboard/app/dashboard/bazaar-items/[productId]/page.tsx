"use client"


import { use, useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  RefreshCw, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Clock, 
  Package, 
  DollarSign, 
  BarChart3, 
  Activity, 
  ArrowUpRight, 
  ArrowDownRight, 
  Minus, 
  Plus, 
  ShoppingCart, 
  Store, 
  Info, 
  AlertCircle,
  Zap,
  Target,
  Scale,
  Timer
} from "lucide-react"
import type { BazaarItemLiveView, BazaarItemHourSummary, BazaarItemHourAverage, BazaarItemSnapshot } from "@/types/bazaar"
import { useBackendQuery, isExpectedError } from "@/hooks/use-backend-query"
import HistoryChart from "@/components/history-chart"

// Data fetching moved to useBackendQuery (includes Authorization by default)

export default function BazaarItemDetailPage({ params }: { params: Promise<{ productId: string }> }) {
  const resolvedParams = use(params)
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | '7d' | 'total'>('24h')
  const [buyOrdersCollapsed, setBuyOrdersCollapsed] = useState(false)
  const [sellOrdersCollapsed, setSellOrdersCollapsed] = useState(false)
  
  const itemEndpoint = `/api/bazaar/items/${resolvedParams.productId}`
  const {
    data: item,
    isLoading,
    isFetching,
    refetch,
  } = useBackendQuery<BazaarItemLiveView>(itemEndpoint, {
    placeholderData: (previousData) => previousData as any,
    staleTime: 30000,
    retry: (failureCount, error: any) => {
      if (failureCount >= 3) return false
      if (isExpectedError(error)) return false
      return true
    },
    retryDelay: 3000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })

  // Calculate time range for history
  const { from, to } = useMemo(() => {
    if (timeRange === 'total') {
      return { from: undefined, to: undefined }
    }
    
    const now = new Date()
    const from = new Date()
    
    switch (timeRange) {
      case '1h':
        from.setHours(now.getHours() - 1)
        break
      case '6h':
        from.setHours(now.getHours() - 6)
        break
      case '24h':
        from.setDate(now.getDate() - 1)
        break
      case '7d':
        from.setDate(now.getDate() - 7)
        break
    }
    
    return {
      from: from.toISOString(),
      to: now.toISOString()
    }
  }, [timeRange])

  // Debug logging
  console.log('Time range:', timeRange, 'From:', from, 'To:', to)

  const historyParams = new URLSearchParams()
  if (from) historyParams.append('from', from)
  if (to) historyParams.append('to', to)
  historyParams.append('withPoints', 'true')
  const historyEndpoint = `/api/bazaar/items/${resolvedParams.productId}/history?${historyParams.toString()}`
  const {
    data: history,
    isLoading: historyLoading,
    error: historyError,
  } = useBackendQuery<BazaarItemHourSummary[]>(historyEndpoint, {
    enabled: !!item,
    staleTime: 60000,
    retry: (failureCount, error: any) => {
      if (failureCount >= 3) return false
      if (isExpectedError(error)) return false
      return true
    },
    retryDelay: 5000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })

  const averageEndpoint = `/api/bazaar/items/${resolvedParams.productId}/average`
  const {
    data: average,
    isLoading: averageLoading,
    error: averageError,
  } = useBackendQuery<BazaarItemHourAverage>(averageEndpoint, {
    enabled: !!item,
    staleTime: 300000,
    retry: (failureCount, error: any) => {
      if (failureCount >= 3) return false
      if (isExpectedError(error)) return false
      return true
    },
    retryDelay: 5000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })

  const snapshotsEndpoint = `/api/bazaar/items/${resolvedParams.productId}/snapshots?limit=5`
  const {
    data: snapshots,
    isLoading: snapshotsLoading,
    error: snapshotsError,
  } = useBackendQuery<BazaarItemHourSummary[]>(snapshotsEndpoint, {
    enabled: !!item,
    staleTime: 30000,
    retry: (failureCount, error: any) => {
      if (failureCount >= 3) return false
      if (isExpectedError(error)) return false
      return true
    },
    retryDelay: 3000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })

  // Combine history with latest snapshots for real-time data
  const combinedHistory = useMemo(() => {
    if (!history || !snapshots) return history || []
    
    // Snapshots are now returned as hour summaries, so we can combine them directly
    // Combine and sort by time (newest first)
    return [...snapshots, ...history].sort((a, b) => 
      new Date(b.hourStart).getTime() - new Date(a.hourStart).getTime()
    )
  }, [history, snapshots])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-8 w-8 text-muted-foreground" />
            <h2 className="text-3xl font-bold tracking-tight">Loading...</h2>
          </div>
        </div>
      </div>
    )
  }

  if (!item) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-8 w-8 text-muted-foreground" />
            <h2 className="text-3xl font-bold tracking-tight">Bazaar Item Not Found</h2>
          </div>
        </div>
      </div>
    )
  }

  const snapshot = item.snapshot
  const hourSummary = item.lastHourSummary

  if (!snapshot) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="h-8 w-8 text-muted-foreground" />
            <h2 className="text-3xl font-bold tracking-tight">No Data Available</h2>
          </div>
        </div>
        <Card>
          <CardContent>
            <div className="flex items-center gap-2 text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              <p>No snapshot data available for this item.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Package className="h-8 w-8 text-muted-foreground" />
            <h2 className="text-3xl font-bold tracking-tight">{snapshot.displayName || snapshot.productId}</h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Target className="h-3 w-3 text-muted-foreground" />
              <p className="text-muted-foreground">Product ID: {snapshot.productId}</p>
            </div>
            {isFetching && !isLoading && (
              <div className="flex items-center gap-1">
                <Zap className="h-3 w-3 text-muted-foreground animate-pulse" />
                <span className="text-xs text-muted-foreground">Updating...</span>
              </div>
            )}
          </div>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm" disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
          {isFetching ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Current Prices */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="flex flex-col justify-between">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Instant Buy Price</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{snapshot.instantBuyPrice.toFixed(2)}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Scale className="h-3 w-3" />
              <span>weighted 2%: {snapshot.weightedTwoPercentBuyPrice.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col justify-between">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Instant Sell Price</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{snapshot.instantSellPrice.toFixed(2)}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Scale className="h-3 w-3" />
              <span>weighted 2%: {snapshot.weightedTwoPercentSellPrice.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col justify-between">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Spread</CardTitle>
            <Minus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{snapshot.spread.toFixed(2)}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <BarChart3 className="h-3 w-3" />
              <span>Buy-sell spread</span>
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col justify-between">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Updated</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold">{new Date(snapshot.lastUpdated).toLocaleString()}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Activity className="h-3 w-3" />
              <span>Fetched: {new Date(snapshot.fetchedAt).toLocaleTimeString()}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      

                    {/* 48 Hour Average Stats */}
       {average && (
         <Card>
           <CardHeader>
             <div className="flex items-center gap-2">
               <Target className="h-5 w-5 text-muted-foreground" />
               <CardTitle>48 Hour Average</CardTitle>
               {hourSummary && (
                 <div className="group relative">
                   <div className="flex items-center gap-1 px-2 py-1 rounded-md border bg-muted/50 hover:text-white cursor-help text-muted-foreground transition-colors duration-200 hover:shadow-sm">
                     <Activity className="h-4 w-4" />
                     <span className="text-sm ">Last Hour</span>
                   </div>
                   <div className="absolute bottom-full right-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-popover border rounded-lg px-4 py-3 shadow-lg z-10 min-w-[280px]">
                     <div className="space-y-3">
                       <div className="flex items-center justify-between">
                         <div className="flex items-center gap-2">
                           <Activity className="h-4 w-4 text-muted-foreground" />
                           <span className="font-medium">Last Hour Summary</span>
                         </div>
                         <span className="text-xs text-muted-foreground">{new Date(hourSummary.hourStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-2">
                           <div className="flex items-center gap-1">
                             <TrendingDown className="h-3 w-3 text-muted-foreground" />
                             <span className="text-xs text-muted-foreground">Buy Range</span>
                           </div>
                           <div className="font-mono text-sm font-bold">{hourSummary.minInstantBuyPrice.toFixed(2)} - {hourSummary.maxInstantBuyPrice.toFixed(2)}</div>
                         </div>
                         <div className="space-y-2">
                           <div className="flex items-center gap-1">
                             <TrendingUp className="h-3 w-3 text-muted-foreground" />
                             <span className="text-xs text-muted-foreground">Sell Range</span>
                           </div>
                           <div className="font-mono text-sm font-bold">{hourSummary.minInstantSellPrice.toFixed(2)} - {hourSummary.maxInstantSellPrice.toFixed(2)}</div>
                         </div>
                       </div>
                       <div className="space-y-2">
                         <div className="flex items-center gap-1">
                           <BarChart3 className="h-3 w-3 text-muted-foreground" />
                           <span className="text-xs text-muted-foreground">Orders</span>
                         </div>
                         <div className="grid grid-cols-2 gap-4 text-xs">
                           <div>
                             <span className="text-muted-foreground">Buy:</span> {hourSummary.createdBuyOrders} (Δ{hourSummary.deltaBuyOrders})
                           </div>
                           <div>
                             <span className="text-muted-foreground">Sell:</span> {hourSummary.createdSellOrders} (Δ{hourSummary.deltaSellOrders})
                           </div>
                         </div>
                       </div>
                     </div>
                   </div>
                 </div>
               )}
             </div>
             <CardDescription>Average values from the last 48 hour summaries (calculated at {new Date(average.calculatedAt).toLocaleString()})</CardDescription>
           </CardHeader>
           <CardContent>
             <div className="grid gap-4 md:grid-cols-4">
               <div className="space-y-2">
                 <div className="flex items-center gap-1">
                   <TrendingDown className="h-4 w-4 text-muted-foreground" />
                   <p className="text-sm font-medium">Avg Buy Price Range</p>
                 </div>
                 <p className="text-2xl font-bold">{average.averageMinInstantBuyPrice.toFixed(2)} - {average.averageMaxInstantBuyPrice.toFixed(2)}</p>
                 <div className="flex items-center gap-1 text-xs text-muted-foreground">
                   <Activity className="h-3 w-3" />
                   <span>Open: {average.averageOpenInstantBuyPrice.toFixed(2)} • Close: {average.averageCloseInstantBuyPrice.toFixed(2)}</span>
                 </div>
               </div>
               <div className="space-y-2">
                 <div className="flex items-center gap-1">
                   <TrendingUp className="h-4 w-4 text-muted-foreground" />
                   <p className="text-sm font-medium">Avg Sell Price Range</p>
                 </div>
                 <p className="text-2xl font-bold">{average.averageMinInstantSellPrice.toFixed(2)} - {average.averageMaxInstantSellPrice.toFixed(2)}</p>
                 <div className="flex items-center gap-1 text-xs text-muted-foreground">
                   <Activity className="h-3 w-3" />
                   <span>Open: {average.averageOpenInstantSellPrice.toFixed(2)} • Close: {average.averageCloseInstantSellPrice.toFixed(2)}</span>
                 </div>
               </div>
               <div className="space-y-2">
                 <div className="flex items-center gap-1">
                   <ArrowDownRight className="h-4 w-4 text-muted-foreground" />
                   <p className="text-sm font-medium">Avg Buy Orders</p>
                 </div>
                 <p className="text-2xl font-bold">{average.averageCreatedBuyOrders.toFixed(1)}</p>
                 <div className="flex items-center gap-1 text-xs text-muted-foreground">
                   <Activity className="h-3 w-3" />
                   <span>Δ: {average.averageDeltaBuyOrders.toFixed(1)} • Items: {average.averageAddedItemsBuyOrders.toFixed(1)}</span>
                 </div>
               </div>
               <div className="space-y-2">
                 <div className="flex items-center gap-1">
                   <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                   <p className="text-sm font-medium">Avg Sell Orders</p>
                 </div>
                 <p className="text-2xl font-bold">{average.averageCreatedSellOrders.toFixed(1)}</p>
                 <div className="flex items-center gap-1 text-xs text-muted-foreground">
                   <Activity className="h-3 w-3" />
                   <span>Δ: {average.averageDeltaSellOrders.toFixed(1)} • Items: {average.averageAddedItemsSellOrders.toFixed(1)}</span>
                 </div>
               </div>
             </div>
             {averageLoading && (
               <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                 <RefreshCw className="h-4 w-4 animate-spin" />
                 <span>Updating averages...</span>
               </div>
             )}
             {averageError && (
               <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                 <AlertCircle className="h-4 w-4" />
                 <span>Failed to load average data</span>
               </div>
             )}
           </CardContent>
         </Card>
       )}

      {/* Price History Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Price History</CardTitle>
              </div>
                             <CardDescription>Instant buy and sell prices over time (includes real-time snapshots from the last hour)</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={timeRange === '1h' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeRange('1h')}
              >
                1H
              </Button>
              <Button
                variant={timeRange === '6h' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeRange('6h')}
              >
                6H
              </Button>
              <Button
                variant={timeRange === '24h' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeRange('24h')}
              >
                24H
              </Button>
              <Button
                variant={timeRange === '7d' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeRange('7d')}
              >
                7D
              </Button>
              <Button
                variant={timeRange === 'total' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeRange('total')}
              >
                Total
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
                     {historyLoading || snapshotsLoading ? (
            <div className="h-[400px] flex items-center justify-center">
              <div className="text-center">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Loading price history...</p>
              </div>
            </div>
          ) : historyError ? (
            <div className="h-[400px] flex items-center justify-center">
              <div className="text-center">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Historical data not available</p>
                <p className="text-xs text-muted-foreground mt-1">Try a different time range</p>
              </div>
            </div>
          ) : combinedHistory && combinedHistory.length > 0 ? (
            <HistoryChart data={combinedHistory} />
          ) : (
            <div className="h-[400px] flex items-center justify-center">
              <div className="text-center">
                <Calendar className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No historical data available</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Books */}
      <div className={`grid gap-4 ${buyOrdersCollapsed || sellOrdersCollapsed ? 'md:grid-cols-1' : 'md:grid-cols-2'}`}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 group relative">
                <ArrowDownRight className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Buy Orders</CardTitle>
                <div className="relative opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-popover border rounded-md px-2 py-1 shadow-md z-10 whitespace-nowrap">
                  <div className="text-sm font-medium">{snapshot.activeBuyOrdersCount.toLocaleString()} orders</div>
                  <div className="text-xs text-muted-foreground">may be inaccurate</div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setBuyOrdersCollapsed(!buyOrdersCollapsed)}
                className="h-8 w-8 p-0"
              >
                {buyOrdersCollapsed ? (
                  <Plus className="h-4 w-4" />
                ) : (
                  <Minus className="h-4 w-4" />
                )}
              </Button>
            </div>
            <CardDescription>Active buy orders for this item</CardDescription>
          </CardHeader>
          {!buyOrdersCollapsed && (
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead></TableHead>
                    <TableHead>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        Price (coins)
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        Amount (items)
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-1">
                        <Activity className="h-3 w-3" />
                        Orders
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {snapshot.buyOrders.map((order, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground/50">#{index + 1}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono">{order.pricePerUnit.toFixed(2)}</TableCell>
                      <TableCell className="font-mono">{order.amount.toLocaleString()}</TableCell>
                      <TableCell>{order.orders}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-t-2 font-semibold bg-muted/50">
                    <TableCell className="font-semibold">
                      <div className="flex items-center gap-1">
                        <BarChart3 className="h-3 w-3" />
                        Total
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">
                      {snapshot.buyOrders.reduce((sum, order) => sum + (order.pricePerUnit * order.amount), 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="font-mono">
                      {snapshot.buyOrders.reduce((sum, order) => sum + order.amount, 0).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {snapshot.buyOrders.reduce((sum, order) => sum + order.orders, 0)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          )}
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 group relative">
                <ArrowUpRight className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Sell Orders</CardTitle>
                <div className="relative opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-popover border rounded-md px-2 py-1 shadow-md z-10 whitespace-nowrap">
                  <div className="text-sm font-medium">{snapshot.activeSellOrdersCount.toLocaleString()} orders</div>
                  <div className="text-xs text-muted-foreground">may be inaccurate</div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSellOrdersCollapsed(!sellOrdersCollapsed)}
                className="h-8 w-8 p-0"
              >
                {sellOrdersCollapsed ? (
                  <Plus className="h-4 w-4" />
                ) : (
                  <Minus className="h-4 w-4" />
                )}
              </Button>
            </div>
            <CardDescription>Active sell orders for this item</CardDescription>
          </CardHeader>
          {!sellOrdersCollapsed && (
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead></TableHead>
                    <TableHead>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        Price (coins)
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        Amount (items)
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-1">
                        <Activity className="h-3 w-3" />
                        Orders
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {snapshot.sellOrders.map((order, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground/50">#{index + 1}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono">{order.pricePerUnit.toFixed(2)}</TableCell>
                      <TableCell className="font-mono">{order.amount.toLocaleString()}</TableCell>
                      <TableCell>{order.orders}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-t-2 font-semibold bg-muted/50">
                    <TableCell className="font-semibold">
                      <div className="flex items-center gap-1">
                        <BarChart3 className="h-3 w-3" />
                        Total
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">
                      {snapshot.sellOrders.reduce((sum, order) => sum + (order.pricePerUnit * order.amount), 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="font-mono">
                      {snapshot.sellOrders.reduce((sum, order) => sum + order.amount, 0).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {snapshot.sellOrders.reduce((sum, order) => sum + order.orders, 0)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  )
} 
