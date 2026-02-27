import { useEffect, useRef } from 'react'
import { createChart } from 'lightweight-charts'

export default function Chart({ holding }) {
  const containerRef = useRef(null)
  const chartRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current || !holding.history || holding.history.length === 0) return

    if (chartRef.current) {
      chartRef.current.remove()
      chartRef.current = null
    }

    const isProfit = holding.currentPrice >= holding.avgCost
    const green = '#10b981'
    const red = '#ef4444'
    const lineColor = isProfit ? green : red

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: '#111827' },
        textColor: '#9ca3af',
      },
      grid: {
        vertLines: { color: '#1f2937' },
        horzLines: { color: '#1f2937' },
      },
      width: containerRef.current.clientWidth,
      height: 400,
      crosshair: { mode: 0 },
      rightPriceScale: { borderColor: '#374151' },
      timeScale: { borderColor: '#374151', timeVisible: false },
    })

    const areaSeries = chart.addAreaSeries({
      topColor: isProfit ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)',
      bottomColor: isProfit ? 'rgba(16,185,129,0.0)' : 'rgba(239,68,68,0.0)',
      lineColor,
      lineWidth: 2,
    })

    const costLine = chart.addLineSeries({
      color: '#f59e0b',
      lineWidth: 1,
      lineStyle: 2,
      crosshairMarkerVisible: false,
    })

    const chartData = holding.history.map(h => ({
      time: h.date,
      value: h.close,
    }))

    areaSeries.setData(chartData)

    if (chartData.length > 1) {
      costLine.setData([
        { time: chartData[0].time, value: holding.avgCost },
        { time: chartData[chartData.length - 1].time, value: holding.avgCost },
      ])
    }

    chart.timeScale().fitContent()
    chartRef.current = chart

    const handleResize = () => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth })
      }
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (chartRef.current) {
        chartRef.current.remove()
        chartRef.current = null
      }
    }
  }, [holding])

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold">{holding.ticker}</h2>
          <span className="text-sm text-gray-400">{holding.name}</span>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500">Avg Cost</div>
          <div className="text-orange-400 font-medium">${holding.avgCost.toFixed(2)}</div>
        </div>
      </div>
      <div ref={containerRef} />
    </div>
  )
}
