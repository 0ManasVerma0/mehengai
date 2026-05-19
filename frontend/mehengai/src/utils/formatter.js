const MONTHS = [
  '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
]

// "Jan 24", "Feb 25" etc.
export function formatMonthYear(month, year) {
  return `${MONTHS[month]} ${String(year).slice(2)}`
}

// 5.2 → "+5.2%"  or  -1.3 → "-1.3%"
export function formatPct(val, decimals = 1) {
  if (val === null || val === undefined) return '—'
  const n = parseFloat(val)
  if (isNaN(n)) return '—'
  const sign = n > 0 ? '+' : ''
  return `${sign}${n.toFixed(decimals)}%`
}

// 189.2 → "189.2"
export function formatIndex(val, decimals = 1) {
  if (val === null || val === undefined) return '—'
  return parseFloat(val).toFixed(decimals)
}

// 94.72 → "₹94.72"
export function formatRupee(val) {
  if (val === null || val === undefined) return '—'
  return `₹${parseFloat(val).toFixed(2)}`
}

// Is the value positive, negative or neutral?
export function getSignal(val) {
  if (val === null || val === undefined) return 'neutral'
  const n = parseFloat(val)
  if (isNaN(n)) return 'neutral'
  if (n > 0.1)  return 'positive'
  if (n < -0.1) return 'negative'
  return 'neutral'
}

// Color classes for values
export function getSignalColor(val, invert = false) {
  const signal = getSignal(val)
  if (invert) {
    // For inflation: higher is worse
    if (signal === 'positive') return '#FF3333'
    if (signal === 'negative') return '#00CC66'
  } else {
    // For wages: higher is better
    if (signal === 'positive') return '#00CC66'
    if (signal === 'negative') return '#FF3333'
  }
  return '#6B7280'
}