import StockCard from './StockCard'

const ASSET_CLASSES = {
  stock: { label: 'Stocks', color: 'text-blue-400', border: 'border-blue-500/20' },
  etf: { label: 'ETFs', color: 'text-purple-400', border: 'border-purple-500/20' },
  bond: { label: 'Bonds', color: 'text-teal-400', border: 'border-teal-500/20' },
  crypto: { label: 'Crypto', color: 'text-amber-400', border: 'border-amber-500/20' },
  commodity: { label: 'Commodities', color: 'text-yellow-400', border: 'border-yellow-500/20' },
  other: { label: 'Other', color: 'text-gray-400', border: 'border-gray-500/20' },
}

export { ASSET_CLASSES }

export default function AssetSection({ assetClass, holdings, selectedTicker, onSelect }) {
  const config = ASSET_CLASSES[assetClass] || ASSET_CLASSES.other
  if (holdings.length === 0) return null

  const sectionValue = holdings.reduce((s, h) => s + h.currentPrice * h.shares, 0)
  const sectionCost = holdings.reduce((s, h) => s + h.avgCost * h.shares, 0)
  const sectionPL = sectionValue - sectionCost
  const sectionPLPct = sectionCost !== 0 ? (sectionPL / sectionCost) * 100 : 0

  const fmt = (v) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v)

  return (
    <div>
      <div className={`flex items-center justify-between mb-3 pb-2 border-b ${config.border}`}>
        <h3 className={`text-sm font-semibold uppercase tracking-wider ${config.color}`}>
          {config.label}
        </h3>
        <div className="flex items-center gap-4 text-xs">
          <span className="text-gray-500">{fmt(sectionValue)}</span>
          <span className={sectionPL >= 0 ? 'text-emerald-400' : 'text-red-400'}>
            {sectionPL >= 0 ? '+' : ''}{fmt(sectionPL)} ({sectionPLPct >= 0 ? '+' : ''}{sectionPLPct.toFixed(1)}%)
          </span>
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
