"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabaseClient"
import RiderAutocomplete from "@/components/RiderAutocomplete"
import TeamAutocomplete from "@/components/TeamAutocomplete"

type Race = {
  id: string
  name: string
  race_date: string | null
  pronostic_deadline: string | null
  logo_url?: string | null
  race_group_id?: string | null
  stage_number?: number | null
  is_stage?: boolean | null
  race_groups?: {
    name: string
    year: number | null
  } | null
  race_type?: "road" | "itt" | "ttt" | string | null
}

type Rider = {
  id: string
  full_name: string
  short_name?: string | null
  nationality?: string | null
  team?: string | null
  is_active?: boolean | null
  team_id?: string | null
}

type RaceGroup = {
  id: string
  name: string
  slug?: string | null
  year?: number | null
  category?: string | null
    races?: {
    count: number
  }[]
}

type Team = {
  id: string
  name: string
  short_name?: string | null
  country?: string | null
  logo_url?: string | null
  is_active?: boolean | null
  riders?: {
    id: string
    full_name: string
    short_name?: string | null
  }[]
}



export default function AdminPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)

  const [races, setRaces] = useState<Race[]>([])
  const [riders, setRiders] = useState<Rider[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState("")
  const [stageNumber, setStageNumber] = useState("")

  const [teams, setTeams] = useState<Team[]>([])
const [teamName, setTeamName] = useState("")
const [teamShortName, setTeamShortName] = useState("")
const [teamCountry, setTeamCountry] = useState("")
const [teamSearch, setTeamSearch] = useState("")

const [editingTeamId, setEditingTeamId] = useState("")
const [editTeamName, setEditTeamName] = useState("")
const [editTeamShortName, setEditTeamShortName] = useState("")
const [editTeamCountry, setEditTeamCountry] = useState("")
const [teamLogoFile, setTeamLogoFile] = useState<File | null>(null)

const [editingRiderId, setEditingRiderId] = useState("")
const [editRiderName, setEditRiderName] = useState("")
const [editRiderShortName, setEditRiderShortName] = useState("")
const [editRiderNationality, setEditRiderNationality] = useState("")
const [editRiderTeamId, setEditRiderTeamId] = useState("")

  const [firstResultRiderId, setFirstResultRiderId] = useState<string | null>(null)
  const [secondResultRiderId, setSecondResultRiderId] = useState<string | null>(null)
  const [thirdResultRiderId, setThirdResultRiderId] = useState<string | null>(null)
  const [firstFrenchResultRiderId, setFirstFrenchResultRiderId] = useState<string | null>(null)
  const [firstResultTeamId, setFirstResultTeamId] = useState<string | null>(null)
const [secondResultTeamId, setSecondResultTeamId] = useState<string | null>(null)
const [thirdResultTeamId, setThirdResultTeamId] = useState<string | null>(null)

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
  const [raceType, setRaceType] = useState("road")

  // Modif courses
  const [editingRaceId, setEditingRaceId] = useState("")
  const [editName, setEditName] = useState("")
  const [editRaceDate, setEditRaceDate] = useState("")
  const [editDeadline, setEditDeadline] = useState("")
  const [editRaceType, setEditRaceType] = useState("road")
  const [editSelectedGroupId, setEditSelectedGroupId] = useState("")
  const [editStageNumber, setEditStageNumber] = useState("")


  // Résultats
  const [selectedRaceId, setSelectedRaceId] = useState("")
  const [first, setFirst] = useState("")
  const [second, setSecond] = useState("")
  const [third, setThird] = useState("")
  const [firstFrench, setFirstFrench] = useState("")
  const [resultRaceSearch, setResultRaceSearch] = useState("")

  // Coureurs
  const [riderName, setRiderName] = useState("")
  const [riderShortName, setRiderShortName] = useState("")
  const [riderNationality, setRiderNationality] = useState("")
  const [riderTeam, setRiderTeam] = useState("")
  const [riderSearch, setRiderSearch] = useState("")
  const [tab, setTab] = useState<"overview" | "races" | "results" | "riders" | "teams" | "groups" | "gcResults">("overview")
  const [riderTeamId, setRiderTeamId] = useState("")

const [raceGroups, setRaceGroups] = useState<RaceGroup[]>([])

const [groupName, setGroupName] = useState("")
const [groupSlug, setGroupSlug] = useState("")
const [groupYear, setGroupYear] = useState("")
const [groupCategory, setGroupCategory] = useState("")

const [selectedGcGroupId, setSelectedGcGroupId] = useState("")

const [gcResFirst, setGcResFirst] = useState("")
const [gcResSecond, setGcResSecond] = useState("")
const [gcResThird, setGcResThird] = useState("")
const [gcResFirstFrench, setGcResFirstFrench] = useState("")

const [gcResFirstId, setGcResFirstId] = useState<string | null>(null)
const [gcResSecondId, setGcResSecondId] = useState<string | null>(null)
const [gcResThirdId, setGcResThirdId] = useState<string | null>(null)
const [gcResFirstFrenchId, setGcResFirstFrenchId] = useState<string | null>(null)
const [existingGroupResult, setExistingGroupResult] = useState<any>(null)

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

    await Promise.all([loadRaces(), loadRiders(), loadTeams(), loadRaceGroups(), loadStats()])
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
      .select(`
      *,
      race_groups (
        name,
        year
      )
    `)
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
    .select(`
  *,
  races(count)
`)
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
      race_date: raceDate ? new Date(raceDate).toISOString() : null,
      pronostic_deadline: deadline ? new Date(deadline).toISOString() : null,
      logo_url: logoUrl,
      race_group_id: selectedGroupId || null,
      stage_number: stageNumber ? Number(stageNumber) : null,
      is_stage: !!selectedGroupId,
      race_type: raceType,
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
    setSelectedGroupId("")
    setStageNumber("")
    setRaceType("road")
    await loadRaces()
    await loadStats()
  }

 async function loadTeams() {
  const { data, error } = await supabase
    .from("teams")
    .select(`
      *,
      riders (
        id,
        full_name,
        short_name
      )
    `)
    .order("name", { ascending: true })

  if (error) {
    console.error(error)
    return
  }

  setTeams((data || []) as Team[])
}

