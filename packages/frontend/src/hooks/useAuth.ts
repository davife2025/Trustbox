/* hooks/useAuth.ts — TrustBoxHedera AI */

import { useState, useEffect, useCallback } from "react"
import { API_URL } from "../constant"

const TOKEN_KEY  = "tbh_jwt"
const EXPIRY_KEY = "tbh_jwt_exp"
const MSG_PREFIX = "Sign in to TrustBoxHedera AI\nNonce: "

export interface AuthUser {
  id:              string
  wallet_address:  string
  hedera_account?: string
  created_at:      string
}

// ── Read token synchronously so authFetch is ready on first render ─────────────
function readStoredToken(): string | null {
  try {
    const saved  = localStorage.getItem(TOKEN_KEY)
    const expiry = Number(localStorage.getItem(EXPIRY_KEY) ?? 0)
    if (saved && Date.now() < expiry) return saved
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(EXPIRY_KEY)
  } catch { /* SSR / private browsing */ }
  return null
}

export function useAuth(
  walletAddress: string | null,
  signMessage:   (msg: string) => Promise<string>
) {
  // Initialise synchronously — no flash of unauthenticated state
  const [token,   setToken]   = useState<string | null>(() => readStoredToken())
  const [user,    setUser]    = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  // Re-check expiry when wallet changes (e.g. disconnect + reconnect)
  useEffect(() => {
    const stored = readStoredToken()
    if (!stored && token) {
      setToken(null)
      setUser(null)
    }
  }, [walletAddress])

  const login = useCallback(async (hederaAccount?: string) => {
    if (!walletAddress) return
    setLoading(true); setError(null)
    try {
      const message   = `${MSG_PREFIX}${walletAddress.toLowerCase()}`
      const signature = await signMessage(message)

      const res  = await fetch(`${API_URL}/api/auth/login`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ walletAddress, signature, hederaAccount }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Login failed")

      localStorage.setItem(TOKEN_KEY,  data.token)
      localStorage.setItem(EXPIRY_KEY, String(data.expiresAt))
      setToken(data.token)
      setUser(data.user ?? null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [walletAddress, signMessage])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(EXPIRY_KEY)
    setToken(null)
    setUser(null)
  }, [])

  // authFetch always reads the latest token — no stale closure
  const authFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    const currentToken = readStoredToken() ?? token
    return fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
        ...(currentToken ? { Authorization: `Bearer ${currentToken}` } : {}),
      },
    })
  }, [token])

  return { token, user, loading, error, login, logout, authFetch, isAuthed: !!token }
}
