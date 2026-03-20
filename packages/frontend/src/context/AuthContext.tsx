/* context/AuthContext.tsx — TrustBoxHedera AI */

import { createContext, useContext, ReactNode } from "react"
import { useAuth, AuthUser } from "../hooks/useAuth"
import { useWalletContext } from "./WalletContext"

interface AuthCtx {
  token:    string | null
  user:     AuthUser | null
  loading:  boolean
  error:    string | null
  isAuthed: boolean
  login:   (hederaAccount?: string) => Promise<void>
  logout:  () => void
  authFetch:(url: string, options?: RequestInit) => Promise<Response>
}

const AuthContext = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { address, signMessage } = useWalletContext()
  const auth = useAuth(address, signMessage)
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
}

export function useAuthContext() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuthContext must be inside AuthProvider")
  return ctx
}
