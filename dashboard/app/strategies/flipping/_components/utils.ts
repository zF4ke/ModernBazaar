export const format = (n: number | undefined, d = 0) => n !== undefined ? new Intl.NumberFormat(undefined, { maximumFractionDigits: d, minimumFractionDigits: d }).format(n) : "-"

export const formatTime = (hours: number | undefined) => {
  if (!hours) return "N/A"
  if (hours < 1) return `${Math.round(hours * 60)}m`
  if (hours < 24) return `${hours.toFixed(1)}h`
  return `${Math.round(hours / 24)}d`
}

