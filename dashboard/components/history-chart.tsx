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
  buyVolume: number
  sellVolume: number
  points: any[]
  isHourlySummary: boolean
}

export default function HistoryChart({ data }: HistoryChartProps) {
  const [selectedMetrics, setSelectedMetrics] = useState({
    prices: true,
    orders: false,
    deltas: false,
    volumes: false,
    totalVolumes: false
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
        buyVolume: 0, // Hourly summaries don't have volume
        sellVolume: 0,
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
            buyVolume: point.buyVolume,
            sellVolume: point.sellVolume,
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

    // Get all selected metrics in order
    const allSelectedMetrics = [
      { key: 'prices', name: 'Prices', selected: selectedMetrics.prices },
      { key: 'orders', name: 'Orders', selected: selectedMetrics.orders },
      { key: 'deltas', name: 'Delta', selected: selectedMetrics.deltas },
      { key: 'volumes', name: 'Items', selected: selectedMetrics.volumes },
      { key: 'totalVolumes', name: 'Total Items', selected: selectedMetrics.totalVolumes }
    ].filter(m => m.selected)

    // Dynamic axis positioning: first axis on left, rest on right with increasing offsets
    const getAxisConfig = (index: number, total: number, name: string) => {
      if (index === 0) {
        // First axis always goes on the left
        return {
          position: 'left',
          offset: 0,
          nameGap: 70 // More space for left axis labels to avoid overlap
        }
      } else {
        // Subsequent axes go on the right with increasing offsets
        return {
          position: 'right',
          offset: (index - 1) * 70, // Reduced from 80 to make them closer
          nameGap: 50
        }
      }
    }

    // Process each selected metric in order
    let currentAxisIndex = 0

    // Price series
    if (selectedMetrics.prices) {
      const axisConfig = getAxisConfig(currentAxisIndex, allSelectedMetrics.length, 'Price')
      yAxis.push({
        type: 'value',
        position: axisConfig.position,
        name: 'Price',
        nameLocation: 'middle',
        nameGap: axisConfig.nameGap,
        offset: axisConfig.offset,
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
          yAxisIndex: currentAxisIndex,
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
          yAxisIndex: currentAxisIndex,
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
          yAxisIndex: currentAxisIndex,
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
      currentAxisIndex++
    }

    // Orders series
    if (selectedMetrics.orders) {
      const axisConfig = getAxisConfig(currentAxisIndex, allSelectedMetrics.length, 'Orders')
      yAxis.push({
        type: 'value',
        position: axisConfig.position,
        name: 'Orders',
        nameLocation: 'middle',
        nameGap: axisConfig.nameGap,
        offset: axisConfig.offset,
        splitLine: {
          show: false
        }
      })

      series.push(
        {
          name: 'Created Buy Orders',
          type: 'bar',
          yAxisIndex: currentAxisIndex,
          data: chartData.filter(d => d.isHourlySummary).map(d => [d.timestamp, d.createdBuyOrders]),
          itemStyle: { 
            color: colors.createdBuyOrders,
            opacity: 0.7
          },
          barWidth: '60%'
        },
        {
          name: 'Created Sell Orders',
          type: 'bar',
          yAxisIndex: currentAxisIndex,
          data: chartData.filter(d => d.isHourlySummary).map(d => [d.timestamp, d.createdSellOrders]),
          itemStyle: { 
            color: colors.createdSellOrders,
            opacity: 0.7
          },
          barWidth: '60%'
        }
      )

      legendData.push('Created Buy Orders', 'Created Sell Orders')
      currentAxisIndex++
    }

    // Deltas series
    if (selectedMetrics.deltas) {
      const axisConfig = getAxisConfig(currentAxisIndex, allSelectedMetrics.length, 'Delta')
      yAxis.push({
        type: 'value',
        position: axisConfig.position,
        name: 'Delta',
        nameLocation: 'middle',
        nameGap: axisConfig.nameGap,
        offset: axisConfig.offset,
        splitLine: {
          show: false
        }
      })

      series.push(
        {
          name: 'Buy Orders Δ',
          type: 'line',
          yAxisIndex: currentAxisIndex,
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
          yAxisIndex: currentAxisIndex,
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
      currentAxisIndex++
    }

    // Volumes series
    if (selectedMetrics.volumes) {
      const axisConfig = getAxisConfig(currentAxisIndex, allSelectedMetrics.length, 'Items')
      yAxis.push({
        type: 'value',
        position: axisConfig.position,
        name: 'Items',
        nameLocation: 'middle',
        nameGap: axisConfig.nameGap,
        offset: axisConfig.offset,
        splitLine: {
          show: false
        }
      })

      series.push(
        {
          name: 'Added Buy Items',
          type: 'line',
          yAxisIndex: currentAxisIndex,
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
          name: 'Added Sell Items',
          type: 'line',
          yAxisIndex: currentAxisIndex,
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

      legendData.push('Added Buy Items', 'Added Sell Items')
      currentAxisIndex++
    }

    // Total Volumes series
    if (selectedMetrics.totalVolumes) {
      const axisConfig = getAxisConfig(currentAxisIndex, allSelectedMetrics.length, 'Total Items')
      yAxis.push({
        type: 'value',
        position: axisConfig.position,
        name: 'Total Items',
        nameLocation: 'middle',
        nameGap: axisConfig.nameGap,
        offset: axisConfig.offset,
        splitLine: {
          show: false
        }
      })

      series.push(
        {
          name: 'Total Items Buy Orders',
          type: 'line',
          yAxisIndex: currentAxisIndex,
          data: chartData.filter(d => !d.isHourlySummary).map(d => [d.timestamp, d.buyVolume]),
          lineStyle: { 
            width: 2,
            color: colors.volumeBuy
          },
          itemStyle: { color: colors.volumeBuy },
          symbol: 'circle',
          symbolSize: 4,
          smooth: true
        },
        {
          name: 'Total Items Sell Orders',
          type: 'line',
          yAxisIndex: currentAxisIndex,
          data: chartData.filter(d => !d.isHourlySummary).map(d => [d.timestamp, d.sellVolume]),
          lineStyle: { 
            width: 2,
            color: colors.volumeSell
          },
          itemStyle: { color: colors.volumeSell },
          symbol: 'circle',
          symbolSize: 4,
          smooth: true
        }
      )

      legendData.push('Total Items Buy Orders', 'Total Items Sell Orders')
      currentAxisIndex++
    }

    // Calculate grid margins based on number of axes and their positions
    const rightAxesCount = allSelectedMetrics.length > 1 ? allSelectedMetrics.length - 1 : 0
    const gridRight = rightAxesCount === 0 ? '12%' : 
                     rightAxesCount === 1 ? '12%' : 
                     rightAxesCount === 2 ? '12%' : 
                     rightAxesCount === 3 ? '12%' : '12%'

    return {
      backgroundColor: 'transparent',
      grid: {
        left: '10%', // Increased from 10% to give more space for the left axis label
        right: gridRight,
        top: '15%',
        bottom: '30%',
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
                   <span style="color: ${colors.createdBuyOrders};">Created Buy Orders: ${orderData.createdBuyOrders}</span>
                 </div>`
               }
               if (orderData && orderData.createdSellOrders !== undefined) {
                 result += `<div style="margin: 4px 0;">
                   <span style="display: inline-block; width: 10px; height: 10px; background: ${colors.createdSellOrders}; margin-right: 8px;"></span>
                   <span style="color: ${colors.createdSellOrders};">Created Sell Orders: ${orderData.createdSellOrders}</span>
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
                   <span style="color: ${colors.volumeBuy};">Added Buy Items: ${dataPoint.addedItemsBuyOrders}</span>
                 </div>`
               }
               if (dataPoint.addedItemsSellOrders !== undefined) {
                 result += `<div style="margin: 4px 0;">
                   <span style="display: inline-block; width: 10px; height: 10px; background: ${colors.volumeSell}; margin-right: 8px;"></span>
                   <span style="color: ${colors.volumeSell};">Added Sell Items: ${dataPoint.addedItemsSellOrders}</span>
                 </div>`
               }
             }
            
            // Show total volume metrics if toggled
            if (selectedMetrics.totalVolumes) {
              if (dataPoint.buyVolume !== undefined) {
                result += `<div style="margin: 4px 0;">
                  <span style="display: inline-block; width: 10px; height: 10px; background: ${colors.volumeBuy}; margin-right: 8px;"></span>
                  <span style="color: ${colors.volumeBuy};">Total Items Buy Orders: ${dataPoint.buyVolume}</span>
                </div>`
              }
              if (dataPoint.sellVolume !== undefined) {
                result += `<div style="margin: 4px 0;">
                  <span style="display: inline-block; width: 10px; height: 10px; background: ${colors.volumeSell}; margin-right: 8px;"></span>
                  <span style="color: ${colors.volumeSell};">Total Items Sell Orders: ${dataPoint.sellVolume}</span>
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
          Created Orders
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
          Added Items
        </button>
        <button
          onClick={() => setSelectedMetrics(prev => ({ ...prev, totalVolumes: !prev.totalVolumes }))}
          className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 border ${
            selectedMetrics.totalVolumes 
              ? 'bg-primary text-primary-foreground border-primary shadow-lg' 
              : 'bg-background text-foreground border-border hover:bg-accent hover:text-accent-foreground'
          }`}
        >
          Total Volume
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