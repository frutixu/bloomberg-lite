import StockCard from './StockCard'
import { fmtCurrency } from '../lib/format'

const ASSET_CLASSES = {
  stock: { label: 'Stocks', color: 'text-blue-400', border: 'border-blue-500/20' },
  etf: { label: 'ETFs', color: 'text-purple-400', border: 'border-purple-500/20' },
  fund: { label: 'Funds', color: 'text-indigo-400', border: 'border-indigo-500/20' },
  bond: { label: 'Bonds', color: 'text-teal-400', border: 'border-teal-500/20' },
  crypto: { label: 'Crypto', color: 'text-amber-400', border: 'border-amber-500/20' },
  commodity: { label: 'Commodities', color: 'text-yellow-400', border: 'border-yellow-500/20' },
  other: { label: 'Other', color: 'text-gray-400', border: 'border-gray-500/20' },
}

export { ASSET_CLASSES }

export default function AssetSection({ assetClass, holdings, selectedTicker, onSelect }) {
  const config = ASSET_CLASSES[assetClass] || ASSET_CLASSES.other
  if (holdings.length === 0) return null

  // Group section totals by currency
  const byCurrency = {}
  for (const h of holdings) {
    const c = h.currency || 'USD'
    if (!byCurrency[c]) byCurrency[c] = { value: 0, cost: 0 }
    byCurrency[c].value += h.currentPrice * h.shares
    byCurrency[c].cost += h.avgCost * h.shares
  }

  return (
    <div>
      <div className={`flex items-center justify-between mb-3 pb-2 border-b ${config.border}`}>
        <h3 className={`text-sm font-semibold uppercase tracking-wider ${config.color}`}>
          {config.label}
        </h3>
        <div className="flex items-center gap-4 text-xs">
          {Object.entries(byCurrency).map(([currency, { value, cost }]) => {
            const pl = value - cost
            const pct = cost !== 0 ? (pl / cost) * 100 : 0
            return (
              <span key={currency} className="flex items-center gap-2">
                <span className="text-gray-500">{fmtCurrency(value, currency)}</span>
                <span className={pl >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                  {pl >= 0 ? '+' : ''}{fmtCurrency(pl, currency)} ({pct >= 0 ? '+' : ''}{pct.toFixed(1)}%)
                </span>
              </span>
            )
          })}
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {holdings.map(holding => (
          <StockCard
            key={holding.ticker}
            holding={holding}
            isSelected={holding.ticker === selectedTicker}
            onClick={() => onSelect(holding.ticker)}
          />
        ))}
      </div>
    </div>
  )
}
