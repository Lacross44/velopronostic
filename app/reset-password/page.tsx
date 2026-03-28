"use client"

import { useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabaseClient"
import AuthShell from "@/components/AuthShell"

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [errorMsg, setErrorMsg] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setMessage("")
    setErrorMsg("")
    setLoading(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    })

    setLoading(false)

    if (error) {
      setErrorMsg(error.message)
      return
    }

    setMessage("Email envoyé. Vérifie ta boîte mail pour changer ton mot de passe.")
  }

  return (
    <AuthShell
      title="Mot de passe oublié"
      subtitle="Entre ton email pour recevoir un lien de réinitialisation."
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

      <form onSubmit={handleReset} className="space-y-4">
        <input
          type="email"
          placeholder="Email"
          className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-3 rounded-2xl bg-indigo-500/30 hover:bg-indigo-500/45 border border-indigo-300/20 transition font-semibold"
        >
          {loading ? "Envoi..." : "Envoyer le lien"}
        </button>
      </form>

      <div className="mt-5 text-sm text-white/75">
        <Link href="/login" className="underline hover:text-white">
          Retour à la connexion
        </Link>
      </div>
    </AuthShell>
  )
}