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

export default function AssetSection({ assetClass, holdings, selectedTicker, onSelect, fxRates = {} }) {
  const config = ASSET_CLASSES[assetClass] || ASSET_CLASSES.other
  if (!Array.isArray(holdings) || holdings.length === 0) return null

  // Per-currency totals
  const byCurrency = {}
  for (const h of holdings) {
    const c = h.currency || 'USD'
    if (!byCurrency[c]) byCurrency[c] = { value: 0, cost: 0 }
    byCurrency[c].value += num(h.currentPrice) * num(h.shares)
    byCurrency[c].cost += num(h.avgCost) * num(h.shares)
  }

  // EUR equivalent totals (convert each currency via fxRates)
  const currencies = Object.keys(byCurrency)
  const hasMultiCurrencies = currencies.length > 1 || (currencies.length === 1 && currencies[0] !== 'EUR')
  const hasFxRates = Object.keys(fxRates).length > 1 // more than just { EUR: 1 }

  let eurValue = 0
  let eurCost = 0
  if (hasMultiCurrencies && hasFxRates) {
    for (const [ccy, { value, cost }] of Object.entries(byCurrency)) {
      const rate = num(fxRates[ccy]) || (ccy === 'EUR' ? 1 : 0)
      eurValue += value * rate
      eurCost += cost * rate
    }
  }
  const eurPL = eurValue - eurCost
  const eurPLPct = eurCost > 0 ? (eurPL / eurCost) * 100 : 0
  const showEurTotal = hasMultiCurrencies && hasFxRates && eurValue > 0

  const thCls = 'text-right text-xxs font-normal text-bb-amber-dim uppercase tracking-wider py-1 px-2'

  return (
    <div className="overflow-x-auto">
      {/* Section header with totals */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-3 py-1.5 bg-bb-surface border-b border-bb-border-hi">
        <span className="text-xxs font-bold uppercase tracking-widest text-bb-amber">
          {config.label}
        </span>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xxs">
          {Object.entries(byCurrency).map(([currency, { value, cost }]) => {
            const pl = value - cost
            const pct = cost > 0 ? (pl / cost) * 100 : 0
            const rate = num(fxRates[currency]) || (currency === 'EUR' ? 1 : 0)
            const showRate = currency !== 'EUR' && rate > 0
            return (
              <span key={currency} className="flex items-center gap-2">
                <span className="text-bb-muted">{fmtCurrency(value, currency)}</span>
                <span className={pl >= 0 ? 'text-bb-green' : 'text-bb-red'}>
                  {pl >= 0 ? '+' : ''}{fmtCurrency(pl, currency)} ({pct >= 0 ? '+' : ''}{pct.toFixed(1)}%)
                </span>
                {showRate && (
                  <span className="text-bb-muted-dim">@{rate.toFixed(4)}</span>
                )}
              </span>
            )
          })}
          {showEurTotal && (
            <span className="flex items-center gap-2 border-l border-bb-border pl-4">
              <span className="text-bb-amber font-medium">≈ {fmtCurrency(eurValue, 'EUR')}</span>
              <span className={eurPL >= 0 ? 'text-bb-green' : 'text-bb-red'}>
                {eurPL >= 0 ? '+' : ''}{fmtCurrency(eurPL, 'EUR')} ({eurPLPct >= 0 ? '+' : ''}{eurPLPct.toFixed(1)}%)
              </span>
            </span>
          )}
        </div>
      </div>

      {/* Table — fixed layout so Name column truncates long text */}
      <table className="w-full bb-table table-fixed">
        <colgroup>
          <col /> {/* Name — takes remaining space */}
          <col className="hidden md:table-column" style={{ width: 40 }} />
          <col className="hidden sm:table-column" style={{ width: 90 }} />
          <col className="hidden md:table-column" style={{ width: 90 }} />
          <col style={{ width: 65 }} />
          <col className="hidden md:table-column" style={{ width: 60 }} />
          <col className="hidden sm:table-column" style={{ width: 90 }} />
          <col className="hidden sm:table-column" style={{ width: 100 }} />
          <col style={{ width: 60 }} />
          <col className="hidden lg:table-column" style={{ width: 50 }} />
        </colgroup>
        <thead>
          <tr className="border-b border-bb-border">
            <th className="text-left text-xxs font-normal text-bb-amber-dim uppercase tracking-wider py-1 px-3">Name</th>
            <th className={`${thCls} hidden md:table-cell`}>Ccy</th>
            <th className={`${thCls} hidden sm:table-cell`}>Last</th>
            <th className={`${thCls} hidden md:table-cell`}>PRU</th>
            <th className={thCls}>Chg%</th>
            <th className={`${thCls} hidden md:table-cell`}>Qty</th>
            <th className={`${thCls} hidden sm:table-cell`}>Mkt Val</th>
            <th className={`${thCls} hidden sm:table-cell`}>P&L</th>
            <th className={thCls}>P&L%</th>
            <th className={`${thCls} hidden lg:table-cell`}>Brkr</th>
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
