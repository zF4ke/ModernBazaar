export const format = (n: number | undefined, d = 0) =>
  n !== undefined && n !== null && Number.isFinite(n)
    ? new Intl.NumberFormat(undefined, { maximumFractionDigits: d, minimumFractionDigits: d }).format(n)
    : "-"

export const formatTime = (hours: number | undefined) => {
  if (!hours || !Number.isFinite(hours)) return "N/A"
  if (hours < 1) return `${Math.round(hours * 60)}m`
  if (hours < 24) return `${hours.toFixed(1)}h`
  return `${Math.round(hours / 24)}d`
}

/** Compact coin formatting for large numbers (e.g. 12.3M, 1.2B). */
export const formatCompact = (n: number | undefined, d = 1) => {
  if (n === undefined || n === null || !Number.isFinite(n)) return "-"
  const abs = Math.abs(n)
  if (abs >= 1e9) return `${(n / 1e9).toFixed(d)}B`
  if (abs >= 1e6) return `${(n / 1e6).toFixed(d)}M`
  if (abs >= 1e3) return `${(n / 1e3).toFixed(d)}k`
  return format(n, 0)
}
