import { useState, useEffect, useCallback } from 'react'
import Header from './components/Header'
import PortfolioSummary from './components/PortfolioSummary'
import AssetSection from './components/AssetSection'
import Chart from './components/Chart'
import ManagePortfolio from './components/ManagePortfolio'

const STORAGE_KEY = 'bloomberg-lite-holdings'
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

export default function App() {
  const [priceData, setPriceData] = useState(null)
  const [holdings, setHoldings] = useState(null)
  const [selectedTicker, setSelectedTicker] = useState(null)
  const [tab, setTab] = useState('dashboard')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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
          // Sync: update class from fetched data + add new tickers
          const savedTickers = new Set(saved.map(h => h.ticker))
          const updated = saved.map(h => ({
            ...h,
            class: fetchedClassMap[h.ticker] || h.class || undefined,
          }))
          const newFromFetch = json.holdings
            .filter(h => !savedTickers.has(h.ticker))
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

  const handleSaveHoldings = useCallback((newHoldings) => {
    setHoldings(newHoldings)
    saveConfig(newHoldings)
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

  // Merge user config (shares, avgCost, currency, broker, class) with fetched data (prices, history)
  const mergedHoldings = (holdings || []).map(h => {
    const price = priceData?.holdings?.find(p => p.ticker === h.ticker)
    return {
      ticker: h.ticker,
      name: price?.name || h.ticker,
      shares: h.shares,
      avgCost: h.avgCost,
      currency: h.currency || 'USD',
      broker: h.broker || '',
      class: price?.class || h.class || 'other',  // fetched > saved > other
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
