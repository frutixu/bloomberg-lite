/**
 * Generate realistic sample data for local development.
 * Run: node scripts/generate_sample.js
 */
import { writeFileSync, mkdirSync } from 'fs'

const assets = [
  // Stocks (auto-detected as "stock")
  { ticker: 'AAPL', name: 'Apple Inc.', class: 'stock', currency: 'USD', broker: 'Saxo', shares: 10, avgCost: 150, start: 182, end: 235, vol: 3 },
  { ticker: 'MSFT', name: 'Microsoft Corp.', class: 'stock', currency: 'USD', broker: 'Saxo', shares: 5, avgCost: 280, start: 370, end: 415, vol: 4 },
  { ticker: 'GOOGL', name: 'Alphabet Inc.', class: 'stock', currency: 'USD', broker: 'Bourso', shares: 8, avgCost: 120, start: 142, end: 178, vol: 3 },
  { ticker: 'AMZN', name: 'Amazon.com Inc.', class: 'stock', currency: 'USD', broker: 'Bourso', shares: 3, avgCost: 140, start: 178, end: 208, vol: 3.5 },
  { ticker: 'NVDA', name: 'NVIDIA Corp.', class: 'stock', currency: 'USD', broker: 'Lux', shares: 15, avgCost: 45, start: 78, end: 138, vol: 6 },
  { ticker: 'TSLA', name: 'Tesla Inc.', class: 'stock', currency: 'USD', broker: 'Saxo', shares: 6, avgCost: 200, start: 245, end: 330, vol: 8 },
  // ETFs
  { ticker: 'SPY', name: 'SPDR S&P 500 ETF', class: 'etf', currency: 'USD', broker: 'Saxo', shares: 5, avgCost: 430, start: 455, end: 520, vol: 3 },
  { ticker: 'QQQ', name: 'Invesco QQQ Trust', class: 'etf', currency: 'USD', broker: 'Bourso', shares: 4, avgCost: 360, start: 390, end: 460, vol: 4 },
  // EUR fund example
  { ticker: 'LYX.PA', name: 'Lyxor MSCI World ETF', class: 'etf', currency: 'EUR', broker: 'Bourso', shares: 20, avgCost: 25, start: 26, end: 29.5, vol: 0.5 },
  // Crypto
  { ticker: 'BTC-USD', name: 'Bitcoin', class: 'crypto', currency: 'USD', broker: 'Lux', shares: 0.5, avgCost: 42000, start: 52000, end: 85000, vol: 3000 },
  { ticker: 'ETH-USD', name: 'Ethereum', class: 'crypto', currency: 'USD', broker: 'Lux', shares: 5, avgCost: 2200, start: 2800, end: 3200, vol: 200 },
  // Bonds
  { ticker: 'TLT', name: 'iShares 20+ Year Treasury', class: 'bond', currency: 'USD', broker: 'Saxo', shares: 20, avgCost: 98, start: 92, end: 95, vol: 1.5 },
]

function genHistory(start, end, volatility, days) {
  const history = []
  const date = new Date('2025-03-03')
  let price = start
  const drift = (end - start) / days

  for (let i = 0; i < days; i++) {
    const dayOfWeek = date.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const noise = (Math.random() - 0.48) * volatility
      price = Math.max(price + drift + noise, price * 0.9)
      history.push({
        date: date.toISOString().split('T')[0],
        close: Math.round(price * 100) / 100,
      })
    }
    date.setDate(date.getDate() + 1)
  }

  if (history.length > 0) {
    history[history.length - 1].close = end
  }
  return history
}

const holdings = assets.map(s => {
  const history = genHistory(s.start, s.end, s.vol, 365)
  const prev = history.length > 1 ? history[history.length - 2].close : s.end
  const dayChange = Math.round((s.end - prev) * 100) / 100
  const dayChangePercent = Math.round((dayChange / prev) * 10000) / 100

  return {
    ticker: s.ticker,
    name: s.name,
    class: s.class,
    currency: s.currency,
    broker: s.broker || '',
    shares: s.shares,
    avgCost: s.avgCost,
    currentPrice: s.end,
    previousClose: prev,
    dayChange,
    dayChangePercent,
    history,
  }
})

const output = {
  lastUpdated: new Date().toISOString(),
  holdings,
}

mkdirSync('public/data', { recursive: true })
writeFileSync('public/data/portfolio.json', JSON.stringify(output, null, 2))
console.log(`Generated sample data: ${holdings.length} holdings`)
holdings.forEach(h => console.log(`  [${h.class}] ${h.ticker} (${h.currency}): ${h.currentPrice}`))
