"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"
import AuthGuard from "@/components/AuthGuard"
import Link from "next/link"


export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [leagues, setLeagues] = useState<any[]>([])
  const [selectedLeague, setSelectedLeague] = useState<any>(null)
  const [races, setRaces] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [needsUsername, setNeedsUsername] = useState(false)
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [isOwner, setIsOwner] = useState(false)
  const [manageMode, setManageMode] = useState(false)
  const [allRaces, setAllRaces] = useState<any[]>([])
  const [raceRanking, setRaceRanking] = useState<any[]>([])
  const [pronoRace, setPronoRace] = useState<any>(null) // race sélectionnée pour prono
const [myPrediction, setMyPrediction] = useState<any>(null)
const [otherLeaguePredictions, setOtherLeaguePredictions] = useState<any[]>([])
const [pronoLoading, setPronoLoading] = useState(false)

const [p1, setP1] = useState("")
const [p2, setP2] = useState("")
const [p3, setP3] = useState("")
const [pF, setPF] = useState("")


  useEffect(() => {
    loadData()
  }, [])
  
  async function loadData() {
    setLoading(true)

    const { data: sessionRes } = await supabase.auth.getSession()
if (!sessionRes.session) {
  window.location.href = "/login"
  return
}

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setUser(user)

// récupérer profil
  const { data: profileData } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  setProfile(profileData)

  if (!profileData?.username) {
    setNeedsUsername(true)
    setLoading(false)
    return
  }

  
  // récupérer ligues
  const { data: memberships } = await supabase
    .from("league_members")
    .select(`
      league_id,
      leagues (
        id,
        name,
        image_url,
        status,
        launched_at,
        owner_id
      )
    `)
    .eq("user_id", user.id)
    

const userLeagues = memberships?.map((m: any) => m.leagues).filter(Boolean) || []
setLeagues(userLeagues)

  setLoading(false)
}
  async function saveUsername(username: string) {
  if (!user) return

  const { error } = await supabase
    .from("profiles")
    .update({ username })
    .eq("id", user.id)

  if (error) {
    alert("Pseudo déjà pris ou invalide")
  } else {
    setNeedsUsername(false)
    loadData()
  }
}
  async function handleLogout() {
  await supabase.auth.signOut()
  window.location.href = "/login"
}

  async function loadLeagueRaces(leagueId: string) {
  const { data, error } = await supabase
    .from("league_races")
    .select(`
      races (
        id,
        name,
        race_date,
        pronostic_deadline,
        logo_url
      )
    `)
    .eq("league_id", leagueId)

  if (error) {
    console.error(error)
    return
  }

  const leagueRaces = data?.map((r: any) => r.races).filter(Boolean) || []
  setRaces(leagueRaces)
}
  async function loadAllRaces() {
  const { data } = await supabase
    .from("races")
    .select("*")
    .order("race_date", { ascending: true })

  setAllRaces(data || [])
}
async function openProno(race: any) {
  if (!selectedLeague || !user) return
  setPronoLoading(true)
  setPronoRace(race)
  setOtherLeaguePredictions([])
  setMyPrediction(null)

  // 1) charger mon prono existant
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
  } else {
    setP1(""); setP2(""); setP3(""); setPF("")
  }

  // 2) si deadline passée → charger pronos des membres de la ligue uniquement
  const locked = race.pronostic_deadline && new Date() > new Date(race.pronostic_deadline)
  if (locked) {
    const { data: members } = await supabase
      .from("league_members")
      .select("user_id")
      .eq("league_id", selectedLeague.id)

    const memberIds = members?.map((m:any)=>m.user_id) || []

    if (memberIds.length > 0) {
      const { data: preds } = await supabase
        .from("predictions")
        .select(`
          user_id,
          first, second, third, first_french,
          profiles ( username )
        `)
        .eq("race_id", race.id)
        .in("user_id", memberIds)

      setOtherLeaguePredictions(preds || [])
    }
  }

  setPronoLoading(false)
}

