export default function PortfolioSummary({ holdings }) {
  const totalValue = holdings.reduce((sum, h) => sum + h.currentPrice * h.shares, 0)
  const totalCost = holdings.reduce((sum, h) => sum + h.avgCost * h.shares, 0)
  const totalPL = totalValue - totalCost
  const totalPLPercent = totalCost !== 0 ? (totalPL / totalCost) * 100 : 0

  const dayPL = holdings.reduce((sum, h) => sum + h.dayChange * h.shares, 0)
  const prevTotalValue = totalValue - dayPL
  const dayPLPercent = prevTotalValue !== 0 ? (dayPL / prevTotalValue) * 100 : 0

  const fmt = (val) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)

  const fmtPL = (val, pct) => {
    const sign = val >= 0 ? '+' : ''
    return `${sign}${fmt(val)} (${sign}${pct.toFixed(2)}%)`
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
        <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Portfolio Value</div>
        <div className="text-2xl font-bold">{fmt(totalValue)}</div>
      </div>
      <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
        <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Day P&L</div>
        <div className={`text-2xl font-bold ${dayPL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {fmtPL(dayPL, dayPLPercent)}
        </div>
      </div>
      <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
        <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total P&L</div>
        <div className={`text-2xl font-bold ${totalPL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {fmtPL(totalPL, totalPLPercent)}
        </div>
      </div>
    </div>
  )
}
