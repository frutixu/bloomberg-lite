import { fmtCurrency } from '../lib/format'

export default function PortfolioSummary({ holdings }) {
  const byCurrency = {}
  for (const h of holdings) {
    const c = h.currency || 'USD'
    if (!byCurrency[c]) byCurrency[c] = { value: 0, cost: 0, dayPL: 0 }
    byCurrency[c].value += h.currentPrice * h.shares
    byCurrency[c].cost += h.avgCost * h.shares
    byCurrency[c].dayPL += h.dayChange * h.shares
  }

  const sign = (v) => v >= 0 ? '+' : ''

  return (
    <div className="bg-bb-surface border border-bb-border-hi rounded">
      {Object.entries(byCurrency).map(([currency, { value, cost, dayPL }]) => {
        const totalPL = value - cost
        const totalPLPct = cost !== 0 ? (totalPL / cost) * 100 : 0
        const prevValue = value - dayPL
        const dayPLPct = prevValue !== 0 ? (dayPL / prevValue) * 100 : 0
        const fmt = (v) => fmtCurrency(v, currency)

        return (
          <div
            key={currency}
            className="flex flex-wrap items-center gap-x-6 gap-y-1 px-4 py-2.5 border-b border-bb-border last:border-b-0"
          >
            {/* Currency badge */}
            <span className="text-xxs font-bold text-bb-amber bg-bb-amber/10 px-2 py-0.5 rounded">
              {currency}
            </span>

            {/* Portfolio Value */}
            <div className="flex items-baseline gap-2">
              <span className="text-xxs text-bb-muted uppercase">Value</span>
              <span className="text-sm font-bold text-gray-100 tabular-nums">{fmt(value)}</span>
            </div>

            {/* Day P&L */}
            <div className="flex items-baseline gap-2">
              <span className="text-xxs text-bb-muted uppercase">Day</span>
              <span className={`text-sm font-semibold tabular-nums ${dayPL >= 0 ? 'text-bb-green' : 'text-bb-red'}`}>
                {sign(dayPL)}{fmt(Math.abs(dayPL))}
              </span>
              <span className={`text-xxs tabular-nums ${dayPL >= 0 ? 'text-bb-green' : 'text-bb-red'}`}>
                {sign(dayPLPct)}{Math.abs(dayPLPct).toFixed(2)}%
              </span>
            </div>

            {/* Total P&L */}
            <div className="flex items-baseline gap-2">
              <span className="text-xxs text-bb-muted uppercase">Total</span>
              <span className={`text-sm font-semibold tabular-nums ${totalPL >= 0 ? 'text-bb-green' : 'text-bb-red'}`}>
                {sign(totalPL)}{fmt(Math.abs(totalPL))}
              </span>
              <span className={`text-xxs tabular-nums ${totalPL >= 0 ? 'text-bb-green' : 'text-bb-red'}`}>
                {sign(totalPLPct)}{Math.abs(totalPLPct).toFixed(2)}%
              </span>
            </div>

            {/* Cost Basis */}
            <div className="flex items-baseline gap-2 sm:ml-auto">
              <span className="text-xxs text-bb-muted uppercase">Cost</span>
              <span className="text-xs text-bb-muted tabular-nums">{fmt(cost)}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
