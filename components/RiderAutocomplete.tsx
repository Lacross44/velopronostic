"use client"

import { useEffect, useRef, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

type Rider = {
  id: string
  full_name: string
  short_name?: string | null
  nationality?: string | null
  team?: string | null
  team_id?: string | null
  is_active?: boolean | null
  teams?: {
    name: string
    short_name?: string | null
  }[] | null
}

type RiderAutocompleteProps = {
  label?: string
  placeholder?: string
  value: string
  selectedId: string | null
  onValueChange: (value: string) => void
  onSelect: (rider: Rider | null) => void
  excludedIds?: string[]
}

export default function RiderAutocomplete({
  label,
  placeholder = "Rechercher un coureur",
  value,
  selectedId,
  onValueChange,
  onSelect,
  excludedIds = [],
}: RiderAutocompleteProps) {
  const [results, setResults] = useState<Rider[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [hasTyped, setHasTyped] = useState(false)

  const wrapperRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    let active = true

    async function runSearch() {
      if (!value || value.trim().length < 2) {
        setResults([])
        setOpen(false)
        return
      }

      setLoading(true)

      const { data, error } = await supabase
        .from("riders")
        .select(`
  id,
  full_name,
  short_name,
  nationality,
  team,
  team_id,
  is_active,
  teams (
    name,
    short_name
  )
`)
        .ilike("full_name", `%${value.trim()}%`)
        .eq("is_active", true)
        .order("full_name", { ascending: true })
        .limit(8)

      if (!active) return

      if (error) {
        console.error(error)
        setResults([])
        setOpen(false)
        setLoading(false)
        return
      }

      const filtered = (data || []).filter(
        (r) => !excludedIds.includes(r.id) || r.id === selectedId
      )

      setResults(filtered)
      setOpen(true)
      setLoading(false)
    }

    const timeout = setTimeout(runSearch, 200)
    return () => {
      active = false
      clearTimeout(timeout)
    }
  }, [value, excludedIds, selectedId])

  function handleSelect(rider: Rider) {
  onValueChange(rider.full_name)
  onSelect(rider)
  setResults([])
  setOpen(false)
  setHasTyped(false)
}

  function handleClear() {
  onValueChange("")
  onSelect(null)
  setResults([])
  setOpen(false)
  setHasTyped(false)
}

  return (
    <div ref={wrapperRef} className="relative">
      {label && (
        <label className="block text-sm text-white/70 mb-2">{label}</label>
      )}

      <div className="relative">
        <input
          value={value}
          onChange={(e) => {
            setHasTyped(true)
            onValueChange(e.target.value)
            if (selectedId) onSelect(null)
        }}
          onFocus={() => {
  if (!selectedId && results.length > 0) setOpen(true)
}}
          placeholder={placeholder}
          className="w-full rounded-xl border border-white/10 bg-white/5 p-3 pr-20 text-white"
        />

        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {loading && (
            <span className="text-xs text-white/50">...</span>
          )}

          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="text-xs px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10"
            >
              Effacer
            </button>
          )}
        </div>
      </div>

      {open && !selectedId && results.length > 0 && (
        <div className="absolute z-30 mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 shadow-xl overflow-hidden">
          {results.map((rider) => (
            <button
              key={rider.id}
              type="button"
              onClick={() => handleSelect(rider)}
              className="w-full text-left px-4 py-3 hover:bg-white/10 transition border-b border-white/5"
            >
              <div className="font-semibold text-white">{rider.full_name}</div>
              <div className="text-xs text-white/60">
                {rider.teams?.[0]?.short_name || rider.team || ""}
                {rider.teams?.[0]?.name || rider.team || "Équipe inconnue"}
                {rider.nationality ? ` • ${rider.nationality}` : ""}
              </div>
            </button>
          ))}
        </div>
      )}

      {open &&
  hasTyped &&
  !loading &&
  !selectedId &&
  value.trim().length >= 2 &&
  results.length === 0 && (
    <div className="absolute z-30 mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 p-3 text-sm text-white/60">
      Aucun coureur trouvé.
    </div>
  )}
    </div>
  )
}