/**
 * Client-side Yahoo Finance price fetching via CORS proxy.
 * Used as a fallback for tickers not in the pre-fetched portfolio.json.
 * Supports ISINs by resolving them via the Yahoo Finance search API.
 */

const PROXY = 'https://corsproxy.io/?url='
const YF_CHART = 'https://query1.finance.yahoo.com/v8/finance/chart/'
const YF_SEARCH = 'https://query1.finance.yahoo.com/v1/finance/search'

// Map Yahoo quoteType to our internal class
const CLASS_MAP = {
  EQUITY: 'stock',
  ETF: 'etf',
  MUTUALFUND: 'fund',
  CRYPTOCURRENCY: 'crypto',
  FUTURE: 'commodity',
  INDEX: 'stock',
}

// ISIN pattern: 2 letter country code + 9 alphanum + 1 check digit
const ISIN_RE = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/

/**
 * Resolve an ISIN to a Yahoo Finance ticker symbol + name via search API.
 * Returns { symbol, name } or null.
 */
async function resolveISIN(isin) {
  try {
    const params = new URLSearchParams({ q: isin, quotesCount: 5, newsCount: 0 })
    const url = `${PROXY}${encodeURIComponent(`${YF_SEARCH}?${params}`)}`
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) return null

    const json = await res.json()
    const quotes = json?.quotes || []
    if (quotes.length === 0) return null

    // Pick the first result — usually the best match
    const best = quotes[0]
    return {
      symbol: best.symbol,
      name: best.longname || best.shortname || best.symbol,
      quoteType: best.quoteType || best.typeDisp || '',
    }
  } catch (err) {
    console.warn(`[fetchPrices] Failed to resolve ISIN ${isin}:`, err.message)
    return null
  }
}

/**
 * Fetch price data for a single ticker from Yahoo Finance.
 * Returns { ticker, name, currentPrice, previousClose, dayChange, dayChangePercent, class, history }
 * or null on failure.
 */
async function fetchOneTicker(ticker) {
  try {
    // If it looks like an ISIN, resolve to a Yahoo symbol first
    let yahooSymbol = ticker
    let resolvedName = null
    let resolvedType = null

    if (ISIN_RE.test(ticker)) {
      const resolved = await resolveISIN(ticker)
      if (!resolved) return null
      yahooSymbol = resolved.symbol
      resolvedName = resolved.name
      resolvedType = resolved.quoteType
    }

    const params = new URLSearchParams({
      range: '1y',
      interval: '1d',
      includePrePost: 'false',
    })
    const url = `${PROXY}${encodeURIComponent(`${YF_CHART}${encodeURIComponent(yahooSymbol)}?${params}`)}`
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) return null

    const json = await res.json()
    const result = json?.chart?.result?.[0]
    if (!result) return null

    const meta = result.meta
    const currentPrice = meta.regularMarketPrice
    const quoteType = resolvedType || meta.instrumentType || meta.quoteType || ''
    const assetClass = CLASS_MAP[quoteType] || 'other'
    const name = resolvedName || meta.longName || meta.shortName || ticker

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

    // Compute intraday change from the last two history points (not chartPreviousClose which is range-start)
    let previousClose = currentPrice
    if (history.length >= 2) {
      previousClose = history[history.length - 2].close
    } else if (meta.previousClose != null) {
      previousClose = meta.previousClose
    }
    const dayChange = currentPrice - previousClose
    const dayChangePercent = previousClose !== 0 ? (dayChange / previousClose) * 100 : 0

    return {
      ticker, // keep original ticker (ISIN or symbol) as the key
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
