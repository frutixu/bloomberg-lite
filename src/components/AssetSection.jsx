import HoldingRow from './HoldingRow'
import { fmtCurrency } from '../lib/format'

const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0 }

const ASSET_CLASSES = {
  stock:     { label: 'EQUITIES' },
  etf:       { label: 'ETFs' },
  fund:      { label: 'FUNDS' },
  bond:      { label: 'FIXED INCOME' },
  crypto:    { label: 'CRYPTO' },
  commodity: { label: 'COMMODITIES' },
  other:     { label: 'OTHER' },
}

export { ASSET_CLASSES }

export default function AssetSection({ assetClass, holdings, selectedTicker, onSelect }) {
  const config = ASSET_CLASSES[assetClass] || ASSET_CLASSES.other
  if (!Array.isArray(holdings) || holdings.length === 0) return null

  const byCurrency = {}
  for (const h of holdings) {
    const c = h.currency || 'USD'
    if (!byCurrency[c]) byCurrency[c] = { value: 0, cost: 0 }
    byCurrency[c].value += num(h.currentPrice) * num(h.shares)
    byCurrency[c].cost += num(h.avgCost) * num(h.shares)
  }

  const thCls = 'text-right text-xxs font-normal text-bb-amber-dim uppercase tracking-wider py-1 px-2'

  return (
    <div className="overflow-x-auto">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-3 py-1.5 bg-bb-surface border-b border-bb-border-hi">
        <span className="text-xxs font-bold uppercase tracking-widest text-bb-amber">
          {config.label}
        </span>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xxs">
          {Object.entries(byCurrency).map(([currency, { value, cost }]) => {
            const pl = value - cost
            const pct = cost > 0 ? (pl / cost) * 100 : 0
            return (
              <span key={currency} className="flex items-center gap-2">
                <span className="text-bb-muted">{fmtCurrency(value, currency)}</span>
                <span className={pl >= 0 ? 'text-bb-green' : 'text-bb-red'}>
                  {pl >= 0 ? '+' : ''}{fmtCurrency(pl, currency)} ({pct >= 0 ? '+' : ''}{pct.toFixed(1)}%)
                </span>
              </span>
            )
          })}
        </div>
      </div>

      <table className="w-full bb-table">
        <thead>
          <tr className="border-b border-bb-border">
            <th className="text-left text-xxs font-normal text-bb-amber-dim uppercase tracking-wider py-1 px-3">Name</th>
            <th className={`${thCls} hidden md:table-cell`} style={{ width: 40 }}>Ccy</th>
            <th className={thCls} style={{ width: 90 }}>Last</th>
            <th className={`${thCls} hidden sm:table-cell`} style={{ width: 90 }}>PRU</th>
            <th className={thCls} style={{ width: 70 }}>Chg%</th>
            <th className={`${thCls} hidden md:table-cell`} style={{ width: 60 }}>Qty</th>
            <th className={`${thCls} hidden sm:table-cell`} style={{ width: 100 }}>Mkt Val</th>
            <th className={thCls} style={{ width: 100 }}>P&L</th>
            <th className={thCls} style={{ width: 70 }}>P&L%</th>
            <th className={`${thCls} hidden lg:table-cell`} style={{ width: 50 }}>Brkr</th>
          </tr>
        </thead>
        <tbody>
          {holdings.map(holding => (
            <HoldingRow
              key={holding.ticker}
              holding={holding}
              isSelected={holding.ticker === selectedTicker}
              onClick={() => onSelect(holding.ticker)}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
