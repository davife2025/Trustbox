/* context/WalletContext.tsx — TrustBoxHedera AI */

import { createContext, useContext, ReactNode } from "react"
import { useWallet, WalletState, WalletType } from "../hooks/useWallet"

interface WalletCtx extends WalletState {
  connectMetaMask:   () => Promise<void>
  connectHashConnect:() => Promise<void>
  signMessage:       (msg: string) => Promise<string>
  disconnect:        () => void
}

const WalletContext = createContext<WalletCtx | null>(null)

export function WalletProvider({ children }: { children: ReactNode }) {
  const wallet = useWallet()
  return <WalletContext.Provider value={wallet}>{children}</WalletContext.Provider>
}

export function useWalletContext() {
  const ctx = useContext(WalletContext)
  if (!ctx) throw new Error("useWalletContext must be inside WalletProvider")
  return ctx
}
