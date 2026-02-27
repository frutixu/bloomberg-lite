import { useState } from 'react'
import { ASSET_CLASSES } from './AssetSection'

const CLASS_OPTIONS = Object.entries(ASSET_CLASSES).map(([value, { label }]) => ({ value, label }))

export default function ManagePortfolio({ holdings, onSave }) {
  const [rows, setRows] = useState(
    holdings.map(h => ({ ...h, key: h.ticker }))
  )
  const [newTicker, setNewTicker] = useState('')
  const [newShares, setNewShares] = useState('')
  const [newCost, setNewCost] = useState('')
  const [newClass, setNewClass] = useState('stock')
  const [saved, setSaved] = useState(false)

  const updateRow = (index, field, value) => {
    const updated = [...rows]
    if (field === 'shares' || field === 'avgCost') {
      updated[index][field] = value === '' ? '' : Number(value)
    } else if (field === 'ticker') {
      updated[index][field] = value.toUpperCase()
    } else {
      updated[index][field] = value
    }
    setRows(updated)
    setSaved(false)
  }

  const removeRow = (index) => {
    setRows(rows.filter((_, i) => i !== index))
    setSaved(false)
  }

  const addRow = () => {
    const ticker = newTicker.trim().toUpperCase()
    if (!ticker) return
    if (rows.some(r => r.ticker === ticker)) return

    setRows([...rows, {
      key: ticker,
      ticker,
      shares: Number(newShares) || 0,
      avgCost: Number(newCost) || 0,
      class: newClass,
    }])
    setNewTicker('')
    setNewShares('')
    setNewCost('')
    setNewClass('stock')
    setSaved(false)
  }

  const handleSave = () => {
    const clean = rows
      .filter(r => r.ticker)
      .map(({ ticker, shares, avgCost, class: cls }) => ({
        ticker,
        shares: Number(shares) || 0,
        avgCost: Number(avgCost) || 0,
        class: cls || 'stock',
      }))
    onSave(clean)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleExport = () => {
    const config = {
      holdings: rows
        .filter(r => r.ticker)
        .map(({ ticker, shares, avgCost, class: cls }) => ({
          ticker,
          shares: Number(shares) || 0,
          avgCost: Number(avgCost) || 0,
          class: cls || 'stock',
        })),
    }
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'portfolio.config.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') addRow()
  }

  const inputBase = 'bg-gray-800 text-gray-100 border border-gray-700 rounded px-2 py-1 text-sm focus:border-orange-500 focus:outline-none'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Manage Holdings</h2>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="px-4 py-2 text-sm bg-gray-800 text-gray-300 rounded hover:bg-gray-700 transition-colors border border-gray-700"
          >
            Export JSON
          </button>
          <button
            onClick={handleSave}
            className={`px-4 py-2 text-sm rounded font-medium transition-all ${
              saved
                ? 'bg-emerald-600 text-white'
                : 'bg-orange-600 text-white hover:bg-orange-500'
            }`}
          >
            {saved ? 'Saved!' : 'Save'}
          </button>
        </div>
      </div>

      {/* Holdings table */}
      <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left text-xs text-gray-500 uppercase tracking-wider px-4 py-3">Ticker</th>
              <th className="text-left text-xs text-gray-500 uppercase tracking-wider px-4 py-3">Class</th>
              <th className="text-left text-xs text-gray-500 uppercase tracking-wider px-4 py-3">Shares</th>
              <th className="text-left text-xs text-gray-500 uppercase tracking-wider px-4 py-3">PRU</th>
              <th className="text-right text-xs text-gray-500 uppercase tracking-wider px-4 py-3">Total</th>
              <th className="w-12"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.key} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="px-4 py-2.5">
                  <input
                    type="text"
                    value={row.ticker}
                    onChange={e => updateRow(i, 'ticker', e.target.value)}
                    className={`${inputBase} w-20 font-bold`}
                  />
                </td>
                <td className="px-4 py-2.5">
                  <select
                    value={row.class || 'stock'}
                    onChange={e => updateRow(i, 'class', e.target.value)}
                    className={`${inputBase} w-28`}
                  >
                    {CLASS_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2.5">
                  <input
                    type="number"
                    value={row.shares}
                    onChange={e => updateRow(i, 'shares', e.target.value)}
                    min="0"
                    step="any"
                    className={`${inputBase} w-20`}
                  />
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500 text-sm">$</span>
                    <input
                      type="number"
                      value={row.avgCost}
                      onChange={e => updateRow(i, 'avgCost', e.target.value)}
                      min="0"
                      step="0.01"
                      className={`${inputBase} w-24`}
                    />
                  </div>
                </td>
                <td className="px-4 py-2.5 text-right text-sm text-gray-400">
                  ${((Number(row.shares) || 0) * (Number(row.avgCost) || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="px-2 py-2.5 text-center">
                  <button
                    onClick={() => removeRow(i)}
                    className="text-gray-600 hover:text-red-400 transition-colors text-sm px-1"
                    title="Remove"
                  >
                    x
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Add new row */}
        <div className="border-t border-gray-700 bg-gray-800/30 px-4 py-3 flex items-center gap-2 flex-wrap">
          <input
            type="text"
            value={newTicker}
            onChange={e => setNewTicker(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="TICKER"
            className={`${inputBase} w-20 placeholder-gray-600 font-bold border-gray-600`}
          />
          <select
            value={newClass}
            onChange={e => setNewClass(e.target.value)}
            className={`${inputBase} w-28 border-gray-600`}
          >
            {CLASS_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <input
            type="number"
            value={newShares}
            onChange={e => setNewShares(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Shares"
            min="0"
            className={`${inputBase} w-20 placeholder-gray-600 border-gray-600`}
          />
          <div className="flex items-center gap-1">
            <span className="text-gray-600 text-sm">$</span>
            <input
              type="number"
              value={newCost}
              onChange={e => setNewCost(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="PRU"
              min="0"
              step="0.01"
              className={`${inputBase} w-24 placeholder-gray-600 border-gray-600`}
            />
          </div>
          <button
            onClick={addRow}
            className="px-3 py-1 text-sm bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
          >
            + Add
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">Total invested</span>
          <span className="text-lg font-bold">
            ${rows.reduce((s, r) => s + (Number(r.shares) || 0) * (Number(r.avgCost) || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-sm text-gray-500">Holdings</span>
          <span className="text-lg font-bold">{rows.length}</span>
        </div>
      </div>

      <p className="text-xs text-gray-600">
        After saving, export the JSON and commit it as <code className="text-gray-500">portfolio.config.json</code> to update the GitHub Actions data pipeline.
      </p>
    </div>
  )
}
