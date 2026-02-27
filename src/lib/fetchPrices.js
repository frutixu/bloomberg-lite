/**
 * Client-side Yahoo Finance price fetching via CORS proxy.
 * Used as a fallback for tickers not in the pre-fetched portfolio.json.
 */

const PROXY = 'https://corsproxy.io/?url='
const YF_CHART = 'https://query1.finance.yahoo.com/v8/finance/chart/'

// Map Yahoo quoteType to our internal class
const CLASS_MAP = {
  EQUITY: 'stock',
  ETF: 'etf',
  MUTUALFUND: 'fund',
  CRYPTOCURRENCY: 'crypto',
  FUTURE: 'commodity',
  INDEX: 'stock',
}

/**
 * Fetch price data for a single ticker from Yahoo Finance.
 * Returns { ticker, name, currentPrice, previousClose, dayChange, dayChangePercent, class, history }
 * or null on failure.
 */
async function fetchOneTicker(ticker) {
  try {
    const params = new URLSearchParams({
      range: '1y',
      interval: '1d',
      includePrePost: 'false',
    })
    const url = `${PROXY}${encodeURIComponent(`${YF_CHART}${encodeURIComponent(ticker)}?${params}`)}`
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) return null

    const json = await res.json()
    const result = json?.chart?.result?.[0]
    if (!result) return null

    const meta = result.meta
    const currentPrice = meta.regularMarketPrice
    const previousClose = meta.chartPreviousClose ?? meta.previousClose ?? currentPrice
    const dayChange = currentPrice - previousClose
    const dayChangePercent = previousClose !== 0 ? (dayChange / previousClose) * 100 : 0
    const quoteType = meta.instrumentType || meta.quoteType || ''
    const assetClass = CLASS_MAP[quoteType] || 'other'
    const name = meta.longName || meta.shortName || ticker

    // Build history from timestamps + closes
    const timestamps = result.timestamp || []
    const closes = result.indicators?.quote?.[0]?.close || []
    const history = []
    for (let i = 0; i < timestamps.length; i++) {
      if (closes[i] != null) {
        const d = new Date(timestamps[i] * 1000)
        history.push({
          date: d.toISOString().slice(0, 10),
          close: Math.round(closes[i] * 100) / 100,
        })
      }
    }

    return {
      ticker,
      name,
      currentPrice: Math.round(currentPrice * 100) / 100,
      previousClose: Math.round(previousClose * 100) / 100,
      dayChange: Math.round(dayChange * 100) / 100,
      dayChangePercent: Math.round(dayChangePercent * 100) / 100,
      class: assetClass,
      history,
    }
  } catch (err) {
    console.warn(`[fetchPrices] Failed to fetch ${ticker}:`, err.message)
    return null
  }
}

/**
 * Fetch prices for multiple tickers in parallel.
 * Returns a Map<ticker, priceData>.
 */
export async function fetchMissingPrices(tickers) {
  if (!tickers || tickers.length === 0) return new Map()

  const results = await Promise.allSettled(tickers.map(t => fetchOneTicker(t)))
  const priceMap = new Map()

  results.forEach((r, i) => {
    if (r.status === 'fulfilled' && r.value) {
      priceMap.set(tickers[i], r.value)
    }
  })

  return priceMap
}
