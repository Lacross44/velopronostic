"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabaseClient"

type Race = {
  id: string
  name: string
  race_date: string | null
  pronostic_deadline: string | null
  logo_url?: string | null
}

type Rider = {
  id: string
  full_name: string
  short_name?: string | null
  nationality?: string | null
  team?: string | null
  is_active?: boolean | null
}

type RaceGroup = {
  id: string
  name: string
  slug?: string | null
  year?: number | null
  category?: string | null
}

export default function AdminPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)

  const [races, setRaces] = useState<Race[]>([])
  const [riders, setRiders] = useState<Rider[]>([])

  const [stats, setStats] = useState({
    races: 0,
    riders: 0,
    predictions: 0,
    activeLeagues: 0,
  })

  // Création course
  const [name, setName] = useState("")
  const [raceDate, setRaceDate] = useState("")
  const [deadline, setDeadline] = useState("")
  const [logoFile, setLogoFile] = useState<File | null>(null)

  // Modif courses
  const [editingRaceId, setEditingRaceId] = useState("")
  const [editName, setEditName] = useState("")
  const [editRaceDate, setEditRaceDate] = useState("")
  const [editDeadline, setEditDeadline] = useState("")

  // Résultats
  const [selectedRaceId, setSelectedRaceId] = useState("")
  const [first, setFirst] = useState("")
  const [second, setSecond] = useState("")
  const [third, setThird] = useState("")
  const [firstFrench, setFirstFrench] = useState("")

  // Coureurs
  const [riderName, setRiderName] = useState("")
  const [riderShortName, setRiderShortName] = useState("")
  const [riderNationality, setRiderNationality] = useState("")
  const [riderTeam, setRiderTeam] = useState("")
  const [riderSearch, setRiderSearch] = useState("")
  const [tab, setTab] = useState<"overview" | "races" | "results" | "riders" | "groups">("overview")

const [raceGroups, setRaceGroups] = useState<RaceGroup[]>([])

const [groupName, setGroupName] = useState("")
const [groupSlug, setGroupSlug] = useState("")
const [groupYear, setGroupYear] = useState("")
const [groupCategory, setGroupCategory] = useState("")

  const selectedRace = useMemo(
    () => races.find((r) => r.id === selectedRaceId) || null,
    [races, selectedRaceId]
  )

  useEffect(() => {
    init()
  }, [])

  async function init() {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      window.location.href = "/login"
      return
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role, username")
      .eq("id", user.id)
      .single()

    if (error || profile?.role !== "admin") {
      window.location.href = "/dashboard"
      return
    }

    setUser(user)
    setProfile(profile)

    await Promise.all([loadRaces(), loadRiders(), loadRaceGroups(), loadStats()])
    setLoading(false)
  }

  async function loadStats() {
    const [
      { count: racesCount },
      { count: ridersCount },
      { count: predictionsCount },
      { count: activeLeaguesCount },
    ] = await Promise.all([
      supabase.from("races").select("*", { count: "exact", head: true }),
      supabase.from("riders").select("*", { count: "exact", head: true }),
      supabase.from("predictions").select("*", { count: "exact", head: true }),
      supabase.from("leagues").select("*", { count: "exact", head: true }).eq("status", "active"),
    ])

    setStats({
      races: racesCount || 0,
      riders: ridersCount || 0,
      predictions: predictionsCount || 0,
      activeLeagues: activeLeaguesCount || 0,
    })
  }

  async function loadRaces() {
    const { data, error } = await supabase
      .from("races")
      .select("*")
      .order("race_date", { ascending: false })

    if (error) {
      console.error(error)
      return
    }

    setRaces((data || []) as Race[])
  }

  async function loadRaceGroups() {
  const { data, error } = await supabase
    .from("race_groups")
    .select("*")
    .order("year", { ascending: false })
    .order("name", { ascending: true })

  if (error) {
    console.error(error)
    return
  }

  setRaceGroups((data || []) as RaceGroup[])
}

