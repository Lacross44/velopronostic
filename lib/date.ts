export function formatRaceDate(date: string) {
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Paris",
  })
}

export function formatRaceTime(date: string) {
  return new Date(date).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  })
}

export function formatRaceDateTime(date: string) {
  return `${formatRaceDate(date)} • ${formatRaceTime(date)}`
}

export function getCountdown(deadline?: string | null) {
  if (!deadline) return null

  const diff = new Date(deadline).getTime() - Date.now()

  if (diff <= 0) return null

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24)
  const minutes = Math.floor((diff / (1000 * 60)) % 60)

  if (days > 0) return `${days} j ${hours} h`
  if (hours > 0) return `${hours} h ${minutes} min`

  return `${minutes} min`
}