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