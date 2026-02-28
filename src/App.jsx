import { useState, useEffect, useCallback, useRef } from 'react'
import Header from './components/Header'
import Analytics from './components/Analytics'
import AssetSection from './components/AssetSection'
import Chart from './components/Chart'
import ManagePortfolio from './components/ManagePortfolio'
import { fetchMissingPrices, fetchFXRates } from './lib/fetchPrices'
import { fmtCurrency } from './lib/format'
import { hasToken, readConfig, writeConfig } from './lib/githubStorage'

const SECTION_ORDER = ['stock', 'etf', 'fund', 'bond', 'crypto', 'commodity', 'other']

/** Safe number — returns 0 for NaN/Infinity/undefined */
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0 }

/** Normalize a raw holding into a safe shape. Returns null if invalid. */
function normalizeHolding(h) {
  if (!h || typeof h !== 'object') return null
  const ticker = String(h.ticker || '').trim()
  if (!ticker) return null
  return {
    ticker,
    shares: num(h.shares),
    avgCost: num(h.avgCost),
    currency: h.currency || 'USD',
    broker: h.broker || '',
    class: h.class || undefined,
  }
}

/** Safely extract and normalize holdings from any data source */
function extractHoldings(data) {
  if (!data || typeof data !== 'object') return []
  const raw = Array.isArray(data.holdings) ? data.holdings : []
  return raw.map(normalizeHolding).filter(Boolean)
}

