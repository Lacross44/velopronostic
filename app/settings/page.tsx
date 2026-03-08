"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabaseClient"

export default function SettingsPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)

  const [username, setUsername] = useState("")
  const [newPassword, setNewPassword] = useState("")

  const [message, setMessage] = useState("")
  const [errorMsg, setErrorMsg] = useState("")

  useEffect(() => {
    const init = async () => {
      const { data: userRes } = await supabase.auth.getUser()

      if (!userRes.user) {
        router.replace("/login")
        return
      }

      setUser(userRes.user)

      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userRes.user.id)
        .single()

      if (error) {
        console.error(error)
      }

      setProfile(profileData)
      setUsername(profileData?.username || "")
      setLoading(false)
    }

    init()
  }, [router])

  async function handleUpdateUsername(e: React.FormEvent) {
    e.preventDefault()
    setMessage("")
    setErrorMsg("")

    if (!user) return

    const cleanUsername = username.trim()

    if (!cleanUsername) {
      setErrorMsg("Le pseudo ne peut pas être vide.")
      return
    }

    const { error } = await supabase
      .from("profiles")
      .update({ username: cleanUsername })
      .eq("id", user.id)

    if (error) {
      setErrorMsg("Impossible de modifier le pseudo : " + error.message)
      return
    }

    setMessage("Pseudo mis à jour ✅")
    setProfile((prev: any) => ({ ...prev, username: cleanUsername }))
  }

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault()
    setMessage("")
    setErrorMsg("")

    if (!newPassword || newPassword.length < 6) {
      setErrorMsg("Le mot de passe doit contenir au moins 6 caractères.")
      return
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (error) {
      setErrorMsg("Impossible de modifier le mot de passe : " + error.message)
      return
    }

    setMessage("Mot de passe mis à jour ✅")
    setNewPassword("")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-fuchsia-950 text-white flex items-center justify-center">
        Chargement...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-fuchsia-950 text-white p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-extrabold">⚙️ Paramètres</h1>
            <p className="text-white/70 mt-1">
              Gère ton profil et la sécurité de ton compte.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 transition"
          >
            ← Retour dashboard
          </Link>
        </div>

        {(message || errorMsg) && (
          <div
            className={`mb-6 rounded-2xl p-4 border ${
              errorMsg
                ? "border-red-300/20 bg-red-500/10 text-red-200"
                : "border-emerald-300/20 bg-emerald-500/10 text-emerald-200"
            }`}
          >
            {errorMsg || message}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6">
          {/* Infos compte */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-xl font-bold mb-4">👤 Mon compte</h2>

            <div className="space-y-3 text-white/80">
              <div>
                <span className="text-white/60">Email</span>
                <div className="font-semibold">{user?.email}</div>
              </div>

              <div>
                <span className="text-white/60">Pseudo actuel</span>
                <div className="font-semibold">{profile?.username || "Non défini"}</div>
              </div>
            </div>
          </div>

          {/* Modifier pseudo */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-xl font-bold mb-4">✏️ Modifier mon pseudo</h2>

            <form onSubmit={handleUpdateUsername} className="space-y-4">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nouveau pseudo"
                className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white"
              />

              <button
                type="submit"
                className="px-4 py-3 rounded-2xl bg-indigo-500/30 hover:bg-indigo-500/45 border border-indigo-300/20 transition font-semibold"
              >
                Enregistrer le pseudo
              </button>
            </form>
          </div>

          {/* Modifier mot de passe */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-xl font-bold mb-4">🔐 Modifier mon mot de passe</h2>

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nouveau mot de passe"
                className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white"
              />

              <button
                type="submit"
                className="px-4 py-3 rounded-2xl bg-indigo-500/30 hover:bg-indigo-500/45 border border-indigo-300/20 transition font-semibold"
              >
                Mettre à jour le mot de passe
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}