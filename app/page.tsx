"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    const run = async () => {
      const { data, error } = await supabase.auth.getSession()
      if (error) {
        console.error(error)
        router.replace("/login")
        return
      }
      router.replace(data.session ? "/dashboard" : "/login")
    }
    run()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p>Chargement…</p>
    </div>
  )
}