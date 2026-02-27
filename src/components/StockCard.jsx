import { fmtCurrency } from '../lib/format'

export default function StockCard({ holding, isSelected, onClick }) {
  const { ticker, shares, avgCost, currentPrice, dayChangePercent, currency } = holding
  const totalPL = (currentPrice - avgCost) * shares
  const totalPLPercent = ((currentPrice - avgCost) / avgCost) * 100
  const fmt = (v) => fmtCurrency(v, currency)

  return (
    <div
      onClick={onClick}
      className={`bg-gray-900 rounded-lg p-3 border cursor-pointer transition-all hover:bg-gray-850 hover:border-gray-700 ${
        isSelected ? 'border-orange-500 ring-1 ring-orange-500/30' : 'border-gray-800'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-bold text-sm">{ticker}</span>
        <span
          className={`text-xs px-1.5 py-0.5 rounded font-medium ${
            dayChangePercent >= 0
              ? 'bg-emerald-500/10 text-emerald-400'
              : 'bg-red-500/10 text-red-400'
          }`}
        >
          {dayChangePercent >= 0 ? '+' : ''}
          {dayChangePercent.toFixed(2)}%
        </span>
      </div>
      <div className="text-lg font-semibold mb-1">{fmt(currentPrice)}</div>
      <div className="text-xs text-gray-500 mb-2">{shares} shares</div>
      <div
        className={`text-xs font-medium ${totalPL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
      >
        P&L: {totalPL >= 0 ? '+' : ''}
        {fmt(totalPL)} ({totalPLPercent >= 0 ? '+' : ''}
        {totalPLPercent.toFixed(1)}%)
      </div>
    </div>
  )
}
