import { useEffect, useRef } from 'react'
import { createChart } from 'lightweight-charts'
import { fmtCurrency } from '../lib/format'

const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0 }

export default function Chart({ holding }) {
  const containerRef = useRef(null)
  const chartRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current) return
    if (!holding || !Array.isArray(holding.history) || holding.history.length === 0) return

    // Cleanup previous chart
    if (chartRef.current) {
      chartRef.current.remove()
      chartRef.current = null
    }

    const avgCost = num(holding.avgCost)
    const currentPrice = num(holding.currentPrice)
    const isProfit = currentPrice >= avgCost
    const green = '#00c853'
    const red = '#ff1744'
    const lineColor = isProfit ? green : red

    const chart = createChart(containerRef.current, {
      layout: { background: { color: '#0f1420' }, textColor: '#5a6a80' },
      grid: { vertLines: { color: '#1a2030' }, horzLines: { color: '#1a2030' } },
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

    // Filter out invalid history entries
    const chartData = holding.history
      .filter(h => h && h.date && Number.isFinite(num(h.close)))
      .map(h => ({ time: h.date, value: num(h.close) }))

    if (chartData.length === 0) {
      chart.remove()
      return
    }

    areaSeries.setData(chartData)

    if (chartData.length > 1 && avgCost > 0) {
      costLine.setData([
        { time: chartData[0].time, value: avgCost },
        { time: chartData[chartData.length - 1].time, value: avgCost },
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

  if (!holding) return null

  const name = holding.name || holding.ticker || '—'
  const ticker = holding.ticker || ''

  return (
    <div className="bg-bb-surface rounded border border-bb-border-hi p-3">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-bold text-gray-100">{name}</h2>
          <span className="text-xxs text-bb-muted">{ticker}</span>
        </div>
        <div className="text-right">
          <div className="text-xxs text-bb-muted uppercase">Avg Cost</div>
          <div className="text-xs text-bb-amber font-medium tabular-nums">
            {fmtCurrency(num(holding.avgCost), holding.currency)}
          </div>
        </div>
      </div>
      <div ref={containerRef} />
    </div>
  )
}
