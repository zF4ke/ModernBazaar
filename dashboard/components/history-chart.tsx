"use client"

import { useMemo, useState, useCallback, useEffect } from "react"
import ReactECharts from "echarts-for-react"
import type { BazaarItemHourSummary } from "@/types/bazaar"

interface HistoryChartProps {
  data: BazaarItemHourSummary[]
}

interface ChartDataPoint {
  time: string
  timestamp: number
  buyPrice: number
  sellPrice: number
  spread: number
  createdSellOrders: number
  createdBuyOrders: number
  deltaSellOrders: number
  deltaBuyOrders: number
  addedItemsBuyOrders: number
  addedItemsSellOrders: number
  points: any[]
  isHourlySummary: boolean
}

export default function HistoryChart({ data }: HistoryChartProps) {
  const [selectedMetrics, setSelectedMetrics] = useState({
    prices: true,
    orders: false,
    deltas: false,
    volumes: false
  })

  // Force chart re-render when metrics change
  const [chartKey, setChartKey] = useState(0)
  
  useEffect(() => {
    setChartKey(prev => prev + 1)
  }, [selectedMetrics])

  const chartData = useMemo(() => {
    const allDataPoints: ChartDataPoint[] = []
    
    data.forEach(item => {
      // Add the hourly summary point
      allDataPoints.push({
        time: new Date(item.hourStart).toLocaleString("en-US", { 
          month: "short", 
          day: "numeric", 
          hour: "2-digit", 
          minute: "2-digit" 
        }),
        timestamp: new Date(item.hourStart).getTime(),
        buyPrice: item.closeInstantBuyPrice,
        sellPrice: item.closeInstantSellPrice,
        spread: item.closeInstantSellPrice - item.closeInstantBuyPrice,
        createdSellOrders: item.createdSellOrders,
        createdBuyOrders: item.createdBuyOrders,
        deltaSellOrders: item.deltaSellOrders,
        deltaBuyOrders: item.deltaBuyOrders,
        addedItemsSellOrders: item.addedItemsSellOrders,
        addedItemsBuyOrders: item.addedItemsBuyOrders,
        points: item.points || [],
        isHourlySummary: true
      })
      
      // Add individual points from the hour if they exist
      if (item.points && item.points.length > 0) {
        item.points.forEach(point => {
          allDataPoints.push({
            time: new Date(point.snapshotTime).toLocaleString("en-US", { 
              month: "short", 
              day: "numeric", 
              hour: "2-digit", 
              minute: "2-digit" 
            }),
            timestamp: new Date(point.snapshotTime).getTime(),
            buyPrice: point.instantBuyPrice,
            sellPrice: point.instantSellPrice,
            spread: point.instantSellPrice - point.instantBuyPrice,
            createdSellOrders: 0, // Individual points don't have these metrics
            createdBuyOrders: 0,
            deltaSellOrders: 0,
            deltaBuyOrders: 0,
            addedItemsBuyOrders: point.activeBuyOrdersCount,
            addedItemsSellOrders: point.activeSellOrdersCount,
            points: [],
            isHourlySummary: false
          })
        })
      }
    })
    
    // Sort by timestamp to ensure chronological order
    return allDataPoints.sort((a, b) => a.timestamp - b.timestamp)
  }, [data])

  const getOption = useCallback(() => {
    const series: any[] = []
    const yAxis: any[] = []
    const legendData: string[] = []

    // Color palette - completely unique colors for each metric
    const colors = {
      buyPrice: '#3b82f6',      // Blue
      sellPrice: '#10b981',     // Green
      spread: '#f59e0b',        // Orange
      createdBuyOrders: '#8b5cf6',  // Purple
      createdSellOrders: '#ef4444', // Red
      deltaBuy: '#06b6d4',      // Cyan
      deltaSell: '#f97316',     // Amber
      volumeBuy: '#84cc16',     // Lime
      volumeSell: '#ec4899'     // Pink
    }

    // Price series (left Y-axis)
    if (selectedMetrics.prices) {
      yAxis.push({
        type: 'value',
        position: 'left',
        name: 'Price',
        nameLocation: 'middle',
        nameGap: 50,
        axisLabel: {
          formatter: '{value}'
        },
        splitLine: {
          show: false
        }
      })

      series.push(
        {
          name: 'Buy Price',
          type: 'line',
          yAxisIndex: 0,
          data: chartData.map(d => [d.timestamp, d.buyPrice]),
          lineStyle: { width: 2 },
          itemStyle: { color: colors.buyPrice },
          symbol: 'circle',
          symbolSize: (d: any) => d.isHourlySummary ? 6 : 0,
          smooth: true
        },
        {
          name: 'Sell Price',
          type: 'line',
          yAxisIndex: 0,
          data: chartData.map(d => [d.timestamp, d.sellPrice]),
          lineStyle: { width: 2 },
          itemStyle: { color: colors.sellPrice },
          symbol: 'circle',
          symbolSize: (d: any) => d.isHourlySummary ? 6 : 0,
          smooth: true
        },
        {
          name: 'Spread',
          type: 'line',
          yAxisIndex: 0,
          data: chartData.map(d => [d.timestamp, d.spread]),
          lineStyle: { 
            width: 1, 
            type: 'dashed',
            color: colors.spread
          },
          itemStyle: { color: colors.spread },
          symbol: 'circle',
          symbolSize: (d: any) => d.isHourlySummary ? 4 : 0,
          smooth: true
        }
      )

      legendData.push('Buy Price', 'Sell Price', 'Spread')
    }

    // Orders series (right Y-axis)
    if (selectedMetrics.orders) {
      yAxis.push({
        type: 'value',
        position: 'right',
        name: 'Orders',
        nameLocation: 'middle',
        nameGap: 50,
        splitLine: {
          show: false
        }
      })

      series.push(
        {
          name: 'New Buy Orders',
          type: 'bar',
          yAxisIndex: yAxis.length - 1,
          data: chartData.filter(d => d.isHourlySummary).map(d => [d.timestamp, d.createdBuyOrders]),
          itemStyle: { 
            color: colors.createdBuyOrders,
            opacity: 0.7
          },
          barWidth: '60%'
        },
        {
          name: 'New Sell Orders',
          type: 'bar',
          yAxisIndex: yAxis.length - 1,
          data: chartData.filter(d => d.isHourlySummary).map(d => [d.timestamp, d.createdSellOrders]),
          itemStyle: { 
            color: colors.createdSellOrders,
            opacity: 0.7
          },
          barWidth: '60%'
        }
      )

      legendData.push('New Buy Orders', 'New Sell Orders')
    }

    // Deltas series (right Y-axis)
    if (selectedMetrics.deltas) {
      if (!selectedMetrics.orders) {
        yAxis.push({
          type: 'value',
          position: 'right',
          name: 'Delta',
          nameLocation: 'middle',
          nameGap: 50,
          splitLine: {
            show: false
          }
        })
      }

      series.push(
        {
          name: 'Buy Orders Δ',
          type: 'line',
          yAxisIndex: yAxis.length - 1,
          data: chartData.filter(d => d.isHourlySummary).map(d => [d.timestamp, d.deltaBuyOrders]),
          lineStyle: { 
            width: 1, 
            type: 'dashed',
            color: colors.deltaBuy
          },
          itemStyle: { color: colors.deltaBuy },
          symbol: 'circle',
          symbolSize: 4,
          smooth: true
        },
        {
          name: 'Sell Orders Δ',
          type: 'line',
          yAxisIndex: yAxis.length - 1,
          data: chartData.filter(d => d.isHourlySummary).map(d => [d.timestamp, d.deltaSellOrders]),
          lineStyle: { 
            width: 1, 
            type: 'dashed',
            color: colors.deltaSell
          },
          itemStyle: { color: colors.deltaSell },
          symbol: 'circle',
          symbolSize: 4,
          smooth: true
        }
      )

      legendData.push('Buy Orders Δ', 'Sell Orders Δ')
    }

    // Volumes series (right Y-axis)
    if (selectedMetrics.volumes) {
      if (!selectedMetrics.orders && !selectedMetrics.deltas) {
        yAxis.push({
          type: 'value',
          position: 'right',
          name: 'Items',
          nameLocation: 'middle',
          nameGap: 50,
          splitLine: {
            show: false
          }
        })
      }

      series.push(
        {
          name: 'Listed Buy Items',
          type: 'line',
          yAxisIndex: yAxis.length - 1,
          data: chartData.map(d => [d.timestamp, d.addedItemsBuyOrders]),
          lineStyle: { 
            width: 1, 
            type: 'dashed',
            color: colors.volumeBuy
          },
          itemStyle: { color: colors.volumeBuy },
          symbol: 'circle',
          symbolSize: (d: any) => d.isHourlySummary ? 4 : 0,
          smooth: true
        },
        {
          name: 'Listed Sell Items',
          type: 'line',
          yAxisIndex: yAxis.length - 1,
          data: chartData.map(d => [d.timestamp, d.addedItemsSellOrders]),
          lineStyle: { 
            width: 1, 
            type: 'dashed',
            color: colors.volumeSell
          },
          itemStyle: { color: colors.volumeSell },
          symbol: 'circle',
          symbolSize: (d: any) => d.isHourlySummary ? 4 : 0,
          smooth: true
        }
      )

      legendData.push('Listed Buy Items', 'Listed Sell Items')
    }

    return {
      backgroundColor: 'transparent',
      grid: {
        left: '10%',
        right: '10%',
        top: '15%',
        bottom: '40%', // Significantly increased bottom margin
        containLabel: true
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        textStyle: {
          color: '#fff'
        },
        formatter: function(params: any) {
          // Format the timestamp nicely
          const timestamp = params[0].axisValue
          const date = new Date(timestamp)
          const formattedDate = date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          })
          const formattedTime = date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
          })
          
          let result = `<div style="margin-bottom: 8px;">
            <div style="font-weight: bold; margin-bottom: 4px;">${formattedDate}</div>
            <div style="font-size: 11px; color: #9ca3af; opacity: 0.7;">${formattedTime}</div>
          </div>`
          
          // Find the data point for this timestamp
          const dataPoint = chartData.find(d => d.timestamp === timestamp)
          if (dataPoint) {
            if (dataPoint.isHourlySummary) {
              result += `<div style="font-size: 10px; color: #9ca3af; margin-bottom: 8px; padding: 4px; background: rgba(59, 130, 246, 0.1); border-radius: 4px;">
                📊 Hourly Summary
              </div>`
            } else {
              result += `<div style="font-size: 10px; color: #9ca3af; margin-bottom: 8px; padding: 4px; background: rgba(16, 185, 129, 0.1); border-radius: 4px;">
                📈 Individual Snapshot
              </div>`
            }
          }
          
          // Show only the metrics that are currently toggled
          if (dataPoint) {
            // Find parent hourly summary for individual snapshots
            let parentHourlySummary: ChartDataPoint | null = null
            if (!dataPoint.isHourlySummary) {
              // Find the hourly summary that contains this individual snapshot
              parentHourlySummary = chartData.find(d => 
                d.isHourlySummary && 
                d.timestamp <= dataPoint.timestamp && 
                d.timestamp + 3600000 > dataPoint.timestamp // Within the same hour (3600000ms = 1 hour)
              ) || null
            }
            
            // Show prices if toggled
            if (selectedMetrics.prices) {
              if (dataPoint.buyPrice !== undefined) {
                result += `<div style="margin: 4px 0;">
                  <span style="display: inline-block; width: 10px; height: 10px; background: ${colors.buyPrice}; margin-right: 8px;"></span>
                  <span style="color: ${colors.buyPrice};">Buy Price: ${dataPoint.buyPrice.toFixed(2)}</span>
                </div>`
              }
              if (dataPoint.sellPrice !== undefined) {
                result += `<div style="margin: 4px 0;">
                  <span style="display: inline-block; width: 10px; height: 10px; background: ${colors.sellPrice}; margin-right: 8px;"></span>
                  <span style="color: ${colors.sellPrice};">Sell Price: ${dataPoint.sellPrice.toFixed(2)}</span>
                </div>`
              }
              if (dataPoint.spread !== undefined) {
                result += `<div style="margin: 4px 0;">
                  <span style="display: inline-block; width: 10px; height: 10px; background: ${colors.spread}; margin-right: 8px;"></span>
                  <span style="color: ${colors.spread};">Spread: ${dataPoint.spread.toFixed(2)}</span>
                </div>`
              }
            }
            
            // Show order metrics if toggled (for hourly summaries or individual snapshots with parent data)
            if (selectedMetrics.orders) {
              const orderData = dataPoint.isHourlySummary ? dataPoint : parentHourlySummary
              if (orderData && orderData.createdBuyOrders !== undefined) {
                result += `<div style="margin: 4px 0;">
                  <span style="display: inline-block; width: 10px; height: 10px; background: ${colors.createdBuyOrders}; margin-right: 8px;"></span>
                  <span style="color: ${colors.createdBuyOrders};">New Buy Orders: ${orderData.createdBuyOrders}</span>
                </div>`
              }
              if (orderData && orderData.createdSellOrders !== undefined) {
                result += `<div style="margin: 4px 0;">
                  <span style="display: inline-block; width: 10px; height: 10px; background: ${colors.createdSellOrders}; margin-right: 8px;"></span>
                  <span style="color: ${colors.createdSellOrders};">New Sell Orders: ${orderData.createdSellOrders}</span>
                </div>`
              }
            }
            
            // Show delta metrics if toggled (for hourly summaries or individual snapshots with parent data)
            if (selectedMetrics.deltas) {
              const deltaData = dataPoint.isHourlySummary ? dataPoint : parentHourlySummary
              if (deltaData && deltaData.deltaBuyOrders !== undefined) {
                result += `<div style="margin: 4px 0;">
                  <span style="display: inline-block; width: 10px; height: 10px; background: ${colors.deltaBuy}; margin-right: 8px;"></span>
                  <span style="color: ${colors.deltaBuy};">Buy Orders Δ: ${deltaData.deltaBuyOrders}</span>
                </div>`
              }
              if (deltaData && deltaData.deltaSellOrders !== undefined) {
                result += `<div style="margin: 4px 0;">
                  <span style="display: inline-block; width: 10px; height: 10px; background: ${colors.deltaSell}; margin-right: 8px;"></span>
                  <span style="color: ${colors.deltaSell};">Sell Orders Δ: ${deltaData.deltaSellOrders}</span>
                </div>`
              }
            }
            
            // Show volume metrics if toggled
            if (selectedMetrics.volumes) {
              if (dataPoint.addedItemsBuyOrders !== undefined) {
                result += `<div style="margin: 4px 0;">
                  <span style="display: inline-block; width: 10px; height: 10px; background: ${colors.volumeBuy}; margin-right: 8px;"></span>
                  <span style="color: ${colors.volumeBuy};">Listed Buy Items: ${dataPoint.addedItemsBuyOrders}</span>
                </div>`
              }
              if (dataPoint.addedItemsSellOrders !== undefined) {
                result += `<div style="margin: 4px 0;">
                  <span style="display: inline-block; width: 10px; height: 10px; background: ${colors.volumeSell}; margin-right: 8px;"></span>
                  <span style="color: ${colors.volumeSell};">Listed Sell Items: ${dataPoint.addedItemsSellOrders}</span>
                </div>`
              }
            }
          }
          
          return result
        }
      },
      legend: {
        data: legendData,
        bottom: 25, // Moved up significantly
        textStyle: {
          color: '#9ca3af'
        }
      },
      xAxis: {
        type: 'time',
        axisLabel: {
          color: '#9ca3af',
          formatter: function(value: number) {
            const date = new Date(value)
            return date.toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })
          }
        },
        axisLine: {
          lineStyle: {
            color: '#374151'
          }
        },
        splitLine: {
          show: false
        }
      },
      yAxis: yAxis.length > 0 ? yAxis : [{
        type: 'value',
        position: 'left',
        axisLabel: {
          color: '#9ca3af'
        },
        axisLine: {
          lineStyle: {
            color: '#374151'
          }
        },
        splitLine: {
          lineStyle: {
            color: '#374151',
            type: 'dashed'
          }
        }
      }],
      series: series.length > 0 ? series : [],
      dataZoom: [
        {
          type: 'inside',
          start: 0,
          end: 100
        },
        {
          type: 'slider',
          start: 0,
          end: 100,
          bottom: 0, // At the very bottom
          height: 20,
          borderColor: '#374151',
          fillerColor: 'rgba(59, 130, 246, 0.1)',
          handleStyle: {
            color: '#3b82f6'
          }
        }
      ]
    }
  }, [chartData, selectedMetrics])

  return (
    <div className="space-y-4">
      {/* Metric Selection Controls */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setSelectedMetrics(prev => ({ ...prev, prices: !prev.prices }))}
          className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 border ${
            selectedMetrics.prices 
              ? 'bg-primary text-primary-foreground border-primary shadow-lg' 
              : 'bg-background text-foreground border-border hover:bg-accent hover:text-accent-foreground'
          }`}
        >
          Prices
        </button>
        <button
          onClick={() => setSelectedMetrics(prev => ({ ...prev, orders: !prev.orders }))}
          className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 border ${
            selectedMetrics.orders 
              ? 'bg-primary text-primary-foreground border-primary shadow-lg' 
              : 'bg-background text-foreground border-border hover:bg-accent hover:text-accent-foreground'
          }`}
        >
          New Orders
        </button>
        <button
          onClick={() => setSelectedMetrics(prev => ({ ...prev, deltas: !prev.deltas }))}
          className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 border ${
            selectedMetrics.deltas 
              ? 'bg-primary text-primary-foreground border-primary shadow-lg' 
              : 'bg-background text-foreground border-border hover:bg-accent hover:text-accent-foreground'
          }`}
        >
          Order Deltas
        </button>
        <button
          onClick={() => setSelectedMetrics(prev => ({ ...prev, volumes: !prev.volumes }))}
          className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 border ${
            selectedMetrics.volumes 
              ? 'bg-primary text-primary-foreground border-primary shadow-lg' 
              : 'bg-background text-foreground border-border hover:bg-accent hover:text-accent-foreground'
          }`}
        >
          Listed Items
        </button>
      </div>

      {/* Chart */}
      <div className="h-[500px] w-full">
        <ReactECharts 
          key={chartKey}
          option={getOption()} 
          style={{ height: '100%', width: '100%' }}
          opts={{ renderer: 'canvas' }}
        />
      </div>
    </div>
  )
} 