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

async function fetchBazaarItemDetail(productId: string): Promise<BazaarItemDetail> {
  const response = await fetchWithBackendUrl(`/api/bazaar/items/${productId}`)
  if (!response.ok) throw new Error("Failed to fetch bazaar item detail")
  return response.json()
}

export default function BazaarItemDetailPage({ params }: { params: Promise<{ productId: string }> }) {
  const resolvedParams = use(params)
  const {
    data: item,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["bazaar-item", resolvedParams.productId],
    queryFn: () => fetchBazaarItemDetail(resolvedParams.productId),
    placeholderData: (previousData) => previousData,
    staleTime: 30000, // 30 seconds
  })

  // Mock price history data
  const priceHistory = Array.from({ length: 24 }, (_, i) => {
    const hour = new Date()
    hour.setHours(hour.getHours() - (23 - i))
    return {
      time: hour.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      buyPrice: (item?.instantBuyPrice || 2.5) + (Math.random() - 0.5) * 0.5,
      sellPrice: (item?.instantSellPrice || 3.2) + (Math.random() - 0.5) * 0.5,
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
          <h2 className="text-3xl font-bold tracking-tight">Bazaar Item Not Found</h2>
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
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="flex flex-col justify-between">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Instant Buy Price</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{item.instantBuyPrice.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              weighted: {item.weightedTwoPercentBuyPrice.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card className="flex flex-col justify-between">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Instant Sell Price</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{item.instantSellPrice.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              weighted: {item.weightedTwoPercentSellPrice.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card className="flex flex-col justify-between">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Spread</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{item.spread.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Buy-sell spread</p>
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
          <CardDescription>Instant buy and sell prices over the last 24 hours</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              buyPrice: {
                label: "Instant Buy Price",
                color: "hsl(var(--primary))",
              },
              sellPrice: {
                label: "Instant Sell Price",
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
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Buy Orders</CardTitle>
            <CardDescription>Active buy orders for this item</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
                             <TableHeader>
                 <TableRow>
                   <TableHead></TableHead>
                   <TableHead>Price (coins)</TableHead>
                   <TableHead>Amount (items)</TableHead>
                   <TableHead>Orders</TableHead>
                 </TableRow>
               </TableHeader>
                             <TableBody>
                 {item.buyOrders.slice(0, 10).map((order, index) => (
                   <TableRow key={index}>
                     <TableCell></TableCell>
                     <TableCell className="font-mono">{order.pricePerUnit.toFixed(2)}</TableCell>
                     <TableCell className="font-mono">{order.amount.toLocaleString()}</TableCell>
                     <TableCell>{order.orders}</TableCell>
                   </TableRow>
                 ))}
                                   <TableRow className="border-t-2 font-semibold bg-muted/50">
                    <TableCell className="font-semibold">Total</TableCell>
                    <TableCell className="font-mono">
                      {item.buyOrders.slice(0, 10).reduce((sum, order) => sum + (order.pricePerUnit * order.amount), 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="font-mono">
                      {item.buyOrders.slice(0, 10).reduce((sum, order) => sum + order.amount, 0).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {item.buyOrders.slice(0, 10).reduce((sum, order) => sum + order.orders, 0)}
                    </TableCell>
                  </TableRow>
               </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sell Orders</CardTitle>
            <CardDescription>Active sell orders for this item</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
                             <TableHeader>
                 <TableRow>
                   <TableHead></TableHead>
                   <TableHead>Price (coins)</TableHead>
                   <TableHead>Amount (items)</TableHead>
                   <TableHead>Orders</TableHead>
                 </TableRow>
               </TableHeader>
                             <TableBody>
                 {item.sellOrders.slice(0, 10).map((order, index) => (
                   <TableRow key={index}>
                     <TableCell></TableCell>
                     <TableCell className="font-mono">{order.pricePerUnit.toFixed(2)}</TableCell>
                     <TableCell className="font-mono">{order.amount.toLocaleString()}</TableCell>
                     <TableCell>{order.orders}</TableCell>
                   </TableRow>
                 ))}
                                   <TableRow className="border-t-2 font-semibold bg-muted/50">
                    <TableCell className="font-semibold">Total</TableCell>
                    <TableCell className="font-mono">
                      {item.sellOrders.slice(0, 10).reduce((sum, order) => sum + (order.pricePerUnit * order.amount), 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="font-mono">
                      {item.sellOrders.slice(0, 10).reduce((sum, order) => sum + order.amount, 0).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {item.sellOrders.slice(0, 10).reduce((sum, order) => sum + order.orders, 0)}
                    </TableCell>
                  </TableRow>
               </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 