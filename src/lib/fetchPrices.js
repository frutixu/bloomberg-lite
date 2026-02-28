/**
 * Client-side Yahoo Finance price fetching via CORS proxy.
 * Fallback for tickers not in the pre-fetched portfolio.json.
 *
 * Accepts ANY input: ticker (AAPL), ISIN (FR0010147603), or name ("Carmignac").
 * Strategy: try chart API directly → if fail, search Yahoo → retry chart.
 */

const PROXY = 'https://corsproxy.io/?url='
const YF_CHART = 'https://query1.finance.yahoo.com/v8/finance/chart/'
const YF_SEARCH = 'https://query1.finance.yahoo.com/v1/finance/search'
const TIMEOUT_MS = 10_000

const CLASS_MAP = {
  EQUITY: 'stock', ETF: 'etf', MUTUALFUND: 'fund',
  CRYPTOCURRENCY: 'crypto', FUTURE: 'commodity', INDEX: 'stock',
}

/** Safe number coercion — returns 0 for anything non-finite */
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0 }

/** Search Yahoo Finance. Returns { symbol, name, quoteType } or null. */
async function searchYahoo(query) {
  try {
    const params = new URLSearchParams({ q: query, quotesCount: 5, newsCount: 0 })
    const url = `${PROXY}${encodeURIComponent(`${YF_SEARCH}?${params}`)}`
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) })
    if (!res.ok) return null

    const json = await res.json().catch(() => null)
    const quotes = json?.quotes
    if (!Array.isArray(quotes) || quotes.length === 0) return null

    const best = quotes[0]
    if (!best?.symbol) return null
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

/** Fetch chart data for a Yahoo symbol. Returns raw chart result or null. */
async function fetchChart(symbol) {
  try {
    const params = new URLSearchParams({ range: '1y', interval: '1d', includePrePost: 'false' })
    const url = `${PROXY}${encodeURIComponent(`${YF_CHART}${encodeURIComponent(symbol)}?${params}`)}`
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) })
    if (!res.ok) return null

    const json = await res.json().catch(() => null)
    return json?.chart?.result?.[0] ?? null
  } catch {
    return null
  }
}

/** Does input look like a standard ticker/ISIN (uppercase alphanum with . or -)? */
const looksLikeSymbol = (s) => /^[A-Z0-9][A-Z0-9.\-]{0,11}$/.test(s)

/**
 * Fetch price data for one input (ticker, ISIN, or name).
 * Returns normalized price object or null — never throws.
 */
async function fetchOneTicker(input) {
  try {
    let chartResult = null
    let resolvedSymbol = input
    let resolvedName = null
    let resolvedType = null

    // Fast path: try direct chart fetch for ticker-like inputs
    if (looksLikeSymbol(input)) {
      chartResult = await fetchChart(input)
    }

    // Slow path: search Yahoo to resolve, then fetch chart
    if (!chartResult) {
      const search = await searchYahoo(input)
      if (!search) return null
      resolvedSymbol = search.symbol
      resolvedName = search.name
      resolvedType = search.quoteType
      chartResult = await fetchChart(resolvedSymbol)
      if (!chartResult) return null
    }

    const meta = chartResult.meta
    if (!meta) return null

    const currentPrice = num(meta.regularMarketPrice)
    if (currentPrice === 0) return null // no valid price

    const quoteType = resolvedType || meta.instrumentType || meta.quoteType || ''
    const assetClass = CLASS_MAP[quoteType] || 'other'
    const name = resolvedName || meta.longName || meta.shortName || input

    // Build history from timestamps + closes
    const timestamps = Array.isArray(chartResult.timestamp) ? chartResult.timestamp : []
    const rawCloses = chartResult.indicators?.quote?.[0]?.close
    const closes = Array.isArray(rawCloses) ? rawCloses : []
    const history = []
    for (let i = 0; i < timestamps.length; i++) {
      const c = num(closes[i])
      if (c > 0) {
        const d = new Date(timestamps[i] * 1000)
        if (!isNaN(d.getTime())) {
          history.push({ date: d.toISOString().slice(0, 10), close: Math.round(c * 100) / 100 })
        }
      }
    }

    // Intraday change from the last two history points
    let previousClose = currentPrice
    if (history.length >= 2) {
      previousClose = history[history.length - 2].close
    } else {
      const pc = num(meta.previousClose)
      if (pc > 0) previousClose = pc
    }

    const dayChange = currentPrice - previousClose
    const dayChangePercent = previousClose > 0 ? (dayChange / previousClose) * 100 : 0

    return {
      ticker: input,
      resolvedSymbol,
      name,
      currentPrice: Math.round(currentPrice * 100) / 100,
      previousClose: Math.round(previousClose * 100) / 100,
      dayChange: Math.round(dayChange * 100) / 100,
      dayChangePercent: Math.round(num(dayChangePercent) * 100) / 100,
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
 * Returns Map<originalInput, priceData>. Never throws.
 */
export async function fetchMissingPrices(tickers) {
  if (!Array.isArray(tickers) || tickers.length === 0) return new Map()

  const results = await Promise.allSettled(tickers.map(fetchOneTicker))
  const priceMap = new Map()
  results.forEach((r, i) => {
    if (r.status === 'fulfilled' && r.value) priceMap.set(tickers[i], r.value)
  })
  return priceMap
}