async function saveProno() {
  if (!pronoRace || !user) return

  const locked = pronoRace.pronostic_deadline && new Date() > new Date(pronoRace.pronostic_deadline)
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
    const { error } = await supabase
      .from("predictions")
      .insert({ race_id: pronoRace.id, user_id: user.id, first: p1, second: p2, third: p3, first_french: pF })

    if (error) return alert(error.message)
    alert("Pronostic enregistré ✅")
  }

  // recharge pour être sûr
  await openProno(pronoRace)
}
async function loadLeaderboard(leagueId: string) {
  const { data, error } = await supabase
    .from("league_leaderboard")
    .select("*")
    .eq("league_id", leagueId)
    .order("total_points", { ascending: false })

  if (error) {
    console.error(error)
    return
  }

  setLeaderboard((data || []).map(p => ({ username: p.username, total: p.total_points })))
}

  async function loadGeneralRanking(leagueId: string) {
  const { data } = await supabase
    .from("league_general_ranking")
    .select("*")
    .eq("league_id", leagueId)
    .order("total_points", { ascending: false })

  setLeaderboard(data || [])
}
const myIndex = leaderboard.findIndex(p => p.user_id === user.id)

async function loadRaceRanking(leagueId: string, raceId: string) {
  const { data, error } = await supabase
    .from("league_race_ranking")
    .select("*")
    .eq("league_id", leagueId)
    .eq("race_id", raceId)
    .order("points", { ascending: false })

  if (error) {
    console.error(error)
    return
  }

  setRaceRanking(data || [])
}

