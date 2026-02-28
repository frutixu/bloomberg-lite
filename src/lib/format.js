const LOCALE_MAP = { EUR: 'fr-FR', GBP: 'en-GB', CHF: 'de-CH', USD: 'en-US' }
const SYMBOL_MAP = { EUR: '\u20ac', GBP: '\u00a3', CHF: 'CHF', USD: '$' }
const VALID_CURRENCIES = new Set(['USD', 'EUR', 'GBP', 'CHF'])

/** Safe number — returns 0 for NaN/Infinity/undefined */
const safe = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0 }

export function fmtCurrency(val, currency = 'USD') {
  const v = safe(val)
  const cur = VALID_CURRENCIES.has(currency) ? currency : 'USD'
  const locale = LOCALE_MAP[cur] || 'en-US'
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: cur }).format(v)
  } catch {
    return `${cur} ${v.toFixed(2)}`
  }
}

export function fmtPL(val, pct, currency = 'USD') {
  const v = safe(val)
  const p = safe(pct)
  const sign = v >= 0 ? '+' : ''
  return `${sign}${fmtCurrency(v, currency)} (${sign}${p.toFixed(2)}%)`
}

export function currencySymbol(currency = 'USD') {
  return SYMBOL_MAP[currency] || currency
}