async function createTeam() {
  if (!teamName.trim()) {
    alert("Nom d’équipe obligatoire")
    return
  }

  let logoUrl: string | null = null

if (teamLogoFile) {
  const ext = teamLogoFile.name.split(".").pop()
  const fileName = `${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from("team-logos")
    .upload(fileName, teamLogoFile, { upsert: true })

  if (uploadError) {
    alert("Erreur upload logo équipe : " + uploadError.message)
    return
  }

  const { data } = supabase.storage
    .from("team-logos")
    .getPublicUrl(fileName)

  logoUrl = data.publicUrl
}

  const { error } = await supabase.from("teams").insert({
    name: teamName.trim(),
    short_name: teamShortName.trim() || null,
    country: teamCountry.trim() || null,
    logo_url: logoUrl,
    is_active: true,
  })

  if (error) {
    alert("Erreur création équipe : " + error.message)
    return
  }

  alert("Équipe ajoutée ✅")
  setTeamName("")
  setTeamShortName("")
  setTeamCountry("")
  setTeamLogoFile(null)
  await loadTeams()
}

function startEditTeam(team: Team) {
  setEditingTeamId(team.id)
  setEditTeamName(team.name || "")
  setEditTeamShortName(team.short_name || "")
  setEditTeamCountry(team.country || "")
}

async function updateTeam() {
  if (!editingTeamId) return

  const { error } = await supabase
    .from("teams")
    .update({
      name: editTeamName.trim(),
      short_name: editTeamShortName.trim() || null,
      country: editTeamCountry.trim() || null,
    })
    .eq("id", editingTeamId)

  if (error) {
    alert("Erreur modification équipe : " + error.message)
    return
  }

  alert("Équipe modifiée ✅")
  setEditingTeamId("")
  setEditTeamName("")
  setEditTeamShortName("")
  setEditTeamCountry("")
  await loadTeams()
}

async function toggleTeamActive(team: Team) {
  const { error } = await supabase
    .from("teams")
    .update({ is_active: !team.is_active })
    .eq("id", team.id)

  if (error) {
    alert(error.message)
    return
  }

  await loadTeams()
}

const filteredResultRaces = races.filter((race) =>
  `${race.name} ${race.race_groups?.name || ""} ${race.race_type || ""}`
    .toLowerCase()
    .includes(resultRaceSearch.toLowerCase())
)

const filteredTeams = teams.filter((t) =>
  `${t.name} ${t.short_name || ""} ${t.country || ""}`
    .toLowerCase()
    .includes(teamSearch.toLowerCase())
)

function formatForDateTimeLocal(dateString?: string | null) {
  if (!dateString) return ""

  const date = new Date(dateString)

  // 🔥 CORRECTION : on compense le fuseau horaire
  const offset = date.getTimezoneOffset()
  const localDate = new Date(date.getTime() - offset * 60000)

  return localDate.toISOString().slice(0, 16)
}

function formatDateFr(dateString?: string | null) {
  if (!dateString) return "—"

  const clean = dateString.replace("T", " ").slice(0, 16)
  const [datePart, timePart] = clean.split(" ")

  if (!datePart || !timePart) return dateString

  const [year, month, day] = datePart.split("-")

  return `${day}/${month}/${year} ${timePart}`
}

function startEditRace(race: any) {

  console.log("START EDIT RACE", race)
  setEditingRaceId(race.id)
  setEditName(race.name || "")
  setEditRaceDate(formatForDateTimeLocal(race.race_date))
  setEditDeadline(formatForDateTimeLocal(race.pronostic_deadline))
  setEditSelectedGroupId(race.race_group_id || "")
  setEditStageNumber(race.stage_number ? String(race.stage_number) : "")
  setEditRaceType(race.race_type || "road")
}

async function updateRace() {
  console.log("UPDATE RACE START", {
    editingRaceId,
    editName,
    editRaceDate,
    editDeadline,
    editRaceType,
  })

  if (!editingRaceId) {
    alert("Aucune course sélectionnée")
    return
  }

  const payload = {
    name: editName.trim(),
    race_date: editRaceDate ? new Date(editRaceDate).toISOString() : null,
    pronostic_deadline: editDeadline ? new Date(editDeadline).toISOString() : null,
    race_group_id: editSelectedGroupId || null,
    stage_number: editStageNumber ? Number(editStageNumber) : null,
    is_stage: !!editSelectedGroupId,
    race_type: editRaceType,
  }

  const { data, error } = await supabase
    .from("races")
    .update(payload)
    .eq("id", editingRaceId)
    .select()

  console.log("UPDATE RACE RESULT", { data, error })

  if (error) {
    alert("Erreur modification course : " + error.message)
    return
  }

  if (!data || data.length === 0) {
    alert("Aucune ligne modifiée. Probable blocage RLS.")
    return
  }

  alert("Course modifiée ✅")

  setEditingRaceId("")
  setEditName("")
  setEditRaceDate("")
  setEditDeadline("")
  setEditSelectedGroupId("")
  setEditStageNumber("")
  setEditRaceType("road")
  await loadRaces()
}

  async function saveResults() {
    if (!selectedRace) return

    if (selectedRace?.race_type === "ttt") {
  if (!first || !second || !third) {
    alert("Merci de saisir les 3 premières équipes.")
    return
  }
} else {
  if (!first || !second || !third || !firstFrench) {
    alert("Merci de saisir Top 3 + 1er Français.")
    return
  }
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
      first_place_rider_id: firstResultRiderId,
      second_place_rider_id: secondResultRiderId,
      third_place_rider_id: thirdResultRiderId,
      first_french_rider_id: firstFrenchResultRiderId,
      first_team_id: firstResultTeamId,
      second_team_id: secondResultTeamId,
      third_team_id: thirdResultTeamId,
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

    // Reset IDs autocomplete
    setFirstResultRiderId(null)
    setSecondResultRiderId(null)
    setThirdResultRiderId(null)
    setFirstFrenchResultRiderId(null)
    setFirstResultTeamId(null)
    setSecondResultTeamId(null)
    setThirdResultTeamId(null)

    await loadStats()
  }

  async function saveGroupResults() {
  if (!selectedGcGroupId) {
    alert("Choisis un groupe de courses.")
    return
  }

  if (!gcResFirst || !gcResSecond || !gcResThird || !gcResFirstFrench) {
    alert("Merci de saisir le podium final + le premier Français.")
    return
  }

  const { error: upsertError } = await supabase
    .from("group_results")
    .upsert(
      {
        race_group_id: selectedGcGroupId,

        gc_first: gcResFirst,
        gc_second: gcResSecond,
        gc_third: gcResThird,
        gc_first_french: gcResFirstFrench,

        gc_first_rider_id: gcResFirstId,
        gc_second_rider_id: gcResSecondId,
        gc_third_rider_id: gcResThirdId,
        gc_first_french_rider_id: gcResFirstFrenchId,
      },
      { onConflict: "race_group_id" }
    )

  if (upsertError) {
    alert("Erreur enregistrement résultat CG : " + upsertError.message)
    return
  }

  const { error: rpcError } = await supabase.rpc("recalculate_group_points", {
    p_race_group_id: selectedGcGroupId,
  })

  if (rpcError) {
    alert("Résultat CG enregistré, mais erreur recalcul : " + rpcError.message)
    return
  }

  alert("Résultat CG final enregistré + points recalculés ✅")

  setSelectedGcGroupId("")
  setGcResFirst("")
  setGcResSecond("")
  setGcResThird("")
  setGcResFirstFrench("")
  setGcResFirstId(null)
  setGcResSecondId(null)
  setGcResThirdId(null)
  setGcResFirstFrenchId(null)
  await loadExistingGroupResult(selectedGcGroupId)
}

async function loadExistingGroupResult(groupId: string) {
  if (!groupId) {
    setExistingGroupResult(null)
    return
  }

  const { data, error } = await supabase
    .from("group_results")
    .select("*")
    .eq("race_group_id", groupId)
    .maybeSingle()

  if (error) {
    console.error(error)
    setExistingGroupResult(null)
    return
  }

  setExistingGroupResult(data || null)

  if (data) {
    setGcResFirst(data.gc_first || "")
    setGcResSecond(data.gc_second || "")
    setGcResThird(data.gc_third || "")
    setGcResFirstFrench(data.gc_first_french || "")

    setGcResFirstId(data.gc_first_rider_id || null)
    setGcResSecondId(data.gc_second_rider_id || null)
    setGcResThirdId(data.gc_third_rider_id || null)
    setGcResFirstFrenchId(data.gc_first_french_rider_id || null)
  }
}

  async function createRider() {
    if (!riderName.trim()) {
      alert("Nom du coureur obligatoire")
      return
    }
    const selectedTeam = teams.find((t) => t.id === riderTeamId)

    const { error } = await supabase.from("riders").insert({
      full_name: riderName.trim(),
      short_name: riderShortName.trim() || null,
      nationality: riderNationality.trim() || null,
      team_id: riderTeamId || null,
      team: selectedTeam?.name || riderTeam.trim() || null,
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
  setRiderTeamId("")
  await loadRiders()
  await loadTeams()
    await loadStats()
  }

  function startEditRider(rider: Rider) {
  setEditingRiderId(rider.id)
  setEditRiderName(rider.full_name || "")
  setEditRiderShortName(rider.short_name || "")
  setEditRiderNationality(rider.nationality || "")
  setEditRiderTeamId(rider.team_id || "")
}

async function updateRider() {
  if (!editingRiderId) return

  const selectedTeam = teams.find((t) => t.id === editRiderTeamId)

  const { error } = await supabase
    .from("riders")
    .update({
      full_name: editRiderName.trim(),
      short_name: editRiderShortName.trim() || null,
      nationality: editRiderNationality.trim() || null,
      team_id: editRiderTeamId || null,

      // on garde le champ texte pour compatibilité
      team: selectedTeam?.name || null,
    })
    .eq("id", editingRiderId)

  if (error) {
    alert("Erreur modification coureur : " + error.message)
    return
  }

  alert("Coureur modifié ✅")
  setEditingRiderId("")
  setEditRiderName("")
  setEditRiderShortName("")
  setEditRiderNationality("")
  setEditRiderTeamId("")
  await loadRiders()
  await loadTeams()
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
  ["gcResults", "🏆 Résultat CG final"],
  ["teams", "🏢 Équipes"],
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
      <select
  value={editSelectedGroupId}
  onChange={(e) => setEditSelectedGroupId(e.target.value)}
  className="w-full rounded-xl border border-white/10 bg-slate-800 p-3 text-white"
>
  <option value="">Course seule</option>
  {raceGroups.map((group) => (
    <option key={group.id} value={group.id}>
      {group.name} {group.year ? `(${group.year})` : ""}
    </option>
  ))}
</select>

{editSelectedGroupId && (
  <input
    type="number"
    value={editStageNumber}
    onChange={(e) => setEditStageNumber(e.target.value)}
    placeholder="Numéro d’étape"
    className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white"
  />
)}

<select
  value={editRaceType}
  onChange={(e) => setEditRaceType(e.target.value)}
  className="w-full rounded-xl border border-white/10 bg-slate-800 p-3 text-white"
>
  <option value="road">🚴 Étape classique</option>
  <option value="itt">⏱ Contre-la-montre individuel</option>
  <option value="ttt">👥 Contre-la-montre par équipes</option>
</select>

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

              <select
  value={selectedGroupId}
  onChange={(e) => setSelectedGroupId(e.target.value)}
  className="w-full rounded-xl border border-white/10 bg-slate-900 p-3 text-white"
>
  <option value="" className="text-black">Course seule</option>
  {raceGroups.map((group) => (
    <option key={group.id} value={group.id} className="text-black">
      {group.name} {group.year ? `(${group.year})` : ""}
    </option>
  ))}
</select>

<input
  type="number"
  value={stageNumber}
  onChange={(e) => setStageNumber(e.target.value)}
  placeholder="Numéro d’étape"
  className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white"
/>

              <div className="space-y-4">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nom de la course"
                  className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white"
                />
                <select
  value={raceType}
  onChange={(e) => setRaceType(e.target.value)}
  className="w-full rounded-xl border border-white/10 bg-slate-800 p-3 text-white"
>
  <option value="road">🚴 Étape classique</option>
  <option value="itt">⏱ Contre-la-montre individuel</option>
  <option value="ttt">👥 Contre-la-montre par équipes</option>
</select>

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
                      <span className="mr-2">
  {race.race_type === "itt" ? "⏱" : race.race_type === "ttt" ? "👥" : "🚴"}
</span>
                        <div className="font-bold truncate">{race.name}</div>
                        <div className="text-sm text-white/60">
                          {race.race_date ? formatDateFr(race.race_date) : "—"}
                        </div>
                        <div className="text-xs text-white/50">
                          Deadline :{" "}
                          {race.pronostic_deadline
                            ? formatDateFr(race.pronostic_deadline)
                            : "—"}
                        </div>
                        {race.race_groups && (
  <div className="text-xs text-indigo-200 mt-1">
    🗂 {race.race_groups.name}
    {race.race_groups.year ? ` ${race.race_groups.year}` : ""}
    {race.stage_number ? ` • Étape ${race.stage_number}` : ""}
  </div>
)}
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
                <input
  value={resultRaceSearch}
  onChange={(e) => setResultRaceSearch(e.target.value)}
  placeholder="Rechercher une course..."
  className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white"
/>
                <select
                  value={selectedRaceId}
                  onChange={(e) => setSelectedRaceId(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-900 p-3 text-white"
                >
                  <option value="" className="text-white">Choisir une course</option>
                  {filteredResultRaces.map((race) => (
                    <option key={race.id} value={race.id}>
  {race.name}
  {race.race_groups?.name ? ` — ${race.race_groups.name}` : ""}
  {race.stage_number ? ` — Étape ${race.stage_number}` : ""}
</option>
                  ))}
                </select>

              {selectedRace?.race_type === "ttt" ? (
  <div className="space-y-4">
    <TeamAutocomplete
      label="👥 Équipe gagnante"
      placeholder="Chercher l’équipe gagnante"
      value={first}
      selectedId={firstResultTeamId}
      onValueChange={setFirst}
      onSelect={(team) => setFirstResultTeamId(team?.id || null)}
      excludedIds={[secondResultTeamId || "", thirdResultTeamId || ""].filter(Boolean)}
    />

    <TeamAutocomplete
      label="👥 Deuxième équipe"
      placeholder="Chercher la 2e équipe"
      value={second}
      selectedId={secondResultTeamId}
      onValueChange={setSecond}
      onSelect={(team) => setSecondResultTeamId(team?.id || null)}
      excludedIds={[firstResultTeamId || "", thirdResultTeamId || ""].filter(Boolean)}
    />

    <TeamAutocomplete
      label="👥 Troisième équipe"
      placeholder="Chercher la 3e équipe"
      value={third}
      selectedId={thirdResultTeamId}
      onValueChange={setThird}
      onSelect={(team) => setThirdResultTeamId(team?.id || null)}
      excludedIds={[firstResultTeamId || "", secondResultTeamId || ""].filter(Boolean)}
    />

    <div className="text-sm text-white/60 rounded-xl border border-white/10 bg-white/5 p-3">
      Pour un contre-la-montre par équipes, il n’y a pas de 1er Français à saisir.
    </div>
  </div>
) : (
  <div className="space-y-4">
    <RiderAutocomplete
      label="🥇 1er"
      placeholder="Chercher le vainqueur"
      value={first}
      selectedId={firstResultRiderId}
      onValueChange={setFirst}
      onSelect={(rider) => setFirstResultRiderId(rider?.id || null)}
      excludedIds={[secondResultRiderId || "", thirdResultRiderId || ""].filter(Boolean)}
    />

    <RiderAutocomplete
      label="🥈 2e"
      placeholder="Chercher le 2e"
      value={second}
      selectedId={secondResultRiderId}
      onValueChange={setSecond}
      onSelect={(rider) => setSecondResultRiderId(rider?.id || null)}
      excludedIds={[firstResultRiderId || "", thirdResultRiderId || ""].filter(Boolean)}
    />

    <RiderAutocomplete
      label="🥉 3e"
      placeholder="Chercher le 3e"
      value={third}
      selectedId={thirdResultRiderId}
      onValueChange={setThird}
      onSelect={(rider) => setThirdResultRiderId(rider?.id || null)}
      excludedIds={[firstResultRiderId || "", secondResultRiderId || ""].filter(Boolean)}
    />

    <RiderAutocomplete
      label="🇫🇷 1er Français"
      placeholder="Chercher le 1er Français"
      value={firstFrench}
      selectedId={firstFrenchResultRiderId}
      onValueChange={setFirstFrench}
      onSelect={(rider) => setFirstFrenchResultRiderId(rider?.id || null)}
    />
  </div>
)}

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
                <select
  value={riderTeamId}
  onChange={(e) => setRiderTeamId(e.target.value)}
  className="w-full rounded-xl border border-white/10 bg-slate-800 p-3 text-white"
>
  <option value="" style={{ backgroundColor: "#111827", color: "#ffffff" }}>
    Aucune équipe
  </option>

  {teams.map((team) => (
    <option
      key={team.id}
      value={team.id}
      style={{ backgroundColor: "#111827", color: "#ffffff" }}
    >
      {team.name}
    </option>
  ))}
</select>

                <button
                  onClick={createRider}
                  className="w-full px-4 py-3 rounded-2xl bg-indigo-500/30 hover:bg-indigo-500/45 border border-indigo-300/20 transition font-semibold"
                >
                  Ajouter le coureur
                </button>
              </div>
            </div>
            {editingRiderId && (
  <div className="rounded-3xl border border-white/10 bg-white/5 p-6 mt-6">
    <h2 className="text-2xl font-bold mb-4">Modifier le coureur</h2>

    <div className="space-y-4">
      <input
        value={editRiderName}
        onChange={(e) => setEditRiderName(e.target.value)}
        placeholder="Nom complet"
        className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white"
      />

      <input
        value={editRiderShortName}
        onChange={(e) => setEditRiderShortName(e.target.value)}
        placeholder="Nom court"
        className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white"
      />

      <input
        value={editRiderNationality}
        onChange={(e) => setEditRiderNationality(e.target.value)}
        placeholder="Nationalité"
        className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white"
      />

      <select
        value={editRiderTeamId}
        onChange={(e) => setEditRiderTeamId(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-slate-800 p-3 text-white"
      >
        <option value="" style={{ backgroundColor: "#111827", color: "#ffffff" }}>
          Aucune équipe
        </option>

        {teams.map((team) => (
          <option
            key={team.id}
            value={team.id}
            style={{ backgroundColor: "#111827", color: "#ffffff" }}
          >
            {team.name}
          </option>
        ))}
      </select>

      <div className="flex gap-3">
        <button
          onClick={updateRider}
          className="px-4 py-3 rounded-2xl bg-emerald-500/25 hover:bg-emerald-500/35 border border-emerald-300/20 transition font-semibold"
        >
          Enregistrer
        </button>

        <button
          onClick={() => setEditingRiderId("")}
          className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 transition"
        >
          Annuler
        </button>
      </div>
    </div>
  </div>
)}

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
  onClick={() => startEditRider(rider)}
  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 transition"
>
  Modifier
</button>

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

        {tab === "teams" && (
  <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-6">
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <h2 className="text-2xl font-bold mb-4">Ajouter une équipe</h2>

      <div className="space-y-4">
        <input
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          placeholder="Nom de l’équipe"
          className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white"
        />

        <input
          value={teamShortName}
          onChange={(e) => setTeamShortName(e.target.value)}
          placeholder="Nom court"
          className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white"
        />

        <input
          value={teamCountry}
          onChange={(e) => setTeamCountry(e.target.value)}
          placeholder="Pays"
          className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white"
        />
        
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setTeamLogoFile(e.target.files?.[0] || null)}
          className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white"
        />

        <button
          onClick={createTeam}
          className="w-full px-4 py-3 rounded-2xl bg-indigo-500/30 hover:bg-indigo-500/45 border border-indigo-300/20 transition font-semibold"
        >
          Ajouter l’équipe
        </button>
      </div>
    </div>

    {editingTeamId && (
  <div className="rounded-3xl border border-white/10 bg-white/5 p-6 mt-6">
    <h2 className="text-2xl font-bold mb-4">Modifier l’équipe</h2>

    <div className="space-y-4">
      <input
        value={editTeamName}
        onChange={(e) => setEditTeamName(e.target.value)}
        placeholder="Nom de l’équipe"
        className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white"
      />

      <input
        value={editTeamShortName}
        onChange={(e) => setEditTeamShortName(e.target.value)}
        placeholder="Nom court"
        className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white"
      />

      <input
        value={editTeamCountry}
        onChange={(e) => setEditTeamCountry(e.target.value)}
        placeholder="Pays"
        className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white"
      />

      <div className="flex gap-3">
        <button
          onClick={updateTeam}
          className="px-4 py-3 rounded-2xl bg-emerald-500/25 hover:bg-emerald-500/35 border border-emerald-300/20 transition font-semibold"
        >
          Enregistrer
        </button>

        <button
          onClick={() => setEditingTeamId("")}
          className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 transition"
        >
          Annuler
        </button>
      </div>
    </div>
  </div>
)}

    <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <h2 className="text-2xl font-bold">Équipes existantes</h2>

        <input
          value={teamSearch}
          onChange={(e) => setTeamSearch(e.target.value)}
          placeholder="Rechercher une équipe..."
          className="rounded-xl border border-white/10 bg-white/5 p-3 text-white md:w-80"
        />
      </div>

      <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
        {filteredTeams.map((team) => (
          <div
            key={team.id}
            className="rounded-2xl border border-white/10 bg-white/5 p-4 flex items-center justify-between gap-4"
          >
          {team.logo_url && (
  <img
    src={team.logo_url}
    alt={team.name}
    className="h-10 w-10 object-contain rounded-lg bg-white/10 p-1"
  />
)}
            <div className="min-w-0">
              <div className="font-bold truncate">{team.name}</div>
              <div className="text-sm text-white/60">
                {team.short_name || "—"} • {team.country || "—"}
              </div>
            </div>
<div className="mt-3">
  <div className="text-xs text-white/50 mb-1">
    Coureurs rattachés : {team.riders?.length || 0}
  </div>

  {team.riders && team.riders.length > 0 ? (
    <div className="flex flex-wrap gap-2">
      {team.riders.map((rider) => (
        <span
          key={rider.id}
          className="text-xs px-2 py-1 rounded-full bg-white/10 border border-white/10 text-white/80"
        >
          {rider.short_name || rider.full_name}
        </span>
      ))}
    </div>
  ) : (
    <div className="text-xs text-white/40">
      Aucun coureur rattaché.
    </div>
  )}
</div>
<button
  onClick={() => startEditTeam(team)}
  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 transition"
>
  Modifier
</button>

            <button
              onClick={() => toggleTeamActive(team)}
              className={`px-3 py-2 rounded-xl border transition ${
                team.is_active
                  ? "bg-emerald-500/20 border-emerald-300/20"
                  : "bg-red-500/20 border-red-300/20"
              }`}
            >
              {team.is_active ? "Actif" : "Inactif"}
            </button>
          </div>
        ))}

        {filteredTeams.length === 0 && (
          <div className="text-white/60">Aucune équipe trouvée.</div>
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
            <div className="text-sm text-indigo-200">
  🚴 {group.races?.[0]?.count ?? 0} étape(s)
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
{tab === "gcResults" && (
  <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-6">
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <h2 className="text-2xl font-bold mb-4">🏆 Résultat classement général final</h2>

      <div className="space-y-4">
        <select
          value={selectedGcGroupId}
          onChange={(e) => {
  setSelectedGcGroupId(e.target.value)
  loadExistingGroupResult(e.target.value)
}}
          className="w-full rounded-xl border border-white/10 bg-slate-800 p-3 text-white"
        >
          <option value="" style={{ backgroundColor: "#111827", color: "#ffffff" }}>
            Choisir un groupe de courses
          </option>

          {raceGroups.map((group) => (
            <option
              key={group.id}
              value={group.id}
              style={{ backgroundColor: "#111827", color: "#ffffff" }}
            >
              {group.name} {group.year ? `(${group.year})` : ""}
            </option>
          ))}
        </select>
        {existingGroupResult ? (
  <div className="rounded-2xl border border-emerald-300/20 bg-emerald-500/10 p-3 text-sm text-emerald-100">
    ✅ Résultat CG déjà saisi. Tu peux le modifier puis réenregistrer.
  </div>
) : selectedGcGroupId ? (
  <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-white/70">
    Aucun résultat CG saisi pour ce groupe.
  </div>
) : null}

        <RiderAutocomplete
          label="🥇 Vainqueur final"
          placeholder="Chercher le vainqueur final"
          value={gcResFirst}
          selectedId={gcResFirstId}
          onValueChange={setGcResFirst}
          onSelect={(rider) => setGcResFirstId(rider?.id || null)}
          excludedIds={[gcResSecondId || "", gcResThirdId || ""].filter(Boolean)}
        />

        <RiderAutocomplete
          label="🥈 Deuxième final"
          placeholder="Chercher le deuxième"
          value={gcResSecond}
          selectedId={gcResSecondId}
          onValueChange={setGcResSecond}
          onSelect={(rider) => setGcResSecondId(rider?.id || null)}
          excludedIds={[gcResFirstId || "", gcResThirdId || ""].filter(Boolean)}
        />

        <RiderAutocomplete
          label="🥉 Troisième final"
          placeholder="Chercher le troisième"
          value={gcResThird}
          selectedId={gcResThirdId}
          onValueChange={setGcResThird}
          onSelect={(rider) => setGcResThirdId(rider?.id || null)}
          excludedIds={[gcResFirstId || "", gcResSecondId || ""].filter(Boolean)}
        />

        <RiderAutocomplete
          label="🇫🇷 Premier Français final"
          placeholder="Chercher le premier Français"
          value={gcResFirstFrench}
          selectedId={gcResFirstFrenchId}
          onValueChange={setGcResFirstFrench}
          onSelect={(rider) => setGcResFirstFrenchId(rider?.id || null)}
        />

        <button
          onClick={saveGroupResults}
          className="w-full px-4 py-3 rounded-2xl bg-yellow-500/25 hover:bg-yellow-500/35 border border-yellow-300/20 transition font-semibold"
        >
          Enregistrer le résultat CG final
        </button>
      </div>
    </div>

    <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <h2 className="text-2xl font-bold mb-4">Barème CG final</h2>

      <div className="space-y-3 text-white/75">
        <p>🥇 Vainqueur exact : 15 pts</p>
        <p>🥈 Deuxième exact : 10 pts</p>
        <p>🥉 Troisième exact : 8 pts</p>
        <p>🔁 Coureur dans le podium mais mal placé : 3 pts</p>
        <p>🇫🇷 Premier Français exact : 5 pts</p>
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