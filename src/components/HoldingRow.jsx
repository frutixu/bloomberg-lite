import { fmtCurrency } from '../lib/format'

export default function HoldingRow({ holding, isSelected, onClick }) {
  const { ticker, name, shares, avgCost, currentPrice, dayChange, dayChangePercent, currency, broker } = holding
  const mktValue = currentPrice * shares
  const totalPL = (currentPrice - avgCost) * shares
  const totalPLPct = avgCost !== 0 ? ((currentPrice - avgCost) / avgCost) * 100 : 0
  const fmt = (v) => fmtCurrency(v, currency)

  const dayClr = dayChange >= 0 ? 'text-bb-green' : 'text-bb-red'
  const plClr = totalPL >= 0 ? 'text-bb-green' : 'text-bb-red'
  const sign = (v) => v >= 0 ? '+' : ''

  return (
    <tr
      onClick={onClick}
      className={`cursor-pointer transition-colors border-b border-bb-border hover:bg-bb-surface/80 ${
        isSelected
          ? 'bg-bb-amber/5 border-l-2 border-l-bb-amber'
          : 'border-l-2 border-l-transparent'
      }`}
    >
      {/* Name + Ticker */}
      <td className="py-1.5 px-3 text-left">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="text-gray-100 text-xs font-medium truncate" title={name}>{name}</span>
          <span className="text-bb-muted-dim text-xxs flex-shrink-0">{ticker}</span>
        </div>
      </td>

      {/* Last Price */}
      <td className="py-1.5 px-2 text-right text-xs text-gray-200 tabular-nums">
        {fmt(currentPrice)}
      </td>

      {/* PRU (avg cost) */}
      <td className="py-1.5 px-2 text-right text-xs text-bb-muted tabular-nums hidden sm:table-cell">
        {fmt(avgCost)}
      </td>

      {/* Day Change % */}
      <td className={`py-1.5 px-2 text-right text-xs tabular-nums ${dayClr}`}>
        {sign(dayChangePercent)}{Math.abs(dayChangePercent).toFixed(2)}%
      </td>

      {/* Shares */}
      <td className="py-1.5 px-2 text-right text-xs text-bb-muted tabular-nums hidden md:table-cell">
        {shares}
      </td>

      {/* Market Value */}
      <td className="py-1.5 px-2 text-right text-xs text-gray-300 tabular-nums hidden sm:table-cell">
        {fmt(mktValue)}
      </td>

      {/* Total P&L */}
      <td className={`py-1.5 px-2 text-right text-xs font-medium tabular-nums ${plClr}`}>
        {sign(totalPL)}{fmt(Math.abs(totalPL))}
      </td>

      {/* Total P&L % */}
      <td className={`py-1.5 px-2 text-right text-xs tabular-nums ${plClr}`}>
        {sign(totalPLPct)}{Math.abs(totalPLPct).toFixed(1)}%
      </td>

      {/* Broker */}
      <td className="py-1.5 px-2 text-right text-xxs text-bb-muted-dim hidden lg:table-cell">
        {broker}
      </td>
    </tr>
  )
}
