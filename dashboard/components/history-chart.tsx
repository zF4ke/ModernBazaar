"use client"

import { useMemo, useState, useCallback, useEffect } from "react"
import ReactECharts from "echarts-for-react"
import type { BazaarItemHourSummary } from "@/types/bazaar"

interface HistoryChartProps {
  data: BazaarItemHourSummary[]
}

interface ChartDataPoint {
  time: string
  buyPrice: number
  sellPrice: number
  spread: number
  newBuyOrders: number
  newSellOrders: number
  deltaNewBuyOrders: number
  deltaNewSellOrders: number
  itemsListedBuyOrders: number
  itemsListedSellOrders: number
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
    return data.map(item => ({
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
      newBuyOrders: item.newBuyOrders,
      newSellOrders: item.newSellOrders,
      deltaNewBuyOrders: item.deltaNewBuyOrders,
      deltaNewSellOrders: item.deltaNewSellOrders,
      itemsListedBuyOrders: item.itemsListedBuyOrders,
      itemsListedSellOrders: item.itemsListedSellOrders,
    }))
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
      newBuyOrders: '#8b5cf6',  // Purple
      newSellOrders: '#ef4444', // Red
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
          symbolSize: 6,
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
          symbolSize: 6,
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
          symbolSize: 4,
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
          data: chartData.map(d => [d.timestamp, d.newBuyOrders]),
          itemStyle: { 
            color: colors.newBuyOrders,
            opacity: 0.7
          },
          barWidth: '60%'
        },
        {
          name: 'New Sell Orders',
          type: 'bar',
          yAxisIndex: yAxis.length - 1,
          data: chartData.map(d => [d.timestamp, d.newSellOrders]),
          itemStyle: { 
            color: colors.newSellOrders,
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
          data: chartData.map(d => [d.timestamp, d.deltaNewBuyOrders]),
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
          data: chartData.map(d => [d.timestamp, d.deltaNewSellOrders]),
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
          data: chartData.map(d => [d.timestamp, d.itemsListedBuyOrders]),
          lineStyle: { 
            width: 1, 
            type: 'dashed',
            color: colors.volumeBuy
          },
          itemStyle: { color: colors.volumeBuy },
          symbol: 'circle',
          symbolSize: 4,
          smooth: true
        },
        {
          name: 'Listed Sell Items',
          type: 'line',
          yAxisIndex: yAxis.length - 1,
          data: chartData.map(d => [d.timestamp, d.itemsListedSellOrders]),
          lineStyle: { 
            width: 1, 
            type: 'dashed',
            color: colors.volumeSell
          },
          itemStyle: { color: colors.volumeSell },
          symbol: 'circle',
          symbolSize: 4,
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
          let result = `<div style="font-weight: bold; margin-bottom: 8px;">${params[0].axisValue}</div>`
          
          params.forEach((param: any) => {
            const value = typeof param.value[1] === 'number' 
              ? param.value[1].toFixed(2) 
              : param.value[1]
            result += `<div style="margin: 4px 0;">
              <span style="display: inline-block; width: 10px; height: 10px; background: ${param.color}; margin-right: 8px;"></span>
              <span style="color: ${param.color};">${param.seriesName}: ${value}</span>
            </div>`
          })
          
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