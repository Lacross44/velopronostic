"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"

type League = {
  id: string
  name: string
  image_url?: string | null
  status?: "draft" | "active" | string | null
  launched_at?: string | null
  owner_id?: string | null
  code?: string | null
}

type Race = {
  id: string
  name: string
  race_date?: string | null
  pronostic_deadline?: string | null
  logo_url?: string | null
}

export default function DashboardPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)

  const [leagues, setLeagues] = useState<League[]>([])
  const [selectedLeague, setSelectedLeague] = useState<League | null>(null)
  const [isOwner, setIsOwner] = useState(false)

  const [races, setRaces] = useState<Race[]>([])
  const [showAllRaces, setShowAllRaces] = useState(true)

  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [raceRanking, setRaceRanking] = useState<any[]>([])
  const [raceRankingRaceId, setRaceRankingRaceId] = useState<string | null>(null)

  const [members, setMembers] = useState<{ id: string; username: string; role: String }[]>([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [membersOpen, setMembersOpen] = useState(false)

  // Manage races modal/section
  const [manageMode, setManageMode] = useState(false)
  const [allRaces, setAllRaces] = useState<Race[]>([])

  // Pronostic modal
  const [pronoRace, setPronoRace] = useState<Race | null>(null)
  const [pronoLoading, setPronoLoading] = useState(false)
  const [myPrediction, setMyPrediction] = useState<any>(null)
  const [otherLeaguePredictions, setOtherLeaguePredictions] = useState<any[]>([])

  const [p1, setP1] = useState("")
  const [p2, setP2] = useState("")
  const [p3, setP3] = useState("")
  const [pF, setPF] = useState("")

  // Username flow
  const [needsUsername, setNeedsUsername] = useState(false)

  //refonte classement course
  const [raceRankOpen, setRaceRankOpen] = useState(false)
const [raceRankRace, setRaceRankRace] = useState<any>(null)
const [raceResult, setRaceResult] = useState<any>(null)
const [racePredList, setRacePredList] = useState<any[]>([])
const [raceRankLoading, setRaceRankLoading] = useState(false)

  function toDate(d?: string | null) {
    return d ? new Date(d) : null
  }

  const now = useMemo(() => new Date(), []) // ok for UI; if you need live update, refresh with interval

  const sortedRaces = useMemo(() => {
    return [...races].sort((a, b) => {
      const da = toDate(a.race_date)?.getTime() ?? 0
      const db = toDate(b.race_date)?.getTime() ?? 0
      return da - db
    })
  }, [races])

  const nextRace = useMemo(() => {
    return (
      sortedRaces.find((r) => {
        const dl = toDate(r.pronostic_deadline)
        return dl ? dl > new Date() : false
      }) || null
    )
  }, [sortedRaces])

  const racesToDisplay = useMemo(() => {
    if (showAllRaces) return sortedRaces
    // fallback: show only last finished + next
    const n = new Date()
    const finished = sortedRaces.filter((r) => {
      const dl = toDate(r.pronostic_deadline)
      return dl ? dl <= n : false
    })
    const lastFinished = finished.length ? finished[finished.length - 1] : null
    return [lastFinished, nextRace].filter(Boolean) as Race[]
  }, [showAllRaces, sortedRaces, nextRace])

  useEffect(() => {
    const boot = async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        window.location.href = "/login"
        return
      }
      await loadData()
    }
    boot()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadData() {
    setLoading(true)

    const { data: userRes } = await supabase.auth.getUser()
    if (!userRes.user) {
      window.location.href = "/login"
      return
    }
    setUser(userRes.user)

    // profile
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userRes.user.id)
      .single()

    setProfile(profileData)

    if (!profileData?.username) {
      setNeedsUsername(true)
      setLoading(false)
      return
    } else {
      setNeedsUsername(false)
    }

    // leagues
    const { data: memberships, error: memErr } = await supabase
      .from("league_members")
      .select(
        `
        league_id,
        leagues (
          id,
          name,
          image_url,
          status,
          launched_at,
          owner_id,
          code
        )
      `
      )
      .eq("user_id", userRes.user.id)

    if (memErr) {
      console.error(memErr)
      setLeagues([])
    } else {
      const userLeagues = (memberships || [])
        .map((m: any) => m.leagues)
        .filter(Boolean)
      setLeagues(userLeagues)
    }

    setLoading(false)
  }

  async function loadLeagueMembers(leagueId: string) {
    setMembersLoading(true)

    const { data, error} = await supabase
      .from("league_members")
      .select(`
        role,
        profiles (
          id,
          username
        )
        `)
      .eq("league_id", leagueId)

    if (error) {
      console.error(error)
      setMembers([])
    } else {
      const cleaned =
      (data || [])
        .map((m: any) => ({
          id: m.profiles?.id,
          username: m.profiles?.username || "-",
          role: m.role || "member",
        }))
        .filter((m: any) => m.id)

        setMembers(cleaned)
    }

    setMembersLoading(false)
  }

  async function saveUsername(username: string) {
    if (!user?.id) return
    const { error } = await supabase.from("profiles").update({ username }).eq("id", user.id)
    if (error) alert("Pseudo déjà pris ou invalide")
    else {
      setNeedsUsername(false)
      loadData()
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = "/login"
  }

  async function selectLeague(league: League) {
    if (!user?.id) return

    setSelectedLeague(league)
    setManageMode(false)
    setRaceRanking([]) // ✅ important: avoid leftover ranking
    setPronoRace(null)

    await loadLeagueRaces(league.id)
    await loadGeneralRanking(league.id)
    await loadLeagueMembers(league.id)

    const { data: roleData } = await supabase
      .from("league_members")
      .select("role")
      .eq("league_id", league.id)
      .eq("user_id", user.id)
      .single()

    setIsOwner(roleData?.role === "owner")
  }

  async function loadLeagueRaces(leagueId: string) {
    const { data, error } = await supabase
      .from("league_races")
      .select(
        `
        races (
          id,
          name,
          race_date,
          pronostic_deadline,
          logo_url
        )
      `
      )
      .eq("league_id", leagueId)

    if (error) {
      console.error(error)
      setRaces([])
      return
    }

    const leagueRaces: Race[] = (data || []).map((r: any) => r.races).filter(Boolean)
    setRaces(leagueRaces)
  }

  async function loadAllRaces() {
    const { data, error } = await supabase.from("races").select("*").order("race_date", { ascending: true })
    if (error) console.error(error)
    setAllRaces((data || []) as any)
  }

  // ✅ RPC recommended
  async function loadGeneralRanking(leagueId: string) {
    const { data, error } = await supabase.rpc("get_league_general_ranking", { p_league_id: leagueId })
    if (error) {
      console.error("General ranking error:", error)
      setLeaderboard([])
      return
    }
    setLeaderboard(data || [])
  }

  async function openRaceRankingModal(race: any) {
  if (!selectedLeague) return

  setRaceRankOpen(true)
  setRaceRankRace(race)
  setRaceResult(null)
  setRacePredList([])
  setRaceRankLoading(true)

  // 1) Résultat officiel
  const { data: res, error: resErr } = await supabase
    .from("results")
    .select("first_place, second_place, third_place, first_french")
    .eq("race_id", race.id)
    .maybeSingle()

  if (resErr) console.error("results error", resErr)
  setRaceResult(res || null)

  // 2) Pronos des membres de la ligue + points
  const { data: preds, error: predErr } = await supabase
    .from("predictions")
    .select(`
      user_id,
      first,
      second,
      third,
      first_french,
      points,
      profiles (
        username
      )
    `)
    .eq("race_id", race.id)

  if (predErr) console.error("predictions error", predErr)

  // Facultatif : trier par points desc puis username
  const sorted = (preds || []).sort((a: any, b: any) => {
    const pa = a.points ?? 0
    const pb = b.points ?? 0
    if (pb !== pa) return pb - pa
    return (a.profiles?.username ?? "").localeCompare(b.profiles?.username ?? "")
  })

  setRacePredList(sorted)
  setRaceRankLoading(false)
}

async function loadRaceRanking(leagueId: string, raceId: string) {
  console.log("loadRaceRanking", { leagueId, raceId })

  const { data, error } = await supabase.rpc("get_league_race_ranking", {
    p_league_id: leagueId,
    p_race_id: raceId,
  })

  if (error) {
    console.error("Race ranking error:", error)
    alert("Erreur classement course: " + error.message)
    setRaceRanking([])
    setRaceRankingRaceId(raceId) // (si tu ajoutes ce state)
    return
  }

  console.log("Race ranking data", data)
  setRaceRanking(data || [])
  setRaceRankingRaceId(raceId) // (si tu ajoutes ce state)
}

  async function createLeague() {
    const name = prompt("Nom de la ligue ?")
    if (!name) return

    const { data: userRes } = await supabase.auth.getUser()
    if (!userRes.user) {
      alert("Tu dois être connecté")
      return
    }

    const ownerId = userRes.user.id

    const { data: league, error } = await supabase
      .from("leagues")
      .insert({ name, owner_id: ownerId, status: "draft" })
      .select()
      .single()

    if (error) {
      console.error(error)
      alert(error.message)
      return
    }

    const { error: memErr } = await supabase.from("league_members").insert({
      league_id: league.id,
      user_id: ownerId,
      role: "owner",
    })

    if (memErr) {
      console.error(memErr)
      alert(memErr.message)
      return
    }

    alert("Ligue créée ✅")
    await loadData()

    // Auto-select and open manage
    await selectLeague(league)
    await loadAllRaces()
    setManageMode(true)
  }

  async function joinLeague() {
    const code = prompt("Code de la ligue ?")
    if (!code || !user?.id) return

    const { data: league, error } = await supabase
      .from("leagues")
      .select("id,status")
      .eq("code", code.toUpperCase())
      .single()

    if (error || !league) {
      alert("Ligue introuvable")
      return
    }

    // Optional: prevent joining draft leagues
    // if (league.status !== "active") { alert("Cette ligue n'est pas encore active."); return }

    const { error: insErr } = await supabase.from("league_members").insert({
      league_id: league.id,
      user_id: user.id,
    })

    if (insErr) alert(insErr.message)
    else {
      alert("Ligue rejointe ✅")
      loadData()
    }
  }

  async function launchLeague() {
    if (!selectedLeague) return

    const { data: lr, error: lrErr } = await supabase
      .from("league_races")
      .select("race_id")
      .eq("league_id", selectedLeague.id)

    if (lrErr) {
      alert(lrErr.message)
      return
    }

    if (!lr || lr.length === 0) {
      alert("Ajoute au moins une course avant de lancer la ligue.")
      return
    }

    const { error } = await supabase
      .from("leagues")
      .update({ status: "active", launched_at: new Date().toISOString() })
      .eq("id", selectedLeague.id)

    if (error) {
      console.error(error)
      alert("Erreur launchLeague: " + error.message)
      return
    }

    // Reload selectedLeague
    const { data: updatedLeague } = await supabase
      .from("leagues")
      .select("id,name,image_url,status,launched_at,owner_id,code")
      .eq("id", selectedLeague.id)
      .single()

    if (updatedLeague) setSelectedLeague(updatedLeague as any)
    alert("Ligue lancée ✅")
    await loadData()
  }

  // ✅ Prevent changes if league is active
  async function toggleRace(raceId: string, active: boolean) {
    if (!selectedLeague) return

    if (selectedLeague.status === "active") {
      alert("La ligue est active : impossible de modifier les courses.")
      return
    }

    if (active) {
      await supabase.from("league_races").delete().eq("league_id", selectedLeague.id).eq("race_id", raceId)
    } else {
      await supabase.from("league_races").insert({ league_id: selectedLeague.id, race_id: raceId })
    }

    await loadLeagueRaces(selectedLeague.id)
  }

  async function shareLeagueCode() {
    if (!selectedLeague?.code) return
    const text = `Rejoins ma ligue "${selectedLeague.name}" sur Velopronostic : code ${selectedLeague.code}`
    try {
      await navigator.clipboard.writeText(text)
      alert("Message copié ✅")
    } catch {
      alert(`Code ligue : ${selectedLeague.code}`)
    }
  }
  async function deleteLeague() {
  if (!selectedLeague) return
  const ok = confirm(`Supprimer la ligue "${selectedLeague.name}" ?`)
  if (!ok) return

  // 1) Supprimer les liaisons courses
  const { error: lrErr } = await supabase
    .from("league_races")
    .delete()
    .eq("league_id", selectedLeague.id)
  if (lrErr) return alert(lrErr.message)

  // 2) Supprimer les membres
  const { error: lmErr } = await supabase
    .from("league_members")
    .delete()
    .eq("league_id", selectedLeague.id)
  if (lmErr) return alert(lmErr.message)

  // 3) Supprimer la ligue
  const { error: lErr } = await supabase
    .from("leagues")
    .delete()
    .eq("id", selectedLeague.id)
  if (lErr) return alert(lErr.message)

  alert("Ligue supprimée ✅")
  setSelectedLeague(null)
  await loadData()
}

  async function openProno(race: Race) {
    if (!selectedLeague) {
      alert("Aucune ligue sélectionnée")
      return
    }
    if (!user?.id) {
      alert("Utilisateur non connecté")
      return
    }

    setPronoLoading(true)
    setPronoRace(race)
    setMyPrediction(null)
    setOtherLeaguePredictions([])
    setP1("")
    setP2("")
    setP3("")
    setPF("")

    const { data: existing } = await supabase
      .from("predictions")
      .select("*")
      .eq("race_id", race.id)
      .eq("user_id", user.id)
      .single()

    if (existing) {
      setMyPrediction(existing)
      setP1(existing.first || "")
      setP2(existing.second || "")
      setP3(existing.third || "")
      setPF(existing.first_french || "")
    }

    const deadline = toDate(race.pronostic_deadline)
    const locked = deadline ? deadline <= new Date() : false

    if (locked) {
      // only league members predictions
      const { data: members } = await supabase
        .from("league_members")
        .select("user_id")
        .eq("league_id", selectedLeague.id)

      const memberIds = members?.map((m: any) => m.user_id) || []

      if (memberIds.length) {
        const { data: preds } = await supabase
          .from("predictions")
          .select(
            `
            user_id,
            first, second, third, first_french,
            profiles ( username )
          `
          )
          .eq("race_id", race.id)
          .in("user_id", memberIds)

        setOtherLeaguePredictions(preds || [])
      }
    }

    setPronoLoading(false)
  }

  async function saveProno() {
    if (!pronoRace || !selectedLeague || !user?.id) return

    // Only allow for nextRace
    if (nextRace?.id !== pronoRace.id) {
      alert("Tu ne peux pronostiquer que la prochaine course.")
      return
    }

    const deadline = toDate(pronoRace.pronostic_deadline)
    const locked = deadline ? deadline <= new Date() : false
    if (locked) {
      alert("Pronostics fermés")
      return
    }

    if (!p1 || !p2 || !p3) {
      alert("Merci de remplir le top 3")
      return
    }
    if (p1 === p2 || p1 === p3 || p2 === p3) {
      alert("Pas de doublons dans le top 3")
      return
    }

    if (myPrediction) {
      const { error } = await supabase
        .from("predictions")
        .update({ first: p1, second: p2, third: p3, first_french: pF })
        .eq("id", myPrediction.id)

      if (error) return alert(error.message)
      alert("Pronostic modifié ✅")
    } else {
      const { error } = await supabase.from("predictions").insert({
        race_id: pronoRace.id,
        user_id: user.id,
        first: p1,
        second: p2,
        third: p3,
        first_french: pF,
      })

      if (error) return alert(error.message)
      alert("Pronostic enregistré ✅")
    }

    await openProno(pronoRace)
  }

  // ----- UI states -----
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Chargement…</p>
      </div>
    )
  }

  if (needsUsername) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-fuchsia-950 text-white flex items-center justify-center p-6">
        <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-bold mb-3">Choisis ton pseudo</h2>
          <input
            id="usernameInput"
            className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white"
            placeholder="Pseudo unique"
          />
          <button
            onClick={() => {
              const input = document.getElementById("usernameInput") as HTMLInputElement
              saveUsername(input.value)
            }}
            className="mt-4 w-full rounded-2xl px-4 py-3 bg-indigo-500/30 hover:bg-indigo-500/45 border border-indigo-300/20 transition font-semibold"
          >
            Valider
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-fuchsia-950 text-white">
      <div className="max-w-6xl mx-auto p-6 md:p-10">
        {/* Header */}
