import { useMemo, useEffect, useRef } from 'react'
import { createChart } from 'lightweight-charts'
import { fmtCurrency } from '../lib/format'
import { ASSET_CLASSES } from './AssetSection'
import DonutChart from './charts/DonutChart'
import BarChart from './charts/BarChart'

const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0 }

// ── Color palettes ──
const ASSET_COLORS = {
  stock: '#448aff', etf: '#00c853', fund: '#ff9800', bond: '#e040fb',
  crypto: '#ff6d00', commodity: '#00bcd4', other: '#5a6a80',
}

const GEO_COLORS = {
  France: '#448aff', Luxembourg: '#e040fb', Switzerland: '#00bcd4',
  Netherlands: '#ffab40', 'United Kingdom': '#69f0ae', 'United States': '#ff6d00',
  Germany: '#ff9800', Ireland: '#00c853', International: '#5a6a80', Eurozone: '#448aff',
}

const CCY_COLORS = { EUR: '#448aff', USD: '#ff6d00', GBP: '#69f0ae', CHF: '#00bcd4' }

const BROKER_COLORS = ['#ff9800', '#448aff', '#00c853', '#e040fb', '#ff6d00', '#00bcd4', '#ffab40', '#69f0ae']

const ISIN_GEO = {
  FR: 'France', LU: 'Luxembourg', CH: 'Switzerland', NL: 'Netherlands',
  GB: 'United Kingdom', US: 'United States', DE: 'Germany', IE: 'Ireland',
  XS: 'International',
}
const CCY_GEO = { CHF: 'Switzerland', USD: 'United States', GBP: 'United Kingdom' }

// ── Section wrapper ──
function Section({ title, children, className = '' }) {
  return (
    <div className={`bg-bb-surface rounded border border-bb-border-hi p-3 sm:p-4 ${className}`}>
      <h3 className="text-xxs font-bold uppercase tracking-widest text-bb-amber mb-3">{title}</h3>
      {children}
    </div>
  )
}

// ── Portfolio History Chart ──
function PortfolioHistory({ data }) {
  const containerRef = useRef(null)
  const chartRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current || !data || data.length < 2) return
    if (chartRef.current) { chartRef.current.remove(); chartRef.current = null }

    const first = data[0].value
    const last = data[data.length - 1].value
    const isProfit = last >= first
    const green = '#00c853'
    const red = '#ff1744'

    const chart = createChart(containerRef.current, {
      layout: { background: { color: '#0f1420' }, textColor: '#5a6a80' },
      grid: { vertLines: { color: '#1a2030' }, horzLines: { color: '#1a2030' } },
      width: containerRef.current.clientWidth,
      height: 280,
      crosshair: { mode: 0 },
      rightPriceScale: { borderColor: '#2a3548' },
      timeScale: { borderColor: '#2a3548', timeVisible: false },
    })

    const series = chart.addAreaSeries({
      topColor: isProfit ? 'rgba(0,200,83,0.2)' : 'rgba(255,23,68,0.2)',
      bottomColor: isProfit ? 'rgba(0,200,83,0.0)' : 'rgba(255,23,68,0.0)',
      lineColor: isProfit ? green : red,
      lineWidth: 2,
    })

    // Cost basis line (first day value)
    const costLine = chart.addLineSeries({
      color: '#ff9800', lineWidth: 1, lineStyle: 2, crosshairMarkerVisible: false,
    })

    series.setData(data)
    costLine.setData([
      { time: data[0].time, value: first },
      { time: data[data.length - 1].time, value: first },
    ])
    chart.timeScale().fitContent()
    chartRef.current = chart

    const onResize = () => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth })
      }
    }
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      if (chartRef.current) { chartRef.current.remove(); chartRef.current = null }
    }
  }, [data])

  if (!data || data.length < 2) {
    return <div className="text-bb-muted text-xxs text-center py-8">Insufficient history data</div>
  }

  const first = data[0].value
  const last = data[data.length - 1].value
  const change = last - first
  const changePct = first > 0 ? (change / first) * 100 : 0
  const clr = change >= 0 ? 'text-bb-green' : 'text-bb-red'

  return (
    <div>
      <div className="flex items-baseline gap-3 mb-2">
        <span className="text-sm font-semibold text-gray-100 tabular-nums">{fmtCurrency(last, 'EUR')}</span>
        <span className={`text-xs tabular-nums ${clr}`}>
          {change >= 0 ? '+' : ''}{fmtCurrency(Math.abs(change), 'EUR')} ({changePct >= 0 ? '+' : ''}{changePct.toFixed(1)}%)
        </span>
        <span className="text-xxs text-bb-muted">1Y</span>
      </div>
      <div ref={containerRef} />
    </div>
  )
}

