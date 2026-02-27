export function fmtCurrency(val, currency = 'USD') {
  return new Intl.NumberFormat(currency === 'EUR' ? 'fr-FR' : 'en-US', {
    style: 'currency',
    currency,
  }).format(val)
}

export function fmtPL(val, pct, currency = 'USD') {
  const sign = val >= 0 ? '+' : ''
  return `${sign}${fmtCurrency(val, currency)} (${sign}${pct.toFixed(2)}%)`
}

export function currencySymbol(currency = 'USD') {
  return currency === 'EUR' ? '\u20ac' : '$'
}