<div className="mb-8">
  <div className="grid grid-cols-1 xl:grid-cols-[260px_1fr_auto] gap-4 items-start">
    
    {/* Bloc logo / titre */}
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-center gap-3">
        <div className="text-3xl">🚴</div>
        <div>
          <div className="flex items-center gap-3">
  
  <img
    src="/images/logo-velopronostic.png"
    alt="Logo Velopronostic"
    className="h-12 w-12 object-contain"
  />

  <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
    Velopronostic
  </h1>

</div>
          <p className="text-sm text-white/70 mt-1">
            Bonjour <span className="font-semibold text-white">{profile?.username}</span>
          </p>
        </div>
      </div>
    </div>

    {/* Bloc règles */}
<div className="rounded-2xl border border-white/10 bg-white/5 p-5">
  <h2 className="font-bold text-lg mb-3">📜 Règles du jeu</h2>

  <div className="text-sm text-white/80 space-y-1">
    <p>Pronostique les prochaines courses avant la deadline !</p>
    <p>Barème : </p>
    <p>Vainqueur = 5 pts • 2e = 4pts • 3e = 3pts • 1er Français = 2 pts</p>
    <p>+1 pt si un coureur du top 3 est trouvé mais mal placé.</p>
    <p>Après la deadline, Pronos verrouillés et visibles par tous.</p>
  </div>
