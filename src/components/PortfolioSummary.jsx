import { fmtCurrency } from '../lib/format'

export default function PortfolioSummary({ holdings }) {
  // Group by currency
  const byCurrency = {}
  for (const h of holdings) {
    const c = h.currency || 'USD'
    if (!byCurrency[c]) byCurrency[c] = { value: 0, cost: 0, dayPL: 0 }
    byCurrency[c].value += h.currentPrice * h.shares
    byCurrency[c].cost += h.avgCost * h.shares
    byCurrency[c].dayPL += h.dayChange * h.shares
  }

  const currencies = Object.keys(byCurrency)

  return (
    <div className="space-y-3">
      {currencies.map(currency => {
        const { value, cost, dayPL } = byCurrency[currency]
        const totalPL = value - cost
        const totalPLPct = cost !== 0 ? (totalPL / cost) * 100 : 0
        const prevValue = value - dayPL
        const dayPLPct = prevValue !== 0 ? (dayPL / prevValue) * 100 : 0
        const fmt = (v) => fmtCurrency(v, currency)

        const fmtPL = (val, pct) => {
          const sign = val >= 0 ? '+' : ''
          return `${sign}${fmt(val)} (${sign}${pct.toFixed(2)}%)`
        }

        return (
          <div key={currency} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                Portfolio Value ({currency})
              </div>
              <div className="text-2xl font-bold">{fmt(value)}</div>
            </div>
            <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Day P&L</div>
              <div className={`text-2xl font-bold ${dayPL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {fmtPL(dayPL, dayPLPct)}
              </div>
            </div>
            <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total P&L</div>
              <div className={`text-2xl font-bold ${totalPL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {fmtPL(totalPL, totalPLPct)}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
