"use client"

import { use } from "react"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { RefreshCw, TrendingUp, TrendingDown } from "lucide-react"
import type { BazaarItemDetail } from "@/types/bazaar"
import { fetchWithBackendUrl } from "@/lib/api"

async function fetchItemDetail(productId: string): Promise<BazaarItemDetail> {
  const response = await fetchWithBackendUrl(`/api/items/${productId}`)
  if (!response.ok) throw new Error("Failed to fetch item detail")
  return response.json()
}

export default function ItemDetailPage({ params }: { params: Promise<{ productId: string }> }) {
  const resolvedParams = use(params)
  const {
    data: item,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["item", resolvedParams.productId],
    queryFn: () => fetchItemDetail(resolvedParams.productId),
    placeholderData: (previousData) => previousData,
    staleTime: 30000, // 30 seconds
  })

  // Mock price history data
  const priceHistory = Array.from({ length: 24 }, (_, i) => {
    const hour = new Date()
    hour.setHours(hour.getHours() - (23 - i))
    return {
      time: hour.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      buyPrice: (item?.weightedTwoPercentBuyPrice || 2.5) + (Math.random() - 0.5) * 0.5,
      sellPrice: (item?.weightedTwoPercentSellPrice || 3.2) + (Math.random() - 0.5) * 0.5,
    }
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Loading...</h2>
        </div>
      </div>
    )
  }

  if (!item) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Item Not Found</h2>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{item.displayName}</h2>
          <div className="flex items-center gap-2">
            <p className="text-muted-foreground">Product ID: {item.productId}</p>
            {isFetching && !isLoading && (
              <span className="text-xs text-muted-foreground">• Updating...</span>
            )}
          </div>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm" disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
          {isFetching ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Item Snapshot */}
      <div className={`grid gap-4 md:grid-cols-2 lg:grid-cols-4 transition-opacity duration-200 ${isFetching ? 'opacity-75' : 'opacity-100'}`}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Weighted Buy Price</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{item.weightedTwoPercentBuyPrice.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Week avg: {item.buyMovingWeek.toFixed(2)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Weighted Sell Price</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{item.weightedTwoPercentSellPrice.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Week avg: {item.sellMovingWeek.toFixed(2)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Spread</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{item.spread.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Profit margin</p>
          </CardContent>
        </Card>

        <Card className="flex flex-col justify-between">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Updated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold">{new Date(item.lastUpdated).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Fetched: {new Date(item.fetchedAt).toLocaleTimeString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Price History Chart */}
      <Card className={`transition-opacity duration-200 ${isFetching ? 'opacity-75' : 'opacity-100'}`}>
        <CardHeader>
          <CardTitle>Price History</CardTitle>
          <CardDescription>Weighted buy and sell prices over the last 24 hours</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              buyPrice: {
                label: "Weighted Buy Price",
                color: "hsl(var(--primary))",
              },
              sellPrice: {
                label: "Weighted Sell Price",
                color: "hsl(142, 76%, 36%)",
              },
            }}
            className="h-[300px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={priceHistory}>
                <XAxis dataKey="time" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="buyPrice" stroke="var(--color-buyPrice)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="sellPrice" stroke="var(--color-sellPrice)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Order Books */}
      <div className={`grid gap-4 md:grid-cols-2 transition-opacity duration-200 ${isFetching ? 'opacity-75' : 'opacity-100'}`}>
        <Card>
          <CardHeader>
            <CardTitle className="text-green-500">Buy Orders ({item.activeBuyOrdersCount})</CardTitle>
            <CardDescription>Current buy orders in the market</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Price</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {item.buyOrders.map((order) => (
                  <TableRow key={order.orderIndex}>
                    <TableCell className="font-mono text-green-500">{order.pricePerUnit.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono">{order.amount.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{order.orders}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-red-500">Sell Orders ({item.activeSellOrdersCount})</CardTitle>
            <CardDescription>Current sell orders in the market</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Price</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {item.sellOrders.map((order) => (
                  <TableRow key={order.orderIndex}>
                    <TableCell className="font-mono text-red-500">{order.pricePerUnit.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono">{order.amount.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{order.orders}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}