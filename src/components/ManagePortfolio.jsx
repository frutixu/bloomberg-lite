import { useState, useRef } from 'react'

const CURRENCIES = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
  { value: 'CHF', label: 'CHF' },
]

export default function ManagePortfolio({ holdings, onSave }) {
  const [rows, setRows] = useState(
    holdings.map(h => ({ ...h, key: h.ticker }))
  )
  const [newTicker, setNewTicker] = useState('')
  const [newShares, setNewShares] = useState('')
  const [newCost, setNewCost] = useState('')
  const [newCurrency, setNewCurrency] = useState('EUR')
  const [newBroker, setNewBroker] = useState('')
  const [saved, setSaved] = useState(false)
  const [addError, setAddError] = useState('')
  const [showBulk, setShowBulk] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const [bulkError, setBulkError] = useState('')
  const tickerRef = useRef(null)

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
    setAddError('')
    if (!ticker) {
      setAddError('Enter a ticker or ISIN')
      return
    }
    if (rows.some(r => r.ticker === ticker)) {
      setAddError(`${ticker} already exists`)
      return
    }

    setRows([...rows, {
      key: ticker,
      ticker,
      shares: Number(newShares) || 0,
      avgCost: Number(newCost) || 0,
      currency: newCurrency,
      broker: newBroker.trim(),
    }])
    setNewTicker('')
    setNewShares('')
    setNewCost('')
    setNewBroker('')
    setSaved(false)
    // Focus back on ticker input for rapid entry
    tickerRef.current?.focus()
  }

  const handleBulkImport = () => {
    setBulkError('')
    const text = bulkText.trim()
    if (!text) return

    const lines = text.split('\n').filter(l => l.trim())
    const newRows = []
    const existingTickers = new Set(rows.map(r => r.ticker))
    const errors = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      // Support: TICKER,SHARES,PRU,CURRENCY,BROKER  (CSV)
      // or just: TICKER (one per line)
      const parts = line.split(/[,;\t]+/).map(s => s.trim())
      const ticker = (parts[0] || '').toUpperCase()
      if (!ticker) continue

      if (existingTickers.has(ticker)) {
        errors.push(`Line ${i + 1}: ${ticker} already exists, skipped`)
        continue
      }

      existingTickers.add(ticker)
      newRows.push({
        key: ticker,
        ticker,
        shares: Number(parts[1]) || 0,
        avgCost: Number(parts[2]) || 0,
        currency: (parts[3] || 'EUR').toUpperCase(),
        broker: parts[4] || '',
      })
    }

    if (newRows.length > 0) {
      setRows([...rows, ...newRows])
      setBulkText('')
      setShowBulk(false)
      setSaved(false)
    }
    if (errors.length > 0) {
      setBulkError(errors.join('\n'))
    }
  }

  const handleSave = () => {
    const clean = rows
      .filter(r => r.ticker)
      .map(({ ticker, shares, avgCost, currency, broker, class: cls }) => ({
        ticker,
        shares: Number(shares) || 0,
        avgCost: Number(avgCost) || 0,
        currency: currency || 'USD',
        broker: broker || '',
        ...(cls ? { class: cls } : {}),
      }))
    onSave(clean)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleExport = () => {
    const config = {
      holdings: rows
        .filter(r => r.ticker)
        .map(({ ticker, shares, avgCost, currency, broker }) => ({
          ticker,
          shares: Number(shares) || 0,
          avgCost: Number(avgCost) || 0,
          currency: currency || 'USD',
          broker: broker || '',
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

  const sym = (c) => c === 'EUR' ? '€' : c === 'GBP' ? '£' : c === 'CHF' ? 'CHF' : '$'
  const inputBase = 'bg-gray-800 text-gray-100 border border-gray-700 rounded px-2 py-1 text-sm focus:border-orange-500 focus:outline-none'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold">Manage Holdings</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowBulk(!showBulk)}
            className={`px-3 py-2 text-sm rounded transition-colors border ${
              showBulk
                ? 'bg-bb-amber/10 text-bb-amber border-bb-amber/30'
                : 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700'
            }`}
          >
            Bulk Import
          </button>
          <button
            onClick={handleExport}
            className="px-3 py-2 text-sm bg-gray-800 text-gray-300 rounded hover:bg-gray-700 transition-colors border border-gray-700"
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

      {/* Bulk import panel */}
      {showBulk && (
        <div className="bg-gray-900 rounded-lg border border-bb-amber/20 p-4 space-y-3">
          <div className="text-xs text-gray-400">
            Paste one line per holding. Format: <code className="text-bb-amber">TICKER, shares, PRU, currency, broker</code>
            <br />
            Only ticker is required. Example:
          </div>
          <pre className="text-xxs text-gray-500 bg-gray-800 rounded p-2">
{`GOOGL, 8, 120, USD, Bourso
FR0010147603, 10, 250, EUR, Bourso
BTC-USD, 0.5, 42000, USD, Lux
AAPL`}
          </pre>
          <textarea
            value={bulkText}
            onChange={e => setBulkText(e.target.value)}
            placeholder="Paste rows here..."
            rows={6}
            className={`${inputBase} w-full font-mono resize-y border-gray-600`}
          />
          {bulkError && <div className="text-xs text-bb-red whitespace-pre-line">{bulkError}</div>}
          <button
            onClick={handleBulkImport}
            className="px-4 py-2 text-sm bg-bb-amber text-black rounded font-medium hover:bg-bb-amber/90 transition-colors"
          >
            Import Lines
          </button>
        </div>
      )}

      {/* Holdings table */}
      <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left text-xs text-gray-500 uppercase tracking-wider px-3 py-3">Ticker / ISIN</th>
              <th className="text-left text-xs text-gray-500 uppercase tracking-wider px-3 py-3">Broker</th>
              <th className="text-left text-xs text-gray-500 uppercase tracking-wider px-3 py-3">Ccy</th>
              <th className="text-left text-xs text-gray-500 uppercase tracking-wider px-3 py-3">Shares</th>
              <th className="text-left text-xs text-gray-500 uppercase tracking-wider px-3 py-3">PRU</th>
              <th className="text-right text-xs text-gray-500 uppercase tracking-wider px-3 py-3">Total</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.key} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={row.ticker}
                    onChange={e => updateRow(i, 'ticker', e.target.value)}
                    className={`${inputBase} w-36 font-bold`}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={row.broker || ''}
                    onChange={e => updateRow(i, 'broker', e.target.value)}
                    placeholder="--"
                    className={`${inputBase} w-20 placeholder-gray-600`}
                  />
                </td>
                <td className="px-3 py-2">
                  <select
                    value={row.currency || 'USD'}
                    onChange={e => updateRow(i, 'currency', e.target.value)}
                    className={`${inputBase} w-20`}
                  >
                    {CURRENCIES.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    value={row.shares}
                    onChange={e => updateRow(i, 'shares', e.target.value)}
                    min="0"
                    step="any"
                    className={`${inputBase} w-20`}
                  />
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500 text-sm">{sym(row.currency)}</span>
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
                <td className="px-3 py-2 text-right text-sm text-gray-400 tabular-nums">
                  {sym(row.currency)}{((Number(row.shares) || 0) * (Number(row.avgCost) || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="px-1 py-2 text-center">
                  <button
                    onClick={() => removeRow(i)}
                    className="text-gray-600 hover:text-red-400 transition-colors text-sm px-1"
                    title="Remove"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Add new row */}
        <div className="border-t border-gray-700 bg-gray-800/30 px-3 py-3 flex items-center gap-2 flex-wrap">
          <input
            ref={tickerRef}
            type="text"
            value={newTicker}
            onChange={e => { setNewTicker(e.target.value); setAddError('') }}
            onKeyDown={handleKeyDown}
            placeholder="TICKER / ISIN"
            className={`${inputBase} w-36 placeholder-gray-600 font-bold border-gray-600`}
          />
          <input
            type="text"
            value={newBroker}
            onChange={e => setNewBroker(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Broker"
            className={`${inputBase} w-20 placeholder-gray-600 border-gray-600`}
          />
          <select
            value={newCurrency}
            onChange={e => setNewCurrency(e.target.value)}
            className={`${inputBase} w-20 border-gray-600`}
          >
            {CURRENCIES.map(o => (
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
            <span className="text-gray-600 text-sm">{sym(newCurrency)}</span>
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
          {addError && <span className="text-xs text-bb-red">{addError}</span>}
        </div>
      </div>

      {/* Summary */}
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">Holdings</span>
          <span className="text-lg font-bold">{rows.length}</span>
        </div>
      </div>

      <p className="text-xs text-gray-600">
        After saving, export the JSON and commit as <code className="text-gray-500">portfolio.config.json</code> to update the GitHub Actions data pipeline.
        Product types (Stock, ETF, Crypto, etc.) are auto-detected from Yahoo Finance.
      </p>
    </div>
  )
}
