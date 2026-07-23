export function formatCurrency(paisa) {
  if (paisa == null || isNaN(paisa)) return 'Rs 0'
  const rupees = paisa / 100
  const formatted = rupees.toLocaleString('en-PK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `Rs ${formatted}`
}

export function formatCurrencyShort(paisa) {
  if (paisa == null || isNaN(paisa)) return 'Rs 0'
  const rupees = Math.round(paisa / 100)
  const formatted = rupees.toLocaleString('en-PK')
  return `Rs ${formatted}`
}

export function formatUSD(amount) {
  if (amount == null || isNaN(amount)) return '$0.00'
  const formatted = Number(amount).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return formatted
}

export function formatUSDShort(amount) {
  if (amount == null || isNaN(amount)) return '$0'
  if (amount >= 1000) {
    const k = amount / 1000
    return `$${k.toFixed(1)}K`
  }
  return `$${Math.round(amount)}`
}
