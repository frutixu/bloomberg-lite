import { useState, useEffect, useCallback, useRef } from 'react'
import Header from './components/Header'
import PortfolioSummary from './components/PortfolioSummary'
import AssetSection from './components/AssetSection'
import Chart from './components/Chart'
import ManagePortfolio from './components/ManagePortfolio'
import { fetchMissingPrices } from './lib/fetchPrices'

const STORAGE_KEY = 'bloomberg-lite-holdings'
const DISMISSED_KEY = 'bloomberg-lite-dismissed'
const SECTION_ORDER = ['stock', 'etf', 'fund', 'bond', 'crypto', 'commodity', 'other']

function loadConfig() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return JSON.parse(saved)
  } catch {}
  return null
}

function saveConfig(holdings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(holdings))
}

function loadDismissed() {
  try {
    const d = localStorage.getItem(DISMISSED_KEY)
    if (d) return new Set(JSON.parse(d))
  } catch {}
  return new Set()
}

function saveDismissed(set) {
  localStorage.setItem(DISMISSED_KEY, JSON.stringify([...set]))
}

export default function App() {
  const [priceData, setPriceData] = useState(null)
  const [holdings, setHoldings] = useState(null)
  const [clientPrices, setClientPrices] = useState(new Map())
  const [selectedTicker, setSelectedTicker] = useState(null)
  const [tab, setTab] = useState('dashboard')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [fetchingLive, setFetchingLive] = useState(false)
  const fetchedRef = useRef(new Set()) // track already-fetched tickers to avoid refetching

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/portfolio.json`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to load portfolio data')
        return res.json()
      })
      .then(json => {
        setPriceData(json)

        // Build a map of fetched class info for persistence
        const fetchedClassMap = {}
        for (const h of json.holdings) {
          if (h.class) fetchedClassMap[h.ticker] = h.class
        }

        const saved = loadConfig()
        if (saved) {
          // Sync: update class from fetched data + add new tickers (but not dismissed ones)
          const savedTickers = new Set(saved.map(h => h.ticker))
          const dismissed = loadDismissed()
          const updated = saved.map(h => ({
            ...h,
            class: fetchedClassMap[h.ticker] || h.class || undefined,
          }))
          const newFromFetch = json.holdings
            .filter(h => !savedTickers.has(h.ticker) && !dismissed.has(h.ticker))
            .map(h => ({
              ticker: h.ticker,
              shares: h.shares,
              avgCost: h.avgCost,
              currency: h.currency || 'USD',
              broker: h.broker || '',
              class: h.class || undefined,
            }))
          const merged = newFromFetch.length > 0 ? [...updated, ...newFromFetch] : updated
          setHoldings(merged)
          saveConfig(merged)
        } else {
          const initial = json.holdings.map(h => ({
            ticker: h.ticker,
            shares: h.shares,
            avgCost: h.avgCost,
            currency: h.currency || 'USD',
            broker: h.broker || '',
            class: h.class || undefined,
          }))
          setHoldings(initial)
          saveConfig(initial)
        }

        if (json.holdings.length > 0) {
          setSelectedTicker(json.holdings[0].ticker)
        }
        setLoading(false)
      })
      .catch(err => {
        const saved = loadConfig()
        if (saved) {
          setHoldings(saved)
          setLoading(false)
        } else {
          setError(err.message)
          setLoading(false)
        }
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

    // Mark as fetched to prevent re-fetching
    missingTickers.forEach(t => fetchedRef.current.add(t))
    setFetchingLive(true)

    fetchMissingPrices(missingTickers).then(priceMap => {
      if (priceMap.size > 0) {
        setClientPrices(prev => {
          const next = new Map(prev)
          for (const [ticker, data] of priceMap) {
            next.set(ticker, data)
          }
          return next
        })

        // Persist discovered class info to localStorage
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
          if (changed) {
            saveConfig(updated)
            return updated
          }
          return prev
        })
      }
      setFetchingLive(false)
    })
  }, [holdings, priceData])

  const handleSaveHoldings = useCallback((newHoldings) => {
    // Track removed tickers so they don't get re-added from server data
    setHoldings(prev => {
      if (prev) {
        const newTickers = new Set(newHoldings.map(h => h.ticker))
        const removed = prev.filter(h => !newTickers.has(h.ticker)).map(h => h.ticker)
        if (removed.length > 0) {
          const dismissed = loadDismissed()
          removed.forEach(t => dismissed.add(t))
          saveDismissed(dismissed)
        }
        // If a previously dismissed ticker is re-added, un-dismiss it
        const dismissed = loadDismissed()
        let changed = false
        for (const h of newHoldings) {
          if (dismissed.has(h.ticker)) {
            dismissed.delete(h.ticker)
            changed = true
          }
        }
        if (changed) saveDismissed(dismissed)
      }
      return newHoldings
    })
    saveConfig(newHoldings)
    // Reset fetched tracker so new tickers get fetched
    fetchedRef.current = new Set()
  }, [])

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
        <div className="text-bb-muted-dim text-xxs">Run: python scripts/fetch_data.py</div>
      </div>
    )
  }

  // Merge user config with fetched data (pre-fetched + client-side)
  const mergedHoldings = (holdings || []).map(h => {
    const preFetched = priceData?.holdings?.find(p => p.ticker === h.ticker)
    const live = clientPrices.get(h.ticker)
    // Priority: pre-fetched server data > client-side live fetch > fallback
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

  // Group by asset class (auto-detected)
  const grouped = {}
  for (const h of mergedHoldings) {
    const cls = h.class || 'other'
    if (!grouped[cls]) grouped[cls] = []
    grouped[cls].push(h)
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
          />
        )}
      </main>
    </div>
  )
}