// ── Main Analytics Component ──
export default function Analytics({ mergedHoldings = [], fxRates = {} }) {
  // ── Enrich holdings with EUR values ──
  const analytics = useMemo(() => {
    const enriched = mergedHoldings.map(h => {
      const rate = num(fxRates[h.currency]) || (h.currency === 'EUR' ? 1 : 0)
      const shares = num(h.shares)
      const currentPrice = num(h.currentPrice)
      const avgCost = num(h.avgCost)
      const mktValueEur = currentPrice * shares * rate
      const costEur = avgCost * shares * rate
      const plEur = mktValueEur - costEur
      const plPct = costEur > 0 ? (plEur / costEur) * 100 : 0
      const dayPlEur = num(h.dayChange) * shares * rate

      // ISIN country prefix
      const isinMatch = /^[A-Z]{2}/.exec(h.ticker || '')
      const isinPrefix = isinMatch ? isinMatch[0] : null
      const geo = (isinPrefix && ISIN_GEO[isinPrefix]) || CCY_GEO[h.currency] || 'Eurozone'

      return { ...h, rate, mktValueEur, costEur, plEur, plPct, dayPlEur, geo }
    })

    const totalEur = enriched.reduce((s, h) => s + h.mktValueEur, 0)
    const totalCostEur = enriched.reduce((s, h) => s + h.costEur, 0)

    return { enriched, totalEur, totalCostEur }
  }, [mergedHoldings, fxRates])

  // ── Asset Allocation ──
  const assetData = useMemo(() => {
    const groups = {}
    for (const h of analytics.enriched) {
      const cls = h.class || 'other'
      groups[cls] = (groups[cls] || 0) + h.mktValueEur
    }
    return Object.entries(groups)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([cls, value]) => ({
        label: ASSET_CLASSES[cls]?.label || cls.toUpperCase(),
        value,
        color: ASSET_COLORS[cls] || '#5a6a80',
      }))
  }, [analytics])

  // ── Currency Exposure ──
  const currencyData = useMemo(() => {
    const groups = {}
    for (const h of analytics.enriched) {
      const ccy = h.currency || 'EUR'
      groups[ccy] = (groups[ccy] || 0) + h.mktValueEur
    }
    return Object.entries(groups)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([ccy, value]) => ({
        label: ccy,
        value,
        color: CCY_COLORS[ccy] || '#5a6a80',
      }))
  }, [analytics])

  // ── Geographic Exposure ──
  const geoData = useMemo(() => {
    const groups = {}
    for (const h of analytics.enriched) {
      groups[h.geo] = (groups[h.geo] || 0) + h.mktValueEur
    }
    return Object.entries(groups)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([geo, value]) => ({
        label: geo,
        value,
        color: GEO_COLORS[geo] || '#5a6a80',
      }))
  }, [analytics])

  // ── Broker Allocation ──
  const brokerData = useMemo(() => {
    const groups = {}
    for (const h of analytics.enriched) {
      const broker = h.broker || 'Unknown'
      groups[broker] = (groups[broker] || 0) + h.mktValueEur
    }
    return Object.entries(groups)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([broker, value], i) => ({
        label: broker,
        value,
        color: BROKER_COLORS[i % BROKER_COLORS.length],
      }))
  }, [analytics])

  // ── Top Holdings ──
  const topHoldings = useMemo(() => {
    return [...analytics.enriched]
      .filter(h => h.mktValueEur > 0)
      .sort((a, b) => b.mktValueEur - a.mktValueEur)
      .slice(0, 10)
      .map(h => ({
        label: h.name || h.ticker,
        value: h.mktValueEur,
        pct: analytics.totalEur > 0 ? (h.mktValueEur / analytics.totalEur) * 100 : 0,
        color: '#ff9800',
      }))
  }, [analytics])

  // ── Best / Worst Performers ──
  const { best, worst } = useMemo(() => {
    const sorted = [...analytics.enriched]
      .filter(h => h.costEur > 0 && h.mktValueEur > 0)
      .sort((a, b) => b.plPct - a.plPct)
    return {
      best: sorted.filter(h => h.plPct > 0).slice(0, 5).map(h => ({
        label: h.name || h.ticker,
        value: h.plEur,
        pct: h.plPct,
        color: '#00c853',
      })),
      worst: sorted.filter(h => h.plPct < 0).slice(-5).reverse().map(h => ({
        label: h.name || h.ticker,
        value: h.plEur,
        pct: h.plPct,
        color: '#ff1744',
      })),
    }
  }, [analytics])

  // ── Portfolio History (aggregate EUR value over time) ──
  const portfolioHistory = useMemo(() => {
    const holdingsWithHistory = analytics.enriched.filter(
      h => Array.isArray(h.history) && h.history.length > 0
    )
    if (holdingsWithHistory.length === 0) return []

    // Build price lookup per holding: Map<ticker, Map<date, close>>
    const dateSet = new Set()
    const lookups = new Map()
    for (const h of holdingsWithHistory) {
      const m = new Map()
      for (const pt of h.history) {
        if (pt?.date && Number.isFinite(num(pt.close))) {
          m.set(pt.date, num(pt.close))
          dateSet.add(pt.date)
        }
      }
      lookups.set(h.ticker, m)
    }

    const allDates = [...dateSet].sort()
    if (allDates.length < 2) return []

    // Forward-fill: for each holding, build a continuous price series
    const filled = new Map()
    for (const h of holdingsWithHistory) {
      const raw = lookups.get(h.ticker)
      const series = new Map()
      let lastPrice = null
      for (const date of allDates) {
        if (raw.has(date)) lastPrice = raw.get(date)
        if (lastPrice != null) series.set(date, lastPrice)
      }
      filled.set(h.ticker, series)
    }

    // Aggregate
    return allDates.map(date => {
      let total = 0
      for (const h of holdingsWithHistory) {
        const price = filled.get(h.ticker)?.get(date)
        if (price != null) {
          total += price * num(h.shares) * h.rate
        }
      }
      return { time: date, value: Math.round(total * 100) / 100 }
    }).filter(pt => pt.value > 0)
  }, [analytics])

  // ── Key stats ──
  const totalPL = analytics.totalEur - analytics.totalCostEur
  const totalPLPct = analytics.totalCostEur > 0 ? (totalPL / analytics.totalCostEur) * 100 : 0
  const holdingCount = analytics.enriched.length
  const currencyCount = new Set(analytics.enriched.map(h => h.currency)).size
  const brokerCount = new Set(analytics.enriched.map(h => h.broker).filter(Boolean)).size

  return (
    <div className="space-y-3">
      {/* Key Metrics strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: 'Holdings', value: holdingCount },
          { label: 'Currencies', value: currencyCount },
          { label: 'Brokers', value: brokerCount },
          {
            label: 'Total P&L',
            value: `${totalPL >= 0 ? '+' : ''}${totalPLPct.toFixed(1)}%`,
            color: totalPL >= 0 ? 'text-bb-green' : 'text-bb-red',
          },
        ].map((stat, i) => (
          <div key={i} className="bg-bb-surface rounded border border-bb-border-hi px-3 py-2 text-center">
            <div className="text-xxs text-bb-muted uppercase tracking-wider">{stat.label}</div>
            <div className={`text-sm font-semibold tabular-nums ${stat.color || 'text-gray-100'}`}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Portfolio History */}
      <Section title="Portfolio Value — 1 Year">
        <PortfolioHistory data={portfolioHistory} />
      </Section>

      {/* Donuts: 2-col grid on md+ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Section title="Asset Allocation">
          <DonutChart data={assetData} />
        </Section>
        <Section title="Currency Exposure">
          <DonutChart data={currencyData} />
        </Section>
        <Section title="Geographic Exposure">
          <DonutChart data={geoData} />
          <p className="text-xxs text-bb-muted-dim mt-2 italic">
            ETF/fund geography reflects domicile, not underlying exposure.
          </p>
        </Section>
        <Section title="Broker Allocation">
          <DonutChart data={brokerData} />
        </Section>
      </div>

      {/* Top Holdings */}
      <Section title="Top 10 Holdings">
        <BarChart data={topHoldings} />
      </Section>

      {/* Best / Worst */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Section title="Best Performers">
          {best.length > 0
            ? <BarChart data={best} />
            : <div className="text-bb-muted text-xxs text-center py-4">No gains yet</div>
          }
        </Section>
        <Section title="Worst Performers">
          {worst.length > 0
            ? <BarChart data={worst} />
            : <div className="text-bb-muted text-xxs text-center py-4">No losses yet</div>
          }
        </Section>
      </div>
    </div>
  )
}
