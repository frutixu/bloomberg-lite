import { fmtCurrency } from '../../lib/format'

export default function BarChart({ data = [], currency = 'EUR', maxBars = 10, colorField = 'color', defaultColor = '#ff9800' }) {
  if (!data.length) return null

  const items = data.slice(0, maxBars)
  const maxVal = Math.max(...items.map(d => Math.abs(d.value)), 1)

  return (
    <div className="space-y-1.5">
      {items.map((item, i) => {
        const barPct = Math.min(100, (Math.abs(item.value) / maxVal) * 100)
        const color = item[colorField] || defaultColor
        return (
          <div key={i} className="flex items-center gap-2 text-xxs">
            <span className="text-gray-300 truncate w-24 sm:w-32 flex-shrink-0" title={item.label}>
              {item.label}
            </span>
            <div className="flex-1 h-4 bg-bb-bg rounded-sm overflow-hidden">
              <div
                className="h-full rounded-sm transition-all duration-500"
                style={{ width: `${barPct}%`, backgroundColor: color }}
              />
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 tabular-nums text-right">
              {item.pct != null && (
                <span className="text-bb-muted w-10">{item.pct >= 0 ? '+' : ''}{item.pct.toFixed(1)}%</span>
              )}
              <span className="text-gray-400 w-20">{fmtCurrency(item.value, currency)}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