async function createRaceGroup() {
  if (!groupName.trim()) {
    alert("Le nom du groupe est obligatoire.")
    return
  }

  const { error } = await supabase.from("race_groups").insert({
    name: groupName.trim(),
    slug: groupSlug.trim() || null,
    year: groupYear ? Number(groupYear) : null,
    category: groupCategory.trim() || null,
  })

  if (error) {
    console.error(error)
    alert("Erreur création groupe : " + error.message)
    return
  }

  alert("Groupe de courses créé ✅")

  setGroupName("")
  setGroupSlug("")
  setGroupYear("")
  setGroupCategory("")

  await loadRaceGroups()
}

  async function loadRiders() {
    const { data, error } = await supabase
      .from("riders")
      .select("*")
      .order("full_name", { ascending: true })

    if (error) {
      console.error(error)
      return
    }

    setRiders((data || []) as Rider[])
  }

  async function createRace() {
    if (!name || !raceDate || !deadline) {
      alert("Nom, date de course et deadline sont obligatoires.")
      return
    }

    let logoUrl: string | null = null

    if (logoFile) {
      const ext = logoFile.name.split(".").pop()
      const fileName = `${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from("race-logos")
        .upload(fileName, logoFile, { upsert: true })

      if (uploadError) {
        console.error(uploadError)
        alert("Erreur upload logo")
        return
      }

      const { data } = supabase.storage.from("race-logos").getPublicUrl(fileName)
      logoUrl = data.publicUrl
    }

    const { error } = await supabase.from("races").insert({
      name,
      race_date: raceDate,
      pronostic_deadline: deadline,
      logo_url: logoUrl,
    })

    if (error) {
      console.error(error)
      alert("Erreur création course : " + error.message)
      return
    }

    alert("Course créée ✅")
    setName("")
    setRaceDate("")
    setDeadline("")
    setLogoFile(null)
    await loadRaces()
    await loadStats()
  }

  function startEditRace(race: any) {
  setEditingRaceId(race.id)
  setEditName(race.name || "")
  setEditRaceDate(
    race.race_date ? new Date(race.race_date).toISOString().slice(0, 16) : ""
  )
  setEditDeadline(
    race.pronostic_deadline
      ? new Date(race.pronostic_deadline).toISOString().slice(0, 16)
      : ""
  )
}

async function updateRace() {
  if (!editingRaceId) return

  const { error } = await supabase
    .from("races")
    .update({
      name: editName,
      race_date: editRaceDate || null,
      pronostic_deadline: editDeadline || null,
    })
    .eq("id", editingRaceId)

  if (error) {
    alert("Erreur modification course : " + error.message)
    return
  }

  alert("Course modifiée ✅")
  setEditingRaceId("")
  setEditName("")
  setEditRaceDate("")
  setEditDeadline("")
  await loadRaces()
}

  async function saveResults() {
    if (!selectedRace) return

    if (!first || !second || !third || !firstFrench) {
      alert("Merci de saisir Top 3 + 1er français")
      return
    }

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

    const { error: rpcError } = await supabase.rpc("recalculate_points_for_race", {
      p_race_id: selectedRace.id,
    })

    if (rpcError) {
      console.error(rpcError)
      alert("Erreur recalcul points : " + rpcError.message)
      return
    }

    alert("Résultats enregistrés + points recalculés ✅")

    setSelectedRaceId("")
    setFirst("")
    setSecond("")
    setThird("")
    setFirstFrench("")

    await loadStats()
  }

  async function createRider() {
    if (!riderName.trim()) {
      alert("Nom du coureur obligatoire")
      return
    }

    const { error } = await supabase.from("riders").insert({
      full_name: riderName.trim(),
      short_name: riderShortName.trim() || null,
      nationality: riderNationality.trim() || null,
      team: riderTeam.trim() || null,
      is_active: true,
    })

    if (error) {
      console.error(error)
      alert("Erreur création coureur : " + error.message)
      return
    }

    alert("Coureur ajouté ✅")
    setRiderName("")
    setRiderShortName("")
    setRiderNationality("")
    setRiderTeam("")
    await loadRiders()
    await loadStats()
  }

  async function toggleRiderActive(rider: Rider) {
    const { error } = await supabase
      .from("riders")
      .update({ is_active: !rider.is_active })
      .eq("id", rider.id)

    if (error) {
      console.error(error)
      alert(error.message)
      return
    }

    await loadRiders()
  }

  const filteredRiders = riders.filter((r) =>
    `${r.full_name} ${r.short_name || ""} ${r.team || ""} ${r.nationality || ""}`
      .toLowerCase()
      .includes(riderSearch.toLowerCase())
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-fuchsia-950 text-white flex items-center justify-center">
        Chargement...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-fuchsia-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <p className="text-sm text-white/60 mb-1">Administration</p>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                🛠 Panneau admin
              </h1>
              <p className="text-white/70 mt-2">
                Gère les courses, les résultats et la base coureurs.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/dashboard"
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 transition"
              >
                ← Dashboard
              </Link>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-3 mb-6">
          {[
  ["overview", "📊 Vue d’ensemble"],
  ["races", "🏁 Courses"],
  ["results", "✅ Résultats"],
  ["riders", "🚴 Coureurs"],
  ["groups", "🗂 Groupes de courses"],
].map(([key, label]) => (
  <button
    key={key}
    onClick={() => setTab(key as any)}
    className={`px-4 py-2 rounded-xl border transition ${
      tab === key
        ? "bg-indigo-500/30 border-indigo-300/20"
        : "bg-white/5 border-white/10 hover:bg-white/10"
    }`}
  >
    {label}
  </button>
))}
        </div>

        {/* Overview */}
        {tab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard label="Courses" value={stats.races} emoji="🏁" />
            <StatCard label="Coureurs" value={stats.riders} emoji="🚴" />
            <StatCard label="Pronostics" value={stats.predictions} emoji="🎯" />
            <StatCard label="Ligues actives" value={stats.activeLeagues} emoji="🏆" />
          </div>
        )}

        {/* Courses */}
        {tab === "races" && (
          <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-6">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-2xl font-bold mb-4">Créer une course</h2>

              <div className="space-y-4">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nom de la course"
                  className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white"
                />

                <div>
                  <label className="block text-sm text-white/70 mb-2">Date de course</label>
                  <input
                    type="datetime-local"
                    value={raceDate}
                    onChange={(e) => setRaceDate(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm text-white/70 mb-2">Deadline pronostic</label>
                  <input
                    type="datetime-local"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm text-white/70 mb-2">Logo</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white"
                  />
                </div>

                <button
                  onClick={createRace}
                  className="w-full px-4 py-3 rounded-2xl bg-indigo-500/30 hover:bg-indigo-500/45 border border-indigo-300/20 transition font-semibold"
                >
                  Créer la course
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-2xl font-bold mb-4">Courses existantes</h2>

              <div className="space-y-3">
                {races.map((race) => (
                  <div
                    key={race.id}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {race.logo_url && (
                        <img
                          src={race.logo_url}
                          alt={race.name}
                          className="h-12 w-16 object-contain shrink-0"
                        />
                      )}
                      <div className="min-w-0">
                        <div className="font-bold truncate">{race.name}</div>
                        <div className="text-sm text-white/60">
                          {race.race_date ? new Date(race.race_date).toLocaleString() : "—"}
                        </div>
                        <div className="text-xs text-white/50">
                          Deadline :{" "}
                          {race.pronostic_deadline
                            ? new Date(race.pronostic_deadline).toLocaleString()
                            : "—"}
                        </div>
                        <button
                        onClick={() => startEditRace(race)}
                        className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 transition"
                        >
                        Modifier
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {editingRaceId && (
  <div className="rounded-3xl border border-white/10 bg-white/5 p-6 mt-6">
    <h2 className="text-2xl font-bold mb-4">Modifier la course</h2>

    <div className="space-y-4">
      <input
        value={editName}
        onChange={(e) => setEditName(e.target.value)}
        placeholder="Nom"
        className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white"
      />

      <input
        type="datetime-local"
        value={editRaceDate}
        onChange={(e) => setEditRaceDate(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white"
      />

      <input
        type="datetime-local"
        value={editDeadline}
        onChange={(e) => setEditDeadline(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white"
      />

      <div className="flex gap-3">
        <button
          onClick={updateRace}
          className="px-4 py-3 rounded-2xl bg-emerald-500/25 hover:bg-emerald-500/35 border border-emerald-300/20 transition font-semibold"
        >
          Enregistrer
        </button>

        <button
          onClick={() => setEditingRaceId("")}
          className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 transition"
        >
          Annuler
        </button>
      </div>
    </div>
  </div>
)}

                {races.length === 0 && (
                  <div className="text-white/60">Aucune course pour le moment.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {tab === "results" && (
          <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-6">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-2xl font-bold mb-4">Saisir un résultat</h2>

              <div className="space-y-4">
                <select
                  value={selectedRaceId}
                  onChange={(e) => setSelectedRaceId(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-900 p-3 text-white"
                >
                  <option value="" className="text-white">Choisir une course</option>
                  {races.map((race) => (
                    <option key={race.id} value={race.id}>
                      {race.name}
                    </option>
                  ))}
                </select>

                <input
                  value={first}
                  onChange={(e) => setFirst(e.target.value)}
                  placeholder="1er"
                  className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white"
                />
                <input
                  value={second}
                  onChange={(e) => setSecond(e.target.value)}
                  placeholder="2e"
                  className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white"
                />
                <input
                  value={third}
                  onChange={(e) => setThird(e.target.value)}
                  placeholder="3e"
                  className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white"
                />
                <input
                  value={firstFrench}
                  onChange={(e) => setFirstFrench(e.target.value)}
                  placeholder="1er Français"
                  className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white"
                />

                <button
                  onClick={saveResults}
                  className="w-full px-4 py-3 rounded-2xl bg-emerald-500/25 hover:bg-emerald-500/35 border border-emerald-300/20 transition font-semibold"
                >
                  Enregistrer et recalculer
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-2xl font-bold mb-4">Aide</h2>

              <div className="space-y-3 text-white/75">
                <p>• Saisis le résultat officiel une fois la course terminée.</p>
                <p>• Le recalcul des points se fait automatiquement via la RPC SQL.</p>
                <p>• La logique actuelle gère la casse, les accents et les prénoms inclus.</p>
                <p>• L’autocomplétion des coureurs permettra ensuite de fiabiliser totalement la saisie.</p>
              </div>
            </div>
          </div>
        )}

        {/* Riders */}
        {tab === "riders" && (
          <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-6">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-2xl font-bold mb-4">Ajouter un coureur</h2>

              <div className="space-y-4">
                <input
                  value={riderName}
                  onChange={(e) => setRiderName(e.target.value)}
                  placeholder="Nom complet"
                  className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white"
                />
                <input
                  value={riderShortName}
                  onChange={(e) => setRiderShortName(e.target.value)}
                  placeholder="Nom court"
                  className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white"
                />
                <input
                  value={riderNationality}
                  onChange={(e) => setRiderNationality(e.target.value)}
                  placeholder="Nationalité"
                  className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white"
                />
                <input
                  value={riderTeam}
                  onChange={(e) => setRiderTeam(e.target.value)}
                  placeholder="Équipe"
                  className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white"
                />

                <button
                  onClick={createRider}
                  className="w-full px-4 py-3 rounded-2xl bg-indigo-500/30 hover:bg-indigo-500/45 border border-indigo-300/20 transition font-semibold"
                >
                  Ajouter le coureur
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                <h2 className="text-2xl font-bold">Base coureurs</h2>

                <input
                  value={riderSearch}
                  onChange={(e) => setRiderSearch(e.target.value)}
                  placeholder="Rechercher un coureur..."
                  className="rounded-xl border border-white/10 bg-white/5 p-3 text-white md:w-80"
                />
              </div>

              <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
                {filteredRiders.map((rider) => (
                  <div
                    key={rider.id}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4 flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <div className="font-bold truncate">{rider.full_name}</div>
                      <div className="text-sm text-white/60">
                        {rider.short_name || "—"} • {rider.team || "Équipe inconnue"} •{" "}
                        {rider.nationality || "—"}
                      </div>
                    </div>

                    <button
                      onClick={() => toggleRiderActive(rider)}
                      className={`px-3 py-2 rounded-xl border transition ${
                        rider.is_active
                          ? "bg-emerald-500/20 border-emerald-300/20"
                          : "bg-red-500/20 border-red-300/20"
                      }`}
                    >
                      {rider.is_active ? "Actif" : "Inactif"}
                    </button>
                  </div>
                ))}

                {filteredRiders.length === 0 && (
                  <div className="text-white/60">Aucun coureur trouvé.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === "groups" && (
  <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-6">
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <h2 className="text-2xl font-bold mb-4">Créer un groupe de courses</h2>

      <div className="space-y-4">
        <input
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          placeholder="Nom du groupe (ex : Critérium du Dauphiné)"
          className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white"
        />

        <input
          value={groupSlug}
          onChange={(e) => setGroupSlug(e.target.value)}
          placeholder="Slug (ex : dauphine-2026)"
          className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white"
        />

        <input
          type="number"
          value={groupYear}
          onChange={(e) => setGroupYear(e.target.value)}
          placeholder="Année"
          className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white"
        />

        <input
          value={groupCategory}
          onChange={(e) => setGroupCategory(e.target.value)}
          placeholder="Catégorie (ex : stage_race)"
          className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white"
        />

        <button
          onClick={createRaceGroup}
          className="w-full px-4 py-3 rounded-2xl bg-indigo-500/30 hover:bg-indigo-500/45 border border-indigo-300/20 transition font-semibold"
        >
          Créer le groupe
        </button>
      </div>
    </div>

    <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <h2 className="text-2xl font-bold mb-4">Groupes existants</h2>

      <div className="space-y-3">
        {raceGroups.map((group) => (
          <div
            key={group.id}
            className="rounded-2xl border border-white/10 bg-white/5 p-4 flex items-center justify-between gap-4"
          >
            <div className="min-w-0">
              <div className="font-bold truncate">{group.name}</div>
              <div className="text-sm text-white/60">
                {group.year || "—"} • {group.category || "—"}
              </div>
              <div className="text-xs text-white/50">{group.slug || "—"}</div>
            </div>
          </div>
        ))}

        {raceGroups.length === 0 && (
          <div className="text-white/60">Aucun groupe de courses pour le moment.</div>
        )}
      </div>
    </div>
  </div>
)}
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  emoji,
}: {
  label: string
  value: number
  emoji: string
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <div className="text-3xl mb-3">{emoji}</div>
      <div className="text-sm text-white/60">{label}</div>
      <div className="text-3xl font-extrabold mt-1">{value}</div>
    </div>
  )
}