export default function App() {
  const [priceData, setPriceData] = useState(null)
  const [holdings, setHoldings] = useState(null)
  const [configSha, setConfigSha] = useState(null)
  const [clientPrices, setClientPrices] = useState(new Map())
  const [selectedTicker, setSelectedTicker] = useState(null)
  const [tab, setTab] = useState('dashboard')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [fetchingLive, setFetchingLive] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [fxRates, setFxRates] = useState({ EUR: 1 })
  const fetchedRef = useRef(new Set())

  // ── Load holdings ──
  useEffect(() => {
    let cancelled = false

    const pricePromise = fetch(`${import.meta.env.BASE_URL}data/portfolio.json`)
      .then(res => (res.ok ? res.json() : null))
      .catch(() => null)

    const configPromise = hasToken()
      ? readConfig().catch(err => {
          console.warn('[App] GitHub config read failed:', err.message)
          return null
        })
      : Promise.resolve(null)

    Promise.all([pricePromise, configPromise])
      .then(([priceJson, ghConfig]) => {
        if (cancelled) return
        if (priceJson) setPriceData(priceJson)

        let holdingsList = []
        if (ghConfig) {
          holdingsList = extractHoldings(ghConfig)
          if (ghConfig._sha) setConfigSha(ghConfig._sha)
        } else if (priceJson) {
          holdingsList = extractHoldings(priceJson)
        }

        // Enrich with asset class from price data
        if (holdingsList.length > 0 && priceJson) {
          const classMap = {}
          for (const h of extractHoldings(priceJson)) {
            if (h.class) classMap[h.ticker] = h.class
          }
          holdingsList = holdingsList.map(h => ({
            ...h,
            class: h.class || classMap[h.ticker] || undefined,
          }))
        }

        if (holdingsList.length > 0) {
          setHoldings(holdingsList)
          setSelectedTicker(holdingsList[0].ticker)
        } else {
          setHoldings([])
          setError('No portfolio data found. Add holdings in the Manage tab.')
        }
        setLoading(false)
      })
      .catch(err => {
        if (cancelled) return
        console.error('[App] Fatal load error:', err)
        setError('Failed to load portfolio data')
        setHoldings([])
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [])

  // ── Fetch FX rates for currency conversion to EUR ──
  useEffect(() => {
    if (!holdings || holdings.length === 0) return
    const currencies = [...new Set(holdings.map(h => h.currency || 'USD'))]
    if (currencies.length <= 1 && currencies[0] === 'EUR') return // all EUR, no FX needed

    fetchFXRates(currencies, 'EUR')
      .then(rates => setFxRates(rates))
      .catch(err => console.warn('[App] FX rates fetch failed:', err.message))
  }, [holdings])

  // ── Fetch live prices for tickers not in pre-fetched data ──
  useEffect(() => {
    if (!holdings || holdings.length === 0 || !priceData) return

    const preFetched = new Set(extractHoldings(priceData).map(h => h.ticker))
    const missing = holdings
      .map(h => h.ticker)
      .filter(t => !preFetched.has(t) && !fetchedRef.current.has(t))

    if (missing.length === 0) return

    missing.forEach(t => fetchedRef.current.add(t))
    setFetchingLive(true)

    fetchMissingPrices(missing)
      .then(priceMap => {
        if (priceMap.size > 0) {
          setClientPrices(prev => {
            const next = new Map(prev)
            for (const [ticker, data] of priceMap) next.set(ticker, data)
            return next
          })
          setHoldings(prev => {
            if (!Array.isArray(prev)) return prev
            let changed = false
            const updated = prev.map(h => {
              const live = priceMap.get(h.ticker)
              if (live?.class && live.class !== 'other' && h.class !== live.class) {
                changed = true
                return { ...h, class: live.class }
              }
              return h
            })
            return changed ? updated : prev
          })
        }
      })
      .catch(err => console.warn('[App] Live price fetch failed:', err.message))
      .finally(() => setFetchingLive(false))
  }, [holdings, priceData])

  // ── Save holdings to GitHub ──
  const handleSaveHoldings = useCallback(async (newHoldings) => {
    const safe = (Array.isArray(newHoldings) ? newHoldings : [])
      .map(normalizeHolding)
      .filter(Boolean)

    setHoldings(safe)
    fetchedRef.current = new Set()
    setSaveError(null)

    if (!hasToken()) {
      setSaveError('Set a GitHub token to save to the repo')
      return
    }

    setSaving(true)
    try {
      const configHoldings = safe.map(({ ticker, shares, avgCost, currency, broker }) => ({
        ticker, shares, avgCost, currency, broker,
      }))
      const newSha = await writeConfig(configHoldings, configSha)
      setConfigSha(newSha)
    } catch (err) {
      console.error('[App] Save failed:', err)
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }, [configSha])

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen bg-bb-bg flex items-center justify-center">
        <div className="text-bb-amber text-sm animate-pulse tracking-wider">LOADING PORTFOLIO...</div>
      </div>
    )
  }

  // ── Empty / error state — still allow Manage tab ──
  if (error && (!holdings || holdings.length === 0)) {
    return (
      <div className="min-h-screen bg-bb-bg text-gray-100">
        <Header lastUpdated={new Date().toISOString()} tab={tab} onTabChange={setTab} />
        <main className="max-w-7xl mx-auto px-4 py-3">
          {tab === 'dashboard' ? (
            <div className="flex flex-col items-center justify-center gap-4 py-20">
              <div className="text-bb-amber text-sm">{error}</div>
              <button
                onClick={() => setTab('manage')}
                className="px-4 py-2 text-sm bg-orange-600 text-white rounded hover:bg-orange-500 transition-colors"
              >
                Go to Manage
              </button>
            </div>
          ) : (
            <ManagePortfolio
              holdings={holdings || []}
              onSave={handleSaveHoldings}
              saving={saving}
              saveError={saveError}
            />
          )}
        </main>
      </div>
    )
  }

  // ── Merge holdings with price data ──
  const safeHoldings = Array.isArray(holdings) ? holdings : []
  const mergedHoldings = safeHoldings.map(h => {
    const preFetched = Array.isArray(priceData?.holdings)
      ? priceData.holdings.find(p => p?.ticker === h.ticker)
      : null
    const live = clientPrices.get(h.ticker)
    const price = preFetched || live

    return {
      ticker: h.ticker,
      name: price?.name || h.ticker,
      shares: num(h.shares),
      avgCost: num(h.avgCost),
      currency: h.currency || 'USD',
      broker: h.broker || '',
      class: price?.class || h.class || 'other',
      currentPrice: num(price?.currentPrice) || num(h.avgCost),
      previousClose: num(price?.previousClose) || num(h.avgCost),
      dayChange: num(price?.dayChange),
      dayChangePercent: num(price?.dayChangePercent),
      history: Array.isArray(price?.history) ? price.history : [],
    }
  })

  // ── Group by class, sort by descending market value ──
  const grouped = {}
  for (const h of mergedHoldings) {
    const cls = h.class || 'other'
    if (!grouped[cls]) grouped[cls] = []
    grouped[cls].push(h)
  }
  for (const cls of Object.keys(grouped)) {
    grouped[cls].sort((a, b) => (b.currentPrice * b.shares) - (a.currentPrice * a.shares))
  }

  // ── Portfolio-wide EUR totals ──
  let totalEurValue = 0, totalEurCost = 0, totalDayPLEur = 0
  for (const h of mergedHoldings) {
    const rate = num(fxRates[h.currency]) || (h.currency === 'EUR' ? 1 : 0)
    totalEurValue += h.currentPrice * h.shares * rate
    totalEurCost += h.avgCost * h.shares * rate
    totalDayPLEur += h.dayChange * h.shares * rate
  }
  const totalEurPL = totalEurValue - totalEurCost
  const totalEurPLPct = totalEurCost > 0 ? (totalEurPL / totalEurCost) * 100 : 0
  const prevEurValue = totalEurValue - totalDayPLEur
  const totalDayPLPct = prevEurValue > 0 ? (totalDayPLEur / prevEurValue) * 100 : 0

  const selectedHolding = mergedHoldings.find(h => h.ticker === selectedTicker) || null
  const lastUpdated = priceData?.lastUpdated || new Date().toISOString()

  return (
    <div className="min-h-screen bg-bb-bg text-gray-100">
      <Header lastUpdated={lastUpdated} tab={tab} onTabChange={setTab} />
      <main className="max-w-7xl mx-auto px-4 py-3 space-y-3">
        {tab === 'dashboard' && (
          <>
            {fetchingLive && (
              <div className="text-bb-amber text-xxs animate-pulse text-center tracking-wider">
                FETCHING LIVE PRICES...
              </div>
            )}

            {/* Portfolio summary strip */}
            {totalEurValue > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-6 px-3 sm:px-4 py-2 sm:py-2.5 bg-bb-surface border border-bb-border-hi rounded">
                <div className="flex items-baseline gap-2">
                  <span className="text-xxs font-bold uppercase tracking-widest text-bb-amber">Portfolio</span>
                  <span className="text-sm sm:text-base font-semibold text-gray-100 tabular-nums">{fmtCurrency(totalEurValue, 'EUR')}</span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs">
                  <div className="flex items-center gap-1">
                    <span className="text-bb-muted text-xxs uppercase">P&L</span>
                    <span className={`font-medium tabular-nums ${totalEurPL >= 0 ? 'text-bb-green' : 'text-bb-red'}`}>
                      {totalEurPL >= 0 ? '+' : ''}{fmtCurrency(Math.abs(totalEurPL), 'EUR')}
                    </span>
                    <span className={`text-xxs tabular-nums ${totalEurPL >= 0 ? 'text-bb-green' : 'text-bb-red'}`}>
                      {totalEurPLPct >= 0 ? '+' : ''}{totalEurPLPct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-bb-muted text-xxs uppercase">Day</span>
                    <span className={`font-medium tabular-nums ${totalDayPLEur >= 0 ? 'text-bb-green' : 'text-bb-red'}`}>
                      {totalDayPLEur >= 0 ? '+' : ''}{fmtCurrency(Math.abs(totalDayPLEur), 'EUR')}
                    </span>
                    <span className={`text-xxs tabular-nums ${totalDayPLEur >= 0 ? 'text-bb-green' : 'text-bb-red'}`}>
                      {totalDayPLPct >= 0 ? '+' : ''}{totalDayPLPct.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>
            )}

            {SECTION_ORDER.map(cls =>
              grouped[cls] ? (
                <AssetSection
                  key={cls}
                  assetClass={cls}
                  holdings={grouped[cls]}
                  selectedTicker={selectedTicker}
                  onSelect={setSelectedTicker}
                  fxRates={fxRates}
                />
              ) : null
            )}
            {selectedHolding && <Chart holding={selectedHolding} />}
          </>
        )}
        {tab === 'analytics' && (
          <Analytics mergedHoldings={mergedHoldings} fxRates={fxRates} />
        )}
        {tab === 'manage' && (
          <ManagePortfolio
            holdings={safeHoldings}
            onSave={handleSaveHoldings}
            saving={saving}
            saveError={saveError}
          />
        )}
      </main>
    </div>
  )
}