async function createLeague() {
  const name = prompt("Nom de la ligue ?")
  if (!name) return

  const { data: userRes, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userRes.user) {
    alert("Tu dois être connecté")
    return
  }

  const ownerId = userRes.user.id

  const { data: league, error } = await supabase
    .from("leagues")
    .insert({
      name,
      owner_id: ownerId, // 👈 indispensable pour passer la RLS
    })
    .select()
    .single()

  if (error) {
    console.error(error)
    alert(error.message)
    return
  }

  // ajouter owner comme membre
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
  loadData()
}
async function launchLeague() {
  if (!selectedLeague) return

  // Vérifie qu'il y a au moins une course activée
  const { data: lr, error: lrErr } = await supabase
    .from("league_races")
    .select("race_id")
    .eq("league_id", selectedLeague.id)

  if (lrErr) {
    console.error(lrErr)
    alert(lrErr.message)
    return
  }

  if (!lr || lr.length === 0) {
    alert("Ajoute au moins une course avant de lancer la ligue.")
    return
  }

  // Update ligue -> active
  const { error } = await supabase
    .from("leagues")
    .update({
      status: "active",
      launched_at: new Date().toISOString(),
    })
    .eq("id", selectedLeague.id)

  if (error) {
    console.error(error)
    alert("Erreur launchLeague: " + error.message)
    return
  }

  // ✅ 2B : recharger selectedLeague (ICI)
  const { data: updatedLeague, error: reloadErr } = await supabase
    .from("leagues")
    .select("id,name,image_url,status,launched_at,owner_id")
    .eq("id", selectedLeague.id)
    .single()

  if (reloadErr) console.error(reloadErr)
  if (updatedLeague) setSelectedLeague(updatedLeague)

  alert("Ligue lancée ✅")
  await loadData()
}
  async function toggleRace(raceId: string, active: boolean) {
  if (!selectedLeague) return

  if (active) {
    await supabase
      .from("league_races")
      .delete()
      .eq("league_id", selectedLeague.id)
      .eq("race_id", raceId)
  } else {
    await supabase
      .from("league_races")
      .insert({
        league_id: selectedLeague.id,
        race_id: raceId
      })
  }

  await loadLeagueRaces(selectedLeague.id)
}
    async function joinLeague() {
  const code = prompt("Code de la ligue ?")
  if (!code || !user) return

  const { data: league } = await supabase
    .from("leagues")
    .select("id")
    .eq("code", code.toUpperCase())
    .single()

  if (!league) {
    alert("Ligue introuvable")
    return
  }

  const { error } = await supabase
    .from("league_members")
    .insert({
      league_id: league.id,
      user_id: user.id
    })

  if (error) alert(error.message)
  else {
    alert("Ligue rejointe !")
    loadData()
  }
}

  if (loading) return <div className="p-6">Chargement...</div>
  if (needsUsername) {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="bg-white p-8 rounded-xl shadow w-96">
        <h2 className="text-xl font-bold mb-4">
          Choisis ton pseudo
        </h2>

        <input
          type="text"
          placeholder="Pseudo unique"
          id="usernameInput"
          className="border p-2 w-full mb-4 rounded"
        />

        <button
          onClick={() => {
            const input = document.getElementById("usernameInput") as HTMLInputElement
            saveUsername(input.value)
          }}
          className="bg-blue-600 text-white w-full py-2 rounded"
        >
          Valider
        </button>
      </div>
    </div>
  )
}
  return (
  <AuthGuard>
  <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-fuchsia-950 text-white">
    <div className="max-w-6xl mx-auto p-6 md:p-10">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
      <div>
      <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
      ⚔️ PronoVélo
      </h1>
      <p className="text-white/70 mt-1">
      Bonjour <span className="font-semibold text-white">{profile?.username}</span> — choisis ta ligue et joue.
      </p>
      </div>
     <button
    onClick={handleLogout}
    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 transition"
  >
    🚪 Déconnexion
    </button>
<div className="flex flex-col sm:flex-row gap-3 mb-6">
  <button
    onClick={createLeague}
    className="flex-1 rounded-2xl px-4 py-3 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-300/20 transition text-white font-semibold"
  >
    ✨ Créer une ligue
  </button>

  <button
    onClick={joinLeague}
    className="flex-1 rounded-2xl px-4 py-3 bg-sky-500/15 hover:bg-sky-500/25 border border-sky-300/20 transition text-white font-semibold"
  >
    🧩 Rejoindre une ligue
  </button>
</div>
    
    </div>
      {/* Liste des ligues */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Mes Ligues</h2>

        {leagues.length === 0 && (
          <p className="mb-4">Tu n'as encore aucune ligue.</p>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {leagues.map((league) => (
            <div
              key={league.id}
              onClick={async () => {
  setSelectedLeague(league)
  setRaceRanking([])
  await loadLeagueRaces(league.id)
  await loadGeneralRanking(league.id)
  setManageMode(true)

  const { data: roleData } = await supabase
    .from("league_members")
    .select("role")
    .eq("league_id", league.id)
    .eq("user_id", user.id)
    .single()

  setIsOwner(roleData?.role === "owner")
}}
                className="group rounded-2xl p-4 cursor-pointer border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition shadow-lg shadow-black/20"
            >
                {league.image_url && (
    <img
      src={league.image_url}
      className="h-14 mx-auto object-contain mb-3 drop-shadow"
      alt={league.name}
    />
  )}
  <h3 className="text-center font-semibold">
    {league.name}
  </h3>
  <p className="text-center text-xs text-white/60 mt-1">
    Clique pour ouvrir
  </p>
</div>
          ))}

        </div>
      </div>
{leaderboard.length >= 3 && (
  <div className="grid grid-cols-3 gap-3 mb-6">
    <div className="rounded-2xl p-4 bg-white/5 border border-white/10 text-center">
      <div className="text-2xl">🥈</div>
      <div className="font-bold mt-1">{leaderboard[1].username}</div>
      <div className="text-white/70">{leaderboard[1].total_points} pts</div>
    </div>

    <div className="rounded-2xl p-4 bg-yellow-500/20 border border-yellow-300/20 text-center shadow-xl shadow-yellow-500/10">
      <div className="text-3xl">🥇</div>
      <div className="font-extrabold mt-1">{leaderboard[0].username}</div>
      <div className="text-white/80">{leaderboard[0].total_points} pts</div>
      <div className="text-xs text-white/70 mt-1">👑 Leader</div>
    </div>

    <div className="rounded-2xl p-4 bg-white/5 border border-white/10 text-center">
      <div className="text-2xl">🥉</div>
      <div className="font-bold mt-1">{leaderboard[2].username}</div>
      <div className="text-white/70">{leaderboard[2].total_points} pts</div>
    </div>
  </div>
)}

{leaderboard.length > 0 && (
 
 <div className="mt-8">
    <h3 className="text-xl font-bold mb-4">
      Classement général — {selectedLeague.name}
    </h3>
<div className="mt-2 text-sm text-white/70">
  Tu es {myIndex + 1}ᵉ sur {leaderboard.length}
</div>
<div className="rounded-2xl overflow-hidden border border-white/10 bg-white/5">
  {leaderboard.map((player, index) => (
    <div
      key={player.user_id}
      className="flex justify-between items-center px-4 py-3 border-b border-white/10"
    >
      <div className="flex items-center gap-3">
        <span className="w-7 text-white/70">{index + 1}.</span>
        <span className="font-semibold">{player.username}</span>
      </div>
      <span className="font-extrabold">{player.total_points} pts</span>
    </div>
  ))}
</div>
  </div>
)}
      {/* Courses de la ligue sélectionnée */}
      {selectedLeague && (
        <div>
          <div className="flex gap-3 mb-4">
  {isOwner && (
    <button
      onClick={async () => {
        await loadAllRaces()
        setManageMode(true)
      }}
      className="px-4 py-2 rounded-xl bg-purple-600 text-white"
    >
      Gérer les courses
    </button>
  )}

  {isOwner && selectedLeague?.status === "draft" && (
    <button
      onClick={launchLeague}
      className="px-4 py-2 rounded-xl bg-emerald-600 text-white"
    >
      ✅ Lancer la ligue
    </button>
  )}

  {selectedLeague?.status === "active" && (
    <div className="px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-300/20 text-emerald-100">
      ✅ Ligue active
    </div>
  )}
</div>
          {races.length === 0 && (
            <p>Aucune course active pour cette ligue.</p>
          )}
          

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
{races.map((race) => (
<div
  key={race.id}
  className="rounded-2xl p-4 border border-white/10 bg-white/5 hover:bg-white/10 transition shadow-lg shadow-black/20"
>
  <div className="flex items-start justify-between gap-3">
    <div className="min-w-0">
      <h3 className="text-lg font-bold truncate">{race.name}</h3>
      <p className="text-sm text-white/60">
        {race.race_date ? new Date(race.race_date).toLocaleDateString() : ""}
      </p>
    </div>

    {race.logo_url && (
      <img
        src={race.logo_url}
        className="h-10 w-16 object-contain"
        alt={race.name}
      />
    )}
  </div>
{new Date(race.pronostic_deadline) > new Date() ? (
  <span className="text-emerald-400 text-xs">🟢 Ouvert</span>
) : (
  <span className="text-red-400 text-xs">🔒 Fermé</span>
)}
  <div className="flex gap-2 mt-4">
<button
  onClick={() => openProno(race)}
  className="flex-1 text-center px-3 py-2 rounded-xl bg-indigo-500/30 hover:bg-indigo-500/45 border border-indigo-300/20 transition"
>
  🏁 Pronostiquer
</button>

    <button
      onClick={() => loadRaceRanking(selectedLeague.id, race.id)}
      className="px-3 py-2 rounded-xl bg-fuchsia-500/25 hover:bg-fuchsia-500/40 border border-fuchsia-300/20 transition"
    >
      🏆 Classement
    </button>
  </div>
</div>
))}
{raceRanking.length > 0 && (
  <div className="mt-8">
    <h3 className="text-xl font-bold mb-4">🏟️ Classement — Course</h3>

    <div className="rounded-2xl overflow-hidden border border-white/10 bg-white/5">
      {raceRanking.map((player, index) => (
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
  </div>
)}
{pronoRace && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
    <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-950/90 backdrop-blur p-6">
<div className="flex items-start justify-between gap-3 mb-4">
  <div className="flex items-start gap-3">
    {pronoRace.logo_url && (
      <img
        src={pronoRace.logo_url}
        alt={pronoRace.name}
        className="h-12 w-20 object-contain"
      />
    )}

    <div>
      <h3 className="text-xl font-bold">🏁 {pronoRace.name}</h3>

      <p className="text-sm text-white/70">
        📅 Course :{" "}
        {pronoRace.race_date
          ? new Date(pronoRace.race_date).toLocaleString()
          : "—"}
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
    className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 transition"
  >
    Fermer
  </button>
</div>

      {pronoLoading ? (
        <div className="text-white/70">Chargement…</div>
      ) : (
        <>
          {pronoRace.pronostic_deadline && new Date() > new Date(pronoRace.pronostic_deadline) ? (
            <>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="font-semibold mb-2">🔒 Pronostics fermés — pronos de la ligue</div>
                {otherLeaguePredictions.length === 0 ? (
                  <div className="text-white/60">Aucun pronostic trouvé.</div>
                ) : (
                  <div className="space-y-3">
                    {otherLeaguePredictions.map((p:any, idx:number) => (
                      <div key={idx} className="rounded-xl border border-white/10 bg-white/5 p-3">
                        <div className="font-bold">{p.profiles?.username || "Utilisateur"}</div>
                        <div className="text-sm text-white/80">🥇 {p.first}</div>
                        <div className="text-sm text-white/80">🥈 {p.second}</div>
                        <div className="text-sm text-white/80">🥉 {p.third}</div>
                        <div className="text-sm text-white/80">🇫🇷 {p.first_french}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3">
                <input className="rounded-xl border border-white/10 bg-white/5 p-3 text-white"
                  placeholder="1er" value={p1} onChange={(e)=>setP1(e.target.value)} />
                <input className="rounded-xl border border-white/10 bg-white/5 p-3 text-white"
                  placeholder="2e" value={p2} onChange={(e)=>setP2(e.target.value)} />
                <input className="rounded-xl border border-white/10 bg-white/5 p-3 text-white"
                  placeholder="3e" value={p3} onChange={(e)=>setP3(e.target.value)} />
                <input className="rounded-xl border border-white/10 bg-white/5 p-3 text-white"
                  placeholder="1er Français" value={pF} onChange={(e)=>setPF(e.target.value)} />
              </div>

              <button
                onClick={saveProno}
                className="mt-4 w-full px-4 py-3 rounded-2xl bg-indigo-500/30 hover:bg-indigo-500/45 border border-indigo-300/20 transition font-semibold"
              >
                {myPrediction ? "Modifier mon pronostic" : "Enregistrer mon pronostic"}
              </button>
            </>
          )}
        </>
      )}
    </div>
  </div>
)}
          </div>
        </div>
      )}
      
{manageMode && (
  <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/20">
    <div className="flex items-center justify-between mb-4">
      <h3 className="font-bold text-lg">⚙️ Gérer les courses</h3>
      <button
        onClick={() => setManageMode(false)}
        className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 transition"
      >
        Fermer
      </button>
    </div>

    <div className="grid md:grid-cols-2 gap-4">
      {allRaces.map((race) => {
        const active = races.find((r) => r.id === race.id)

        return (
          <div
            key={race.id}
            className="rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-bold truncate">{race.name}</div>
                <div className="text-sm text-white/60">
                  {race.race_date ? new Date(race.race_date).toLocaleDateString() : ""}
                </div>
              </div>

              {race.logo_url && (
                <img
                  src={race.logo_url}
                  alt={race.name}
                  className="h-10 w-16 object-contain"
                />
              )}
            </div>

            <button
              onClick={() => toggleRace(race.id, !!active)}
              className={`mt-4 w-full px-3 py-2 rounded-xl border transition font-semibold ${
                active
                  ? "bg-red-500/20 hover:bg-red-500/30 border-red-300/20"
                  : "bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-300/20"
              }`}
            >
              {active ? "Retirer de la ligue" : "Ajouter à la ligue"}
            </button>
          </div>
        )
      })}
    </div>
  </div>
)}

    </div>
  </div>
    </AuthGuard>
  )
}
