/* hooks/useHistory.ts — TrustBoxHedera AI */

import { useState, useEffect } from "react"
import { API_URL } from "../constant"
import { useAuthContext } from "../context/AuthContext"

export function useHistory() {
  const { authFetch, isAuthed } = useAuthContext()
  const [audits,      setAudits]      = useState<any[]>([])
  const [intents,     setIntents]     = useState<any[]>([])
  const [agents,      setAgents]      = useState<any[]>([])
  const [blindaudits, setBlindaudits] = useState<any[]>([])
  const [loading,     setLoading]     = useState(false)

  useEffect(() => {
    if (!isAuthed) return
    setLoading(true)
    Promise.all([
      authFetch(`${API_URL}/api/history/audits`).then(r => r.json()),
      authFetch(`${API_URL}/api/history/intents`).then(r => r.json()),
      authFetch(`${API_URL}/api/history/agents`).then(r => r.json()),
      authFetch(`${API_URL}/api/history/blindaudits`).then(r => r.json()),
    ])
      .then(([a, i, ag, b]) => {
        setAudits(a.audits ?? [])
        setIntents(i.intents ?? [])
        setAgents(ag.agents ?? [])
        setBlindaudits(b.blindaudits ?? [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [isAuthed])

  return { audits, intents, agents, blindaudits, loading }
}
