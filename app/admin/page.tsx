"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

export default function AdminPage() {
  const [user, setUser] = useState<any>(null)
  const [races, setRaces] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // création course
  const [name, setName] = useState("")
  const [raceDate, setRaceDate] = useState("")
  const [deadline, setDeadline] = useState("")
  const [logoFile, setLogoFile] = useState<File | null>(null)

  // saisie résultats
  const [selectedRace, setSelectedRace] = useState<any>(null)
  const [first, setFirst] = useState("")
  const [second, setSecond] = useState("")
  const [third, setThird] = useState("")
  const [firstFrench, setFirstFrench] = useState("")

  useEffect(() => {
    init()
  }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }
    setUser(user)
    await loadRaces()
    setLoading(false)
  }

  async function loadRaces() {
    const { data, error } = await supabase
      .from("races")
      .select("*")
      .order("race_date", { ascending: false })

    if (error) console.error(error)
    setRaces(data || [])
  }

  async function createRace() {
    if (!name || !raceDate || !deadline) {
      alert("Tous les champs sont obligatoires")
      return
    }

    let logoUrl: string | null = null

    // Upload logo
    if (logoFile) {
      const fileExt = logoFile.name.split(".").pop()
      const fileName = `${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from("race-logos")
        .upload(fileName, logoFile, { upsert: true })

      if (uploadError) {
        console.error(uploadError)
        alert("Erreur upload logo")
        return
      }

      const { data } = supabase.storage
        .from("race-logos")
        .getPublicUrl(fileName)

      logoUrl = data.publicUrl
    }

    // Insert course
    const { error } = await supabase
      .from("races")
      .insert({
        name,
        race_date: raceDate,
        pronostic_deadline: deadline,
        logo_url: logoUrl,
      })

    if (error) {
      console.error(error)
      alert("Erreur création course")
      return
    }

    alert("Course créée ✅")
    setName("")
    setRaceDate("")
    setDeadline("")
    setLogoFile(null)
    await loadRaces()
  }

  // charge les résultats existants (si déjà saisis)
  async function openResultsModal(race: any) {
    setSelectedRace(race)

    // reset champs par défaut
    setFirst("")
    setSecond("")
    setThird("")
    setFirstFrench("")

    // si un résultat existe déjà dans results, on préremplit
    const { data, error } = await supabase
      .from("results")
      .select("*")
      .eq("race_id", race.id)
      .single()

    if (error) {
      // pas grave si aucun résultat encore
      return
    }

    if (data) {
      setFirst(data.first_place || "")
      setSecond(data.second_place || "")
      setThird(data.third_place || "")
      setFirstFrench(data.first_french || "")
    }
  }
function norm(s: any) {
  return (s ?? "")
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // retire accents
    .replace(/\s+/g, " ")           // espaces multiples
}

async function calculatePoints(raceId: string) {
  // 1) récupérer les résultats depuis results
  const { data: res, error: resErr } = await supabase
    .from("results")
    .select("*")
    .eq("race_id", raceId)
    .single()

  if (resErr) throw new Error("Résultats introuvables pour cette course.")
  if (!res) throw new Error("Résultats introuvables pour cette course.")

  // 2) récupérer les pronos
  const { data: predictions, error: predErr } = await supabase
    .from("predictions")
    .select("*")
    .eq("race_id", raceId)

  if (predErr) throw new Error(predErr.message)
  if (!predictions) return

  // normalisation résultats
  const r1 = norm(res.first_place)
  const r2 = norm(res.second_place)
  const r3 = norm(res.third_place)
  const rf = norm(res.first_french_place)

  const realTop3 = [r1, r2, r3]

  for (const p of predictions) {
    let points = 0

    const u1 = norm(p.first)
    const u2 = norm(p.second)
    const u3 = norm(p.third)
    const uf = norm(p.first_french)

    const userTop3 = [u1, u2, u3]

    // Barème : 5 / 4 / 3
    if (u1 === r1) points += 5
    if (u2 === r2) points += 4
    if (u3 === r3) points += 3

    // +1 si coureur dans le top3 mais pas à la bonne place
    userTop3.forEach((rider, idx) => {
      if (realTop3.includes(rider) && rider !== realTop3[idx]) points += 1
    })

    // 1er français : +2
    if (uf === rf) points += 2

    const { error: updErr } = await supabase
      .from("predictions")
      .update({ points })
      .eq("id", p.id)

    if (updErr) throw new Error(updErr.message)
  }
}
  async function saveResults() {
    if (!selectedRace) return

    if (!first || !second || !third || !firstFrench) {
      alert("Merci de saisir Top 3 + 1er français")
      return
    }

    // 1) upsert dans results
    const { error: upsertError } = await supabase
      .from("results")
      .upsert(
        {
          race_id: selectedRace.id,
          first_place: first,
          second_place: second,
          third_place: third,
          first_french: firstFrench,
        },
        { onConflict: "race_id" }
      )

    if (upsertError) {
      console.error(upsertError)
      alert("Erreur enregistrement résultats")
      return
    }

    try {
  await calculatePoints(selectedRace.id)
} catch (e: any) {
  alert("Erreur recalcul points: " + (e?.message ?? "inconnue"))
  return
}

    // 2) recalcul en base (RPC)
    const { error: rpcError } = await supabase.rpc("calculate_points_for_race", {
      p_race_id: selectedRace.id,
    })

    if (rpcError) {
      console.error(rpcError)
      alert("Résultats OK, mais erreur recalcul points (RPC)")
      return
    }

    alert("Résultats enregistrés + points recalculés ✅")
    setSelectedRace(null)
    await loadRaces()
  }

  if (loading) return <div className="p-6">Chargement...</div>
  if (!user) return <div className="p-6">Accès refusé</div>

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Admin — Courses & Résultats</h1>

      {/* Création course */}
      <div className="bg-white shadow p-6 rounded-xl mb-10">
        <h2 className="text-xl font-semibold mb-4">Créer une course</h2>

        <input
          type="text"
          placeholder="Nom"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border p-2 w-full mb-4 rounded"
        />

        <label className="block text-sm mb-1">Date de course</label>
        <input
          type="datetime-local"
          value={raceDate}
          onChange={(e) => setRaceDate(e.target.value)}
          className="border p-2 w-full mb-4 rounded"
        />

        <label className="block text-sm mb-1">Deadline pronostic</label>
        <input
          type="datetime-local"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          className="border p-2 w-full mb-4 rounded"
        />

        <label className="block text-sm mb-1">Logo (png/jpg)</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            if (e.target.files?.[0]) setLogoFile(e.target.files[0])
          }}
          className="mb-4"
        />

        <button
          onClick={createRace}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Créer
        </button>
      </div>

      {/* Liste courses */}
      <div className="bg-white shadow p-6 rounded-xl">
        <h2 className="text-xl font-semibold mb-4">Courses existantes</h2>

        {races.length === 0 && <p>Aucune course</p>}

        <div className="grid gap-3">
          {races.map((race) => (
            <div
              key={race.id}
              className="border rounded-lg p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                {race.logo_url && (
                  <img
                    src={race.logo_url}
                    alt={race.name}
                    className="h-10 w-20 object-contain"
                  />
                )}
                <div>
                  <div className="font-bold">{race.name}</div>
                  <div className="text-sm text-gray-500">
                    {race.race_date ? new Date(race.race_date).toLocaleString() : ""}
                  </div>
                </div>
              </div>

              <button
                onClick={() => openResultsModal(race)}
                className="bg-purple-600 text-white px-3 py-2 rounded"
              >
                Saisir résultats
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Modal résultats */}
      {selectedRace && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">
              Résultats — {selectedRace.name}
            </h3>

            <input
              className="border p-2 w-full mb-3 rounded"
              placeholder="1er"
              value={first}
              onChange={(e) => setFirst(e.target.value)}
            />
            <input
              className="border p-2 w-full mb-3 rounded"
              placeholder="2e"
              value={second}
              onChange={(e) => setSecond(e.target.value)}
            />
            <input
              className="border p-2 w-full mb-3 rounded"
              placeholder="3e"
              value={third}
              onChange={(e) => setThird(e.target.value)}
            />
            <input
              className="border p-2 w-full mb-4 rounded"
              placeholder="1er Français"
              value={firstFrench}
              onChange={(e) => setFirstFrench(e.target.value)}
            />

            <div className="flex justify-between gap-2">
              <button
                onClick={() => setSelectedRace(null)}
                className="bg-gray-500 text-white px-4 py-2 rounded"
              >
                Annuler
              </button>
              <button
                onClick={saveResults}
                className="bg-green-600 text-white px-4 py-2 rounded"
              >
                Enregistrer + Recalculer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}