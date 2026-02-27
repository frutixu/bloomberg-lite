import { useState, useEffect, useCallback, useRef } from 'react'
import Header from './components/Header'
import PortfolioSummary from './components/PortfolioSummary'
import AssetSection from './components/AssetSection'
import Chart from './components/Chart'
import ManagePortfolio from './components/ManagePortfolio'
import { fetchMissingPrices } from './lib/fetchPrices'
import { hasToken, readConfig, writeConfig } from './lib/githubStorage'

const SECTION_ORDER = ['stock', 'etf', 'fund', 'bond', 'crypto', 'commodity', 'other']

export default function App() {
  const [priceData, setPriceData] = useState(null)
  const [holdings, setHoldings] = useState(null)
  const [configSha, setConfigSha] = useState(null) // git sha for updates
  const [clientPrices, setClientPrices] = useState(new Map())
  const [selectedTicker, setSelectedTicker] = useState(null)
  const [tab, setTab] = useState('dashboard')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [fetchingLive, setFetchingLive] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const fetchedRef = useRef(new Set())

  // Load holdings from GitHub API (primary) or deployed portfolio.json (fallback)
  useEffect(() => {
    // Always fetch deployed price data
    const pricePromise = fetch(`${import.meta.env.BASE_URL}data/portfolio.json`)
      .then(res => res.ok ? res.json() : null)
      .catch(() => null)

    // Try GitHub API for latest config (has most up-to-date holdings)
    const configPromise = hasToken()
      ? readConfig().catch(err => {
          console.warn('[App] GitHub config read failed, using deployed data:', err.message)
          return null
        })
      : Promise.resolve(null)

    Promise.all([pricePromise, configPromise]).then(([priceJson, ghConfig]) => {
      if (priceJson) setPriceData(priceJson)

      // Holdings source priority: GitHub API config > deployed portfolio.json
      let holdingsList
      if (ghConfig) {
        holdingsList = ghConfig.holdings.map(h => ({
          ticker: h.ticker,
          shares: h.shares,
          avgCost: h.avgCost,
          currency: h.currency || 'USD',
          broker: h.broker || '',
        }))
        setConfigSha(ghConfig._sha)
      } else if (priceJson) {
        holdingsList = priceJson.holdings.map(h => ({
          ticker: h.ticker,
          shares: h.shares,
          avgCost: h.avgCost,
          currency: h.currency || 'USD',
          broker: h.broker || '',
        }))
      }

      if (holdingsList) {
        // Enrich with class info from price data
        if (priceJson) {
          const classMap = {}
          for (const h of priceJson.holdings) {
            if (h.class) classMap[h.ticker] = h.class
          }
          holdingsList = holdingsList.map(h => ({
            ...h,
            class: classMap[h.ticker] || undefined,
          }))
        }
        setHoldings(holdingsList)
        if (holdingsList.length > 0) setSelectedTicker(holdingsList[0].ticker)
      }

      if (!holdingsList) setError('No portfolio data available')
      setLoading(false)
    })
  }, [])

  // Fetch live prices for tickers not in pre-fetched portfolio.json
  useEffect(() => {
    if (!holdings || !priceData) return

    const preFetchedTickers = new Set((priceData.holdings || []).map(h => h.ticker))
    const missingTickers = holdings
      .map(h => h.ticker)
      .filter(t => !preFetchedTickers.has(t) && !fetchedRef.current.has(t))

    if (missingTickers.length === 0) return

    missingTickers.forEach(t => fetchedRef.current.add(t))
    setFetchingLive(true)

    fetchMissingPrices(missingTickers).then(priceMap => {
      if (priceMap.size > 0) {
        setClientPrices(prev => {
          const next = new Map(prev)
          for (const [ticker, data] of priceMap) next.set(ticker, data)
          return next
        })

        // Update class info from live fetches
        setHoldings(prev => {
          if (!prev) return prev
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
      setFetchingLive(false)
    })
  }, [holdings, priceData])

  // Save holdings to GitHub repo
  const handleSaveHoldings = useCallback(async (newHoldings) => {
    setHoldings(newHoldings)
    fetchedRef.current = new Set()
    setSaveError(null)

    if (!hasToken()) {
      setSaveError('Set a GitHub token in the settings to save to the repo')
      return
    }

    setSaving(true)
    try {
      // Clean holdings for config file (no class — auto-detected on fetch)
      const configHoldings = newHoldings.map(({ ticker, shares, avgCost, currency, broker }) => ({
        ticker,
        shares: Number(shares) || 0,
        avgCost: Number(avgCost) || 0,
        currency: currency || 'USD',
        broker: broker || '',
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

  if (loading) {
    return (
      <div className="min-h-screen bg-bb-bg flex items-center justify-center">
        <div className="text-bb-amber text-sm animate-pulse tracking-wider">LOADING PORTFOLIO...</div>
      </div>
    )
  }

  if (error && !holdings) {
    return (
      <div className="min-h-screen bg-bb-bg flex flex-col items-center justify-center gap-4">
        <div className="text-bb-red text-sm">Failed to load data</div>
        <div className="text-bb-muted text-xs">{error}</div>
      </div>
    )
  }

  // Merge user config with fetched data (pre-fetched + client-side)
  const mergedHoldings = (holdings || []).map(h => {
    const preFetched = priceData?.holdings?.find(p => p.ticker === h.ticker)
    const live = clientPrices.get(h.ticker)
    const price = preFetched || live
    return {
      ticker: h.ticker,
      name: price?.name || h.ticker,
      shares: h.shares,
      avgCost: h.avgCost,
      currency: h.currency || 'USD',
      broker: h.broker || '',
      class: price?.class || h.class || 'other',
      currentPrice: price?.currentPrice ?? h.avgCost,
      previousClose: price?.previousClose ?? h.avgCost,
      dayChange: price?.dayChange ?? 0,
      dayChangePercent: price?.dayChangePercent ?? 0,
      history: price?.history || [],
    }
  })

  // Group by asset class, sorted by descending market value
  const grouped = {}
  for (const h of mergedHoldings) {
    const cls = h.class || 'other'
    if (!grouped[cls]) grouped[cls] = []
    grouped[cls].push(h)
  }
  for (const cls of Object.keys(grouped)) {
    grouped[cls].sort((a, b) => (b.currentPrice * b.shares) - (a.currentPrice * a.shares))
  }

  const selectedHolding = mergedHoldings.find(h => h.ticker === selectedTicker)
  const lastUpdated = priceData?.lastUpdated || new Date().toISOString()

  return (
    <div className="min-h-screen bg-bb-bg text-gray-100">
      <Header lastUpdated={lastUpdated} tab={tab} onTabChange={setTab} />
      <main className="max-w-7xl mx-auto px-4 py-3 space-y-3">
        {tab === 'dashboard' ? (
          <>
            {fetchingLive && (
              <div className="text-bb-amber text-xxs animate-pulse text-center tracking-wider">
                FETCHING LIVE PRICES...
              </div>
            )}
            <PortfolioSummary holdings={mergedHoldings} />
            {SECTION_ORDER.map(cls =>
              grouped[cls] ? (
                <AssetSection
                  key={cls}
                  assetClass={cls}
                  holdings={grouped[cls]}
                  selectedTicker={selectedTicker}
                  onSelect={setSelectedTicker}
                />
              ) : null
            )}
            {selectedHolding && <Chart holding={selectedHolding} />}
          </>
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
