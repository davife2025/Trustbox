/* hooks/useDashboard.ts — TrustBoxHedera AI */

import { useState, useEffect, useCallback } from "react"
import { API_URL } from "../constant"
import { useAuthContext } from "../context/AuthContext"

export interface DashboardStats {
  totalAudits:    number
  totalIntents:   number
  totalAgents:    number
  unreadNotifs:   number
  recentActivity: any[]
}

export function useDashboard() {
  const { authFetch, isAuthed } = useAuthContext()
  const [stats,   setStats]   = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!isAuthed) return
    setLoading(true)
    try {
      const res  = await authFetch(`${API_URL}/api/history/dashboard`)
      const data = await res.json()
      setStats(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [isAuthed, authFetch])

  useEffect(() => { refresh() }, [refresh])

  return { stats, loading, refresh }
}
