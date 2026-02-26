"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useParams, useRouter } from "next/navigation"

export default function RacePage() {
  const { id } = useParams()
  const router = useRouter()

  const [race, setRace] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const [first, setFirst] = useState("")
  const [second, setSecond] = useState("")
  const [third, setThird] = useState("")
  const [firstFrench, setFirstFrench] = useState("")

  const [isLocked, setIsLocked] = useState(false)
  const [otherPredictions, setOtherPredictions] = useState<any[]>([])
  const [existingPredictionId, setExistingPredictionId] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)

      const { data: userData } = await supabase.auth.getUser()

      if (!userData.user) {
        router.push("/login")
        return
      }

      setUser(userData.user)

      // Charger la course
      const { data: raceData } = await supabase
        .from("races")
        .select("*")
        .eq("id", id)
        .single()

      if (!raceData) return

      setRace(raceData)

      const now = new Date()
      const deadline = new Date(raceData.race_date)

      if (now > deadline) {
        setIsLocked(true)
      }

      // Vérifier si l'utilisateur a déjà un pronostic
      const { data: existing } = await supabase
        .from("predictions")
        .select("*")
        .eq("race_id", id)
        .eq("user_id", userData.user.id)
        .single()

      if (existing) {
        setExistingPredictionId(existing.id)
        setFirst(existing.first || "")
        setSecond(existing.second || "")
        setThird(existing.third || "")
        setFirstFrench(existing.first_french || "")
      }

      // Si verrouillé → charger pronos des autres
      if (now > deadline) {
        const { data: others } = await supabase
          .from("predictions")
          .select(`
            first,
            second,
            third,
            first_french,
            profiles (
              username
            )
          `)
          .eq("race_id", id)

        setOtherPredictions(others || [])
      }

      setLoading(false)
    }

    loadData()
  }, [id, router])

  const handleSubmit = async (e: any) => {
    e.preventDefault()

    if (!race) return

    if (new Date(race.race_date) < new Date()) {
      alert("Pronostics fermés")
      return
    }

    if (existingPredictionId) {
      await supabase
        .from("predictions")
        .update({
          first,
          second,
          third,
          first_french: firstFrench,
        })
        .eq("id", existingPredictionId)

      alert("Pronostic modifié !")
    } else {
      await supabase.from("predictions").insert({
        race_id: id,
        user_id: user.id,
        first,
        second,
        third,
        first_french: firstFrench,
      })

      alert("Pronostic enregistré !")
    }
  }

  if (loading) return <p>Chargement...</p>
  if (!race) return <p>Course introuvable</p>

  return (
    <div className="flex flex-col items-center gap-4 min-h-screen p-10">
      <h1 className="text-2xl font-bold">{race.name}</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-64">
        <input
          disabled={isLocked}
          className="border p-2"
          placeholder="1er"
          value={first}
          onChange={(e) => setFirst(e.target.value)}
        />

        <input
          disabled={isLocked}
          className="border p-2"
          placeholder="2e"
          value={second}
          onChange={(e) => setSecond(e.target.value)}
        />

        <input
          disabled={isLocked}
          className="border p-2"
          placeholder="3e"
          value={third}
          onChange={(e) => setThird(e.target.value)}
        />

        <input
          disabled={isLocked}
          className="border p-2"
          placeholder="1er Français"
          value={firstFrench}
          onChange={(e) => setFirstFrench(e.target.value)}
        />

        {!isLocked && (
          <button
            type="submit"
            className="px-4 py-2 rounded bg-blue-600 text-white"
          >
            {existingPredictionId ? "Modifier" : "Enregistrer"}
          </button>
        )}
      </form>

      {isLocked && (
        <div className="mt-8 w-80">
          <h2 className="text-xl font-semibold mb-4">
            Pronostics des participants
          </h2>

          {otherPredictions.map((pred, index) => (
            <div key={index} className="border p-3 mb-2 rounded">
              <p className="font-bold">
                {pred.profiles?.username || "Utilisateur"}
              </p>
              <p>🥇 {pred.first}</p>
              <p>🥈 {pred.second}</p>
              <p>🥉 {pred.third}</p>
              <p>🇫🇷 {pred.first_french}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}