import { fmtCurrency } from '../../lib/format'

const MIN_PCT = 1 // segments below this % get merged into "Other"

export default function DonutChart({ data = [], size = 160, thickness = 24, currency = 'EUR' }) {
  if (!data.length) return null

  const total = data.reduce((s, d) => s + d.value, 0)
  if (total <= 0) return null

  // Merge tiny segments into "Other"
  const significant = []
  let otherValue = 0
  for (const d of data) {
    const pct = (d.value / total) * 100
    if (pct < MIN_PCT) { otherValue += d.value }
    else { significant.push(d) }
  }
  if (otherValue > 0) {
    significant.push({ label: 'Other', value: otherValue, color: '#5a6a80' })
  }

  const cx = size / 2
  const cy = size / 2
  const r = (size - thickness) / 2
  const circumference = 2 * Math.PI * r
  let offset = 0

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {significant.map((seg, i) => {
          const pct = seg.value / total
          const arcLen = pct * circumference
          const gap = significant.length > 1 ? 2 : 0
          const dash = Math.max(0, arcLen - gap)
          const el = (
            <circle
              key={i}
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={thickness}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
              transform={`rotate(-90 ${cx} ${cy})`}
              className="transition-all duration-300"
            />
          )
          offset += arcLen
          return el
        })}
        {/* Center text */}
        <text x={cx} y={cy - 6} textAnchor="middle" className="fill-gray-100 text-sm font-semibold">
          {fmtCurrency(total, currency)}
        </text>
        <text x={cx} y={cy + 10} textAnchor="middle" className="fill-bb-muted text-xxs">
          {significant.length} segments
        </text>
      </svg>

      {/* Legend */}
      <div className="w-full grid grid-cols-1 gap-1">
        {significant.map((seg, i) => {
          const pct = (seg.value / total) * 100
          return (
            <div key={i} className="flex items-center justify-between text-xxs gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: seg.color }} />
                <span className="text-gray-300 truncate">{seg.label}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 tabular-nums">
                <span className="text-bb-muted">{pct.toFixed(1)}%</span>
                <span className="text-gray-400">{fmtCurrency(seg.value, currency)}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
