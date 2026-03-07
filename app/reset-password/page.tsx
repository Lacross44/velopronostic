"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabaseClient"
import AuthShell from "@/components/AuthShell"

export default function RegisterPage() {
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [username, setUsername] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [errorMsg, setErrorMsg] = useState("")

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.replace("/dashboard")
    })
  }, [router])

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErrorMsg("")
    setMessage("")

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
        data: {
          username: username.trim(),
        },
      },
    })

    if (error) {
      setLoading(false)
      setErrorMsg(error.message)
      return
    }

    // si l'user est déjà dispo, on complète profiles
    const userId = data.user?.id
    if (userId) {
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert(
          {
            id: userId,
            username: username.trim(),
          },
          { onConflict: "id" }
        )

      if (profileError) {
        console.error(profileError)
      }
    }

    setLoading(false)
    setMessage(
      "Compte créé ! Vérifie ta boîte mail et clique sur le lien de confirmation avant de te connecter."
    )
  }

  return (
    <AuthShell
      title="Créer un compte"
      subtitle="Choisis ton pseudo et rejoins l’aventure PronosVélo."
    >
      {message && (
        <div className="mb-4 rounded-xl border border-emerald-300/20 bg-emerald-500/10 p-3 text-emerald-200">
          {message}
        </div>
      )}

      {errorMsg && (
        <div className="mb-4 rounded-xl border border-red-300/20 bg-red-500/10 p-3 text-red-200">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleRegister} className="space-y-4">
        <input
          type="text"
          placeholder="Pseudo"
          className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <input
          type="email"
          placeholder="Email"
          className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Mot de passe"
          className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-3 rounded-2xl bg-indigo-500/30 hover:bg-indigo-500/45 border border-indigo-300/20 transition font-semibold"
        >
          {loading ? "Création..." : "Créer mon compte"}
        </button>
      </form>

      <div className="mt-5 text-sm text-white/75">
        Déjà un compte ?{" "}
        <Link href="/login" className="underline hover:text-white">
          Se connecter
        </Link>
      </div>
    </AuthShell>
  )
}