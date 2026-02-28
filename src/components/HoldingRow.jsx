import { fmtCurrency } from '../lib/format'

const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0 }
const sign = (v) => (v >= 0 ? '+' : '')

export default function HoldingRow({ holding, isSelected, onClick }) {
  const ticker = holding?.ticker || '—'
  const name = holding?.name || ticker
  const shares = num(holding?.shares)
  const avgCost = num(holding?.avgCost)
  const currentPrice = num(holding?.currentPrice)
  const dayChange = num(holding?.dayChange)
  const dayChangePercent = num(holding?.dayChangePercent)
  const currency = holding?.currency || 'USD'
  const broker = holding?.broker || ''

  const mktValue = currentPrice * shares
  const totalPL = (currentPrice - avgCost) * shares
  const totalPLPct = avgCost > 0 ? ((currentPrice - avgCost) / avgCost) * 100 : 0
  const fmt = (v) => fmtCurrency(v, currency)

  const dayClr = dayChange >= 0 ? 'text-bb-green' : 'text-bb-red'
  const plClr = totalPL >= 0 ? 'text-bb-green' : 'text-bb-red'

  return (
    <tr
      onClick={onClick}
      className={`cursor-pointer transition-colors border-b border-bb-border hover:bg-bb-surface/80 ${
        isSelected
          ? 'bg-bb-amber/5 border-l-2 border-l-bb-amber'
          : 'border-l-2 border-l-transparent'
      }`}
    >
      <td className="py-1.5 px-3 text-left">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="text-gray-100 text-xs font-medium truncate" title={name}>{name}</span>
          <span className="text-bb-muted-dim text-xxs flex-shrink-0">{ticker}</span>
        </div>
      </td>
      <td className="py-1.5 px-2 text-right text-xxs text-bb-muted hidden md:table-cell">{currency}</td>
      <td className="py-1.5 px-2 text-right text-xs text-gray-200 tabular-nums">{fmt(currentPrice)}</td>
      <td className="py-1.5 px-2 text-right text-xs text-bb-muted tabular-nums hidden sm:table-cell">{fmt(avgCost)}</td>
      <td className={`py-1.5 px-2 text-right text-xs tabular-nums ${dayClr}`}>
        {sign(dayChangePercent)}{Math.abs(dayChangePercent).toFixed(2)}%
      </td>
      <td className="py-1.5 px-2 text-right text-xs text-bb-muted tabular-nums hidden md:table-cell">{shares}</td>
      <td className="py-1.5 px-2 text-right text-xs text-gray-300 tabular-nums hidden sm:table-cell">{fmt(mktValue)}</td>
      <td className={`py-1.5 px-2 text-right text-xs font-medium tabular-nums ${plClr}`}>
        {sign(totalPL)}{fmt(Math.abs(totalPL))}
      </td>
      <td className={`py-1.5 px-2 text-right text-xs tabular-nums ${plClr}`}>
        {sign(totalPLPct)}{Math.abs(totalPLPct).toFixed(1)}%
      </td>
      <td className="py-1.5 px-2 text-right text-xxs text-bb-muted-dim hidden lg:table-cell">{broker}</td>
    </tr>
  )
}
