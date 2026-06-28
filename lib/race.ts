export function getRaceTypeInfo(type?: string | null) {
  switch (type) {
    case "itt":
      return { icon: "⏱", label: "CLM Individuel" }

    case "ttt":
      return { icon: "👥", label: "CLM Équipes" }

    case "mountain":
      return { icon: "⛰️", label: "Montagne" }

    case "hilly":
      return { icon: "🌄", label: "Accidentée" }

    case "gravel":
      return { icon: "🪨", label: "Gravel" }

    default:
      return { icon: "🚴", label: "Route" }
  }
}