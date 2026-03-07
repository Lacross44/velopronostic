"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabaseClient"
import AuthShell from "@/components/AuthShell"

export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [errorMsg, setErrorMsg] = useState("")

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.replace("/dashboard")
    })
  }, [router])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErrorMsg("")
    setMessage("")

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setLoading(false)

    if (error) {
      setErrorMsg(error.message)
      return
    }

    router.replace("/dashboard")
  }

  async function resendConfirmation() {
    if (!email) {
      setErrorMsg("Entre d'abord ton email pour renvoyer le lien.")
      return
    }

    setErrorMsg("")
    setMessage("")

    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
      },
    })

    if (error) {
      setErrorMsg(error.message)
      return
    }

    setMessage("Email de confirmation renvoyé. Pense à vérifier tes spams.")
  }

  return (
    <AuthShell
      title="Connexion"
      subtitle="Connecte-toi pour accéder à tes ligues et à tes pronostics."
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

      <form onSubmit={handleLogin} className="space-y-4">
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
          {loading ? "Connexion..." : "Se connecter"}
        </button>
      </form>

      <div className="mt-5 flex flex-col gap-3 text-sm text-white/75">
        <button
          onClick={resendConfirmation}
          className="text-left underline hover:text-white"
        >
          Renvoyer l’email de confirmation
        </button>

        <Link href="/reset-password" className="underline hover:text-white">
          Mot de passe oublié ?
        </Link>

        <p>
          Pas encore de compte ?{" "}
          <Link href="/register" className="underline hover:text-white">
            Créer un compte
          </Link>
        </p>
      </div>
    </AuthShell>
  )
}