</div>

    {/* Bloc bouton déconnexion */}
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 flex xl:block justify-end">
      <button
        onClick={handleLogout}
        className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 transition w-full xl:w-auto"
      >
        🚪 Déconnexion
      </button>
    </div>
  </div>
</div>

        {/* League actions */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <button
            onClick={createLeague}
            className="flex-1 rounded-2xl px-4 py-3 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-300/20 transition font-semibold"
          >
            ✨ Créer une ligue
          </button>
          <button
            onClick={joinLeague}
            className="flex-1 rounded-2xl px-4 py-3 bg-sky-500/15 hover:bg-sky-500/25 border border-sky-300/20 transition font-semibold"
          >
            🧩 Rejoindre une ligue
          </button>
        </div>

        {/* Leagues */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-3">Mes ligues</h2>

          {leagues.length === 0 ? (
            <p className="text-white/70">Tu n’as encore aucune ligue.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {leagues.map((league) => (
                <div
                  key={league.id}
                  onClick={() => selectLeague(league)}
                  className="rounded-2xl p-4 cursor-pointer border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition shadow-lg shadow-black/20"
                >
                  {league.image_url && (
                    <img src={league.image_url} className="h-12 mx-auto object-contain mb-2" alt={league.name} />
                  )}
                  <h3 className="text-center font-semibold">{league.name}</h3>
                  <div className="flex justify-center mt-2">
                    <span
                      className={`text-xs px-2 py-1 rounded-full border ${
                        league.status === "active"
                          ? "bg-emerald-500/20 border-emerald-300/20 text-emerald-100"
                          : "bg-yellow-500/20 border-yellow-300/20 text-yellow-100"
                      }`}
                    >
                      {league.status === "active" ? "✅ Active" : "📝 Brouillon"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected league */}
        {selectedLeague && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/20">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h2 className="text-2xl font-extrabold">{selectedLeague.name}</h2>
                {selectedLeague.code && (
                  <p className="text-sm text-white/70 mt-1">
                    Code ligue : <span className="font-bold text-white">{selectedLeague.code}</span>
                  </p>
                )}
              </div>


              <div className="flex flex-wrap gap-2">
                {isOwner && selectedLeague.code && (
                  <button
                    onClick={shareLeagueCode}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 transition"
                  >
                    🔗 Partager le code
                  </button>
                )}

                {isOwner && selectedLeague.status === "draft" && (
                  <>
                    <button
                      onClick={async () => {
                        await loadAllRaces()
                        setManageMode(true)
                      }}
                      className="px-4 py-2 rounded-xl bg-fuchsia-500/25 hover:bg-fuchsia-500/40 border border-fuchsia-300/20 transition"
                    >
                      ⚙️ Gérer les courses
                    </button>

                    <button
                      onClick={launchLeague}
                      className="px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-300/20 transition font-semibold"
                    >
                      ✅ Lancer la ligue
                    </button>
                  </>
                )}
                {isOwner && (
  <button
    onClick={deleteLeague}
    className="px-4 py-2 rounded-xl bg-red-500/30 hover:bg-red-500/45 border border-red-300/20 transition"
  >
    🗑️ Supprimer la ligue
  </button>
)}

                {isOwner && selectedLeague.status === "active" && (
                  <div className="px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-300/20 text-emerald-100">
                    ✅ Ligue active (courses verrouillées)
                  </div>
                )}
              </div>
            </div>
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
  <button
    onClick={() => setMembersOpen((v) => !v)}
    className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition"
  >
    <span className="font-semibold">👥 {members.length} joueur(s)</span>
    <span className="text-white/70">{membersOpen ? "▲" : "▼"}</span>
  </button>

  {membersOpen && (
    <div className="border-t border-white/10">
      {membersLoading ? (
        <div className="px-4 py-3 text-white/70">Chargement…</div>
      ) : members.length === 0 ? (
        <div className="px-4 py-3 text-white/70">Aucun membre.</div>
      ) : (
        <div className="max-h-56 overflow-y-auto">
          {members
            .slice()
            .sort((a, b) => (a.role === "owner" ? -1 : 1))
            .map((m) => (
              <div
                key={m.id}
                className="flex justify-between px-4 py-3 border-b border-white/10"
              >
                <span className="font-semibold">{m.username}</span>
                <span className="text-sm text-white/70">
                  {m.role === "owner" ? "👑 Admin" : "Membre"}
                </span>
              </div>
            ))}
        </div>
      )}
    </div>
  )}
</div>
                        {/* General ranking */}
<div className="mt-8">
  <h3 className="text-lg font-bold mb-3">🏆 Classement général</h3>

  {leaderboard.length === 0 ? (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white/70">
      Classement disponible après la saisie des résultats.
    </div>
  ) : (
    <>
      {leaderboard.length >= 3 && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
            <div className="text-2xl mb-1">🥈</div>
            <div className="font-bold truncate">{leaderboard[1].username}</div>
            <div className="text-white/70">{leaderboard[1].total_points} pts</div>
          </div>

          <div className="rounded-2xl border border-yellow-300/20 bg-yellow-500/15 p-4 text-center shadow-lg">
            <div className="text-3xl mb-1">🥇</div>
            <div className="font-extrabold truncate">{leaderboard[0].username}</div>
            <div className="text-white/80">{leaderboard[0].total_points} pts</div>
            <div className="text-xs text-yellow-100/80 mt-1">Leader de la ligue</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
            <div className="text-2xl mb-1">🥉</div>
            <div className="font-bold truncate">{leaderboard[2].username}</div>
            <div className="text-white/70">{leaderboard[2].total_points} pts</div>
          </div>
        </div>
      )}

      <div className="rounded-2xl overflow-hidden border border-white/10 bg-white/5">
        {leaderboard.map((player: any, index: number) => {
          const isLast = index === leaderboard.length - 1
          const isFirst = index === 0
          const isMe = player.user_id === user?.id

          return (
            <div
              key={player.user_id ?? index}
              className={`flex justify-between items-center px-4 py-3 border-b border-white/10 ${
                isMe ? "bg-indigo-500/10" : ""
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-8 text-white/70">
                  {isFirst ? "👑" : isLast ? "🛞" : `${index + 1}.`}
                </span>

                <span className={`truncate ${isMe ? "font-extrabold text-indigo-200" : "font-semibold"}`}>
                  {player.username}
                </span>

                {isLast && (
                  <span className="text-xs px-2 py-1 rounded-full bg-red-500/15 border border-red-300/20 text-red-200">
                    Lanterne rouge 🚲
                  </span>
                )}
              </div>

              <span className="font-extrabold shrink-0">
                {player.total_points} pts
              </span>
            </div>
          )
        })}
      </div>
    </>
  )}
</div>
            {/* Race ranking */}
{raceRankingRaceId && (
  <div className="mt-8">
    <h3 className="text-lg font-bold mb-3">🏟️ Classement — course</h3>

    {raceRanking.length === 0 ? (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white/70">
        Classement disponible après saisie des résultats et recalcul.
      </div>
    ) : (
      <div className="rounded-2xl overflow-hidden border border-white/10 bg-white/5">
        {raceRanking.map((player: any, index: number) => (
          <div
            key={player.user_id ?? index}
            className="flex justify-between items-center px-4 py-3 border-b border-white/10"
          >
            <span className="font-semibold">
              {index + 1}. {player.username}
            </span>
            <span className="font-extrabold">{player.points} pts</span>
          </div>
        ))}
      </div>
    )}
  </div>
)}
            {/* Courses list */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold">📅 Courses de la ligue</h3>

                <button
                  onClick={() => setShowAllRaces((v) => !v)}
                  className="text-sm px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 transition"
                >
                  {showAllRaces ? "Réduire" : `Voir toutes (${sortedRaces.length})`}
                </button>
              </div>

              {racesToDisplay.length === 0 ? (
                <p className="text-white/70">Aucune course active pour cette ligue.</p>
              ) : (
                <div className="space-y-2">
                  {racesToDisplay.map((race) => {
                    const deadline = toDate(race.pronostic_deadline)
                    const isFinished = deadline ? deadline <= new Date() : false
                    const isNext = nextRace?.id === race.id

                    return (
                      <div
                        key={race.id}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {race.logo_url && (
                            <img src={race.logo_url} alt={race.name} className="h-9 w-14 object-contain" />
                          )}
                          <div className="min-w-0">
                            <div className="font-semibold truncate">{race.name}</div>
                            <div className="text-sm text-white/60">
                              {race.race_date ? new Date(race.race_date).toLocaleDateString() : "—"}
                              {" • "}
                              Deadline :{" "}
                              {race.pronostic_deadline ? new Date(race.pronostic_deadline).toLocaleString() : "—"}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {isNext ? (
  <button
    onClick={() => openProno(race)}
    className="px-3 py-2 rounded-xl bg-indigo-500/30 hover:bg-indigo-500/45 border border-indigo-300/20 transition"
  >
    🏁 Pronostiquer
  </button>
) : isFinished ? (
  <>
    <button
      onClick={() => openRaceRankingModal(race)}
      className="px-3 py-2 rounded-xl bg-fuchsia-500/25 hover:bg-fuchsia-500/40 border border-fuchsia-300/20 transition"
    >
      🏆 Classement
    </button>

    <button
      onClick={() => openProno(race)}
      className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 transition p-6 flex flex-col max-h-[85vh]"
    >
      👀 Pronos
    </button>
  </>
) : (
  <span className="text-xs px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60">
    🔒 Pas encore
  </span>
)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Manage courses */}
            {manageMode && (
              <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg">⚙️ Gérer les courses</h3>
                  <button
                    onClick={() => setManageMode(false)}
                    className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 transition"
                  >
                    Fermer
                  </button>
                </div>

                {selectedLeague.status === "active" ? (
                  <div className="text-white/70">
                    Ligue active : les courses sont verrouillées.
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {allRaces.map((race) => {
                      const active = races.find((r) => r.id === race.id)
                      const dl = toDate(race.pronostic_deadline)
                      const isPast = dl ? dl <= new Date() : false
                      return (
                        <div
                          key={race.id}
                          className="rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-bold truncate">{race.name}</div>
                              <div className="text-sm text-white/60">
                                {race.race_date ? new Date(race.race_date).toLocaleDateString() : "—"}
                              </div>
                            </div>

                            {race.logo_url && (
                              <img src={race.logo_url} alt={race.name} className="h-10 w-16 object-contain" />
                            )}
                          </div>

                          <button
  disabled={isPast || selectedLeague?.status === "active"}
  onClick={() => {
    if (isPast) return
    toggleRace(race.id, !!active)
  }}
  className={`px-3 py-1 rounded ${
    isPast
      ? "bg-white/5 text-white/40 border border-white/10 cursor-not-allowed"
      : active
        ? "bg-red-500 text-white"
        : "bg-green-500 text-white"
  }`}
>
  {isPast ? "Terminée" : active ? "Retirer" : "Ajouter"}
</button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
{raceRankOpen && raceRankRace && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
    <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-slate-950/95 backdrop-blur p-6 flex flex-col max-h-[85vh]">

      {/* Header sticky */}
      <div className="sticky top-0 bg-slate-950/95 z-10 pb-3 mb-3 border-b border-white/10">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            {raceRankRace.logo_url && (
              <img
                src={raceRankRace.logo_url}
                alt={raceRankRace.name}
                className="h-12 w-20 object-contain shrink-0"
              />
            )}
            <div className="min-w-0">
              <h3 className="text-xl font-bold truncate">🏆 Classement — {raceRankRace.name}</h3>
              <p className="text-sm text-white/70">
                📅 {raceRankRace.race_date ? new Date(raceRankRace.race_date).toLocaleString() : "—"}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setRaceRankOpen(false)
              setRaceRankRace(null)
              setRaceResult(null)
              setRacePredList([])
            }}
            className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 transition shrink-0"
          >
            Fermer
          </button>
        </div>
      </div>

      {/* Content scrollable */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-4">
        {raceRankLoading ? (
          <div className="text-white/70">Chargement…</div>
        ) : (
          <>
            {/* Résultat officiel */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="font-semibold mb-2">✅ Résultat officiel</div>

              {!raceResult ? (
                <div className="text-white/60">
                  Résultat non saisi (va sur /admin pour l’ajouter).
                </div>
              ) : (
                <div className="space-y-1 text-white/80">
                  <div>🥇 {raceResult.first_place || "—"}</div>
                  <div>🥈 {raceResult.second_place || "—"}</div>
                  <div>🥉 {raceResult.third_place || "—"}</div>
                  <div>🇫🇷 {raceResult.first_french || "—"}</div>
                </div>
              )}
            </div>

            {/* Récap pronos + points */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold">👥 Pronostics & points</div>
                <div className="text-sm text-white/60">{racePredList.length} joueur(s)</div>
              </div>

              {racePredList.length === 0 ? (
                <div className="text-white/60">Aucun pronostic trouvé.</div>
              ) : (
                <div className="space-y-3">
                  {racePredList.map((p: any, idx: number) => (
                    <div key={idx} className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <div className="flex items-center justify-between">
                        <div className="font-bold">{p.profiles?.username || "Utilisateur"}</div>
                        <div className="font-extrabold">{p.points ?? 0} pts</div>
                      </div>

                      <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-1 text-sm text-white/80">
                        <div>🥇 {p.first || "—"}</div>
                        <div>🥈 {p.second || "—"}</div>
                        <div>🥉 {p.third || "—"}</div>
                        <div>🇫🇷 {p.first_french || "—"}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  </div>
)}
        {/* Pronostic modal */}
        {pronoRace && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
    <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-950/95 backdrop-blur p-6 flex flex-col max-h-[85vh]">

      {/* ✅ HEADER STICKY (unique) */}
      <div className="sticky top-0 bg-slate-950/95 z-10 pb-3 mb-3 border-b border-white/10">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            {pronoRace.logo_url && (
              <img
                src={pronoRace.logo_url}
                alt={pronoRace.name}
                className="h-12 w-20 object-contain shrink-0"
              />
            )}

            <div className="min-w-0">
              <h3 className="text-xl font-bold truncate">🏁 {pronoRace.name}</h3>
              <p className="text-sm text-white/70">
                📅 Course :{" "}
                {pronoRace.race_date ? new Date(pronoRace.race_date).toLocaleString() : "—"}
              </p>
              <p className="text-sm text-white/70">
                ⏳ Deadline :{" "}
                {pronoRace.pronostic_deadline
                  ? new Date(pronoRace.pronostic_deadline).toLocaleString()
                  : "—"}
              </p>
            </div>
          </div>

          <button
            onClick={() => setPronoRace(null)}
            className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 transition shrink-0"
          >
            Fermer
          </button>
        </div>
      </div>

      {/* ✅ CONTENU SCROLLABLE (le seul endroit qui scroll) */}
      <div className="flex-1 overflow-y-auto pr-1">
        {pronoLoading ? (
          <div className="text-white/70">Chargement…</div>
        ) : (
          (() => {
            const dl = toDate(pronoRace.pronostic_deadline)
            const locked = dl ? dl <= new Date() : false

            if (locked) {
              return (
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="font-semibold mb-2">
                    🔒 Pronostics fermés — pronos de la ligue
                  </div>

                  {otherLeaguePredictions.length === 0 ? (
                    <div className="text-white/60">Aucun pronostic trouvé.</div>
                  ) : (
                    <div className="space-y-3">
                      {otherLeaguePredictions.map((p: any, idx: number) => (
                        <div key={idx} className="rounded-xl border border-white/10 bg-white/5 p-3">
                          <div className="font-bold">
                            {p.profiles?.username || "Utilisateur"}
                          </div>
                          <div className="text-sm text-white/80">🥇 {p.first}</div>
                          <div className="text-sm text-white/80">🥈 {p.second}</div>
                          <div className="text-sm text-white/80">🥉 {p.third}</div>
                          <div className="text-sm text-white/80">🇫🇷 {p.first_french}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            }

            return (
              <div>
                <div className="grid grid-cols-1 gap-3">
                  <input
                    className="rounded-xl border border-white/10 bg-white/5 p-3 text-white"
                    placeholder="1er"
                    value={p1}
                    onChange={(e) => setP1(e.target.value)}
                  />
                  <input
                    className="rounded-xl border border-white/10 bg-white/5 p-3 text-white"
                    placeholder="2e"
                    value={p2}
                    onChange={(e) => setP2(e.target.value)}
                  />
                  <input
                    className="rounded-xl border border-white/10 bg-white/5 p-3 text-white"
                    placeholder="3e"
                    value={p3}
                    onChange={(e) => setP3(e.target.value)}
                  />
                  <input
                    className="rounded-xl border border-white/10 bg-white/5 p-3 text-white"
                    placeholder="1er Français"
                    value={pF}
                    onChange={(e) => setPF(e.target.value)}
                  />
                </div>

                <button
                  onClick={saveProno}
                  className="mt-4 w-full px-4 py-3 rounded-2xl bg-indigo-500/30 hover:bg-indigo-500/45 border border-indigo-300/20 transition font-semibold"
                >
                  {myPrediction ? "Modifier mon pronostic" : "Enregistrer mon pronostic"}
                </button>

                {nextRace?.id !== pronoRace.id && (
                  <p className="mt-3 text-sm text-white/60">
                    Tu ne peux pronostiquer que la prochaine course.
                  </p>
                )}
              </div>
            )
          })()
        )}
      </div>
    </div>
  </div>
)}
      </div>
    </div>
  )
}