import { useEffect, useRef } from 'react'
import { createChart } from 'lightweight-charts'
import { fmtCurrency } from '../lib/format'

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
    const green = '#00c853'
    const red = '#ff1744'
    const lineColor = isProfit ? green : red

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: '#0f1420' },
        textColor: '#5a6a80',
      },
      grid: {
        vertLines: { color: '#1a2030' },
        horzLines: { color: '#1a2030' },
      },
      width: containerRef.current.clientWidth,
      height: 350,
      crosshair: { mode: 0 },
      rightPriceScale: { borderColor: '#2a3548' },
      timeScale: { borderColor: '#2a3548', timeVisible: false },
    })

    const areaSeries = chart.addAreaSeries({
      topColor: isProfit ? 'rgba(0,200,83,0.2)' : 'rgba(255,23,68,0.2)',
      bottomColor: isProfit ? 'rgba(0,200,83,0.0)' : 'rgba(255,23,68,0.0)',
      lineColor,
      lineWidth: 2,
    })

    const costLine = chart.addLineSeries({
      color: '#ff9800',
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
    <div className="bg-bb-surface rounded border border-bb-border-hi p-3">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-bold text-gray-100">{holding.name}</h2>
          <span className="text-xxs text-bb-muted">{holding.ticker}</span>
        </div>
        <div className="text-right">
          <div className="text-xxs text-bb-muted uppercase">Avg Cost</div>
          <div className="text-xs text-bb-amber font-medium tabular-nums">
            {fmtCurrency(holding.avgCost, holding.currency)}
          </div>
        </div>
      </div>
      <div ref={containerRef} />
    </div>
  )
}
