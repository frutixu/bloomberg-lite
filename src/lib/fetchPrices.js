/**
 * Client-side Yahoo Finance price fetching via CORS proxy.
 * Used as a fallback for tickers not in the pre-fetched portfolio.json.
 *
 * Accepts ANY input as ticker:
 *  - Standard tickers: AAPL, GOOGL, BTC-USD
 *  - ISINs: FR0010147603, US0378331005
 *  - Product names: "Carmignac Investissement", "Apple"
 *
 * Strategy: try chart API directly first. If it fails, search Yahoo Finance
 * to resolve the input to a valid symbol, then fetch the chart.
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

/**
 * Search Yahoo Finance for a query (name, ISIN, or partial ticker).
 * Returns { symbol, name, quoteType } or null.
 */
async function searchYahoo(query) {
  try {
    const params = new URLSearchParams({ q: query, quotesCount: 5, newsCount: 0 })
    const url = `${PROXY}${encodeURIComponent(`${YF_SEARCH}?${params}`)}`
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) return null

    const json = await res.json()
    const quotes = json?.quotes || []
    if (quotes.length === 0) return null

    const best = quotes[0]
    return {
      symbol: best.symbol,
      name: best.longname || best.shortname || best.symbol,
      quoteType: best.quoteType || best.typeDisp || '',
    }
  } catch (err) {
    console.warn(`[fetchPrices] Search failed for "${query}":`, err.message)
    return null
  }
}

/**
 * Fetch chart data for a Yahoo Finance symbol.
 * Returns the raw chart result or null.
 */
async function fetchChart(symbol) {
  try {
    const params = new URLSearchParams({
      range: '1y',
      interval: '1d',
      includePrePost: 'false',
    })
    const url = `${PROXY}${encodeURIComponent(`${YF_CHART}${encodeURIComponent(symbol)}?${params}`)}`
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) return null

    const json = await res.json()
    return json?.chart?.result?.[0] || null
  } catch {
    return null
  }
}

/**
 * Heuristic: does this look like a standard ticker or known format?
 * Standard tickers: 1-10 uppercase alphanumeric chars, may contain dots, dashes
 * ISINs: exactly 12 chars, 2 letter prefix + 9 alphanum + 1 digit
 */
function looksLikeSymbol(input) {
  // Standard ticker: short, uppercase, alphanumeric with . or -
  if (/^[A-Z0-9][A-Z0-9.\-]{0,11}$/.test(input)) return true
  return false
}

/**
 * Fetch price data for a single input (ticker, ISIN, or product name).
 * Returns { ticker, resolvedSymbol, name, currentPrice, ... } or null.
 */
async function fetchOneTicker(input) {
  try {
    let chartResult = null
    let resolvedSymbol = input
    let resolvedName = null
    let resolvedType = null

    if (looksLikeSymbol(input)) {
      // Try direct chart fetch first (fast path for tickers & ISINs)
      chartResult = await fetchChart(input)
    }

    // If direct fetch failed (or input looks like a name), search first
    if (!chartResult) {
      const search = await searchYahoo(input)
      if (!search) return null

      resolvedSymbol = search.symbol
      resolvedName = search.name
      resolvedType = search.quoteType

      // Now fetch chart with the resolved symbol
      chartResult = await fetchChart(resolvedSymbol)
      if (!chartResult) return null
    }

    const meta = chartResult.meta
    const currentPrice = meta.regularMarketPrice
    const quoteType = resolvedType || meta.instrumentType || meta.quoteType || ''
    const assetClass = CLASS_MAP[quoteType] || 'other'
    const name = resolvedName || meta.longName || meta.shortName || input

    // Build history from timestamps + closes
    const timestamps = chartResult.timestamp || []
    const closes = chartResult.indicators?.quote?.[0]?.close || []
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

    // Compute intraday change from the last two history points
    let previousClose = currentPrice
    if (history.length >= 2) {
      previousClose = history[history.length - 2].close
    } else if (meta.previousClose != null) {
      previousClose = meta.previousClose
    }
    const dayChange = currentPrice - previousClose
    const dayChangePercent = previousClose !== 0 ? (dayChange / previousClose) * 100 : 0

    return {
      ticker: input, // keep original input as the key
      resolvedSymbol, // the actual Yahoo symbol (for reference)
      name,
      currentPrice: Math.round(currentPrice * 100) / 100,
      previousClose: Math.round(previousClose * 100) / 100,
      dayChange: Math.round(dayChange * 100) / 100,
      dayChangePercent: Math.round(dayChangePercent * 100) / 100,
      class: assetClass,
      history,
    }
  } catch (err) {
    console.warn(`[fetchPrices] Failed to fetch "${input}":`, err.message)
    return null
  }
}

/**
 * Fetch prices for multiple inputs in parallel.
 * Returns a Map<originalInput, priceData>.
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
