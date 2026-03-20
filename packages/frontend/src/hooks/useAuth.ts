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

export function useAuth(
  walletAddress: string | null,
  signMessage:   (msg: string) => Promise<string>
) {
  const [token,  setToken]  = useState<string | null>(null)
  const [user,   setUser]   = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  // Restore from localStorage
  useEffect(() => {
    const saved    = localStorage.getItem(TOKEN_KEY)
    const expiry   = Number(localStorage.getItem(EXPIRY_KEY) ?? 0)
    if (saved && Date.now() < expiry) setToken(saved)
    else { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(EXPIRY_KEY) }
  }, [])

  const login = useCallback(async (hederaAccount?: string) => {
    if (!walletAddress) return
    setLoading(true); setError(null)
    try {
      const message   = `${MSG_PREFIX}${walletAddress.toLowerCase()}`
      const signature = await signMessage(message)

      const res = await fetch(`${API_URL}/api/auth/login`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ walletAddress, signature, hederaAccount }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Login failed")

      localStorage.setItem(TOKEN_KEY,  data.token)
      localStorage.setItem(EXPIRY_KEY, String(data.expiresAt))
      setToken(data.token)
      setUser(data.user)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [walletAddress, signMessage])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(EXPIRY_KEY)
    setToken(null); setUser(null)
  }, [])

  const authFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    return fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
  }, [token])

  return { token, user, loading, error, login, logout, authFetch, isAuthed: !!token }
}
