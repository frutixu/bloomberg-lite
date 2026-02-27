import { useState, useEffect, useCallback } from 'react'
import Header from './components/Header'
import PortfolioSummary from './components/PortfolioSummary'
import AssetSection from './components/AssetSection'
import Chart from './components/Chart'
import ManagePortfolio from './components/ManagePortfolio'

const STORAGE_KEY = 'bloomberg-lite-holdings'
const SECTION_ORDER = ['stock', 'etf', 'bond', 'crypto', 'commodity', 'other']

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

        const saved = loadConfig()
        if (saved) {
          setHoldings(saved)
        } else {
          const initial = json.holdings.map(h => ({
            ticker: h.ticker,
            shares: h.shares,
            avgCost: h.avgCost,
            class: h.class || 'stock',
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
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-orange-500 text-xl animate-pulse">Loading portfolio...</div>
      </div>
    )
  }

  if (error && !holdings) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4">
        <div className="text-red-400 text-xl">Failed to load data</div>
        <div className="text-gray-500 text-sm">{error}</div>
        <div className="text-gray-600 text-xs">Run: python scripts/fetch_data.py</div>
      </div>
    )
  }

  // Merge user config with fetched price data
  const mergedHoldings = (holdings || []).map(h => {
    const price = priceData?.holdings?.find(p => p.ticker === h.ticker)
    return {
      ticker: h.ticker,
      name: price?.name || h.ticker,
      shares: h.shares,
      avgCost: h.avgCost,
      class: h.class || 'stock',
      currentPrice: price?.currentPrice ?? h.avgCost,
      previousClose: price?.previousClose ?? h.avgCost,
      dayChange: price?.dayChange ?? 0,
      dayChangePercent: price?.dayChangePercent ?? 0,
      history: price?.history || [],
    }
  })

  // Group by asset class
  const grouped = {}
  for (const h of mergedHoldings) {
    const cls = h.class || 'stock'
    if (!grouped[cls]) grouped[cls] = []
    grouped[cls].push(h)
  }

  const selectedHolding = mergedHoldings.find(h => h.ticker === selectedTicker)
  const lastUpdated = priceData?.lastUpdated || new Date().toISOString()

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <Header lastUpdated={lastUpdated} tab={tab} onTabChange={setTab} />
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
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
