"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, BarChart, Line, LineChart, ResponsiveContainer, XAxis, YAxis, PieChart, Pie, Cell } from "recharts"

const volumeData = [
  { name: "WHEAT", volume: 45000 },
  { name: "CARROT", volume: 32000 },
  { name: "POTATO", volume: 28000 },
  { name: "SUGAR_CANE", volume: 15000 },
]

const spreadData = [
  { name: "High Spread (>0.5)", value: 35, color: "#3B82F6" },
  { name: "Medium Spread (0.2-0.5)", value: 45, color: "#10B981" },
  { name: "Low Spread (<0.2)", value: 20, color: "#F59E0B" },
]

const trendData = Array.from({ length: 30 }, (_, i) => ({
  day: `Day ${i + 1}`,
  avgSpread: 0.3 + Math.random() * 0.4,
  totalVolume: 80000 + Math.random() * 40000,
}))

export default function ChartsPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Charts & Analytics</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Trading Volume by Item</CardTitle>
            <CardDescription>24-hour trading volume for top items</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                volume: {
                  label: "Volume",
                  color: "hsl(var(--primary))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={volumeData}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="volume" fill="var(--color-volume)" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Spread Distribution</CardTitle>
            <CardDescription>Distribution of items by spread range</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                spread: {
                  label: "Items",
                  color: "hsl(var(--primary))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={spreadData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}%`}
                  >
                    {spreadData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Average Spread Trend</CardTitle>
            <CardDescription>30-day average spread across all items</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                avgSpread: {
                  label: "Average Spread",
                  color: "hsl(var(--primary))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <XAxis dataKey="day" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="avgSpread"
                    stroke="var(--color-avgSpread)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total Volume Trend</CardTitle>
            <CardDescription>30-day total trading volume</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                totalVolume: {
                  label: "Total Volume",
                  color: "hsl(142, 76%, 36%)",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <XAxis dataKey="day" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="totalVolume"
                    stroke="var(--color-totalVolume)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
