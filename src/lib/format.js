const LOCALE_MAP = {
  EUR: 'fr-FR',
  GBP: 'en-GB',
  CHF: 'de-CH',
  USD: 'en-US',
}

export function fmtCurrency(val, currency = 'USD') {
  const locale = LOCALE_MAP[currency] || 'en-US'
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(val)
}

export function fmtPL(val, pct, currency = 'USD') {
  const sign = val >= 0 ? '+' : ''
  return `${sign}${fmtCurrency(val, currency)} (${sign}${pct.toFixed(2)}%)`
}

const SYMBOL_MAP = { EUR: '\u20ac', GBP: '\u00a3', CHF: 'CHF', USD: '$' }

export function currencySymbol(currency = 'USD') {
  return SYMBOL_MAP[currency] || currency
}
