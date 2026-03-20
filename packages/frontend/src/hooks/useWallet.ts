/* hooks/useWallet.ts — TrustBoxHedera AI
   Dual wallet support:
     Option A — MetaMask + Hashio RPC (EVM-compatible, chainId 296)
     Option B — HashConnect v3 + HashPack (Hedera-native, WalletConnect-based)
   ──────────────────────────────────────────────────────────────────────────── */

import { useState, useEffect, useCallback } from "react"
import { HEDERA_TESTNET_PARAMS, HEDERA_CHAIN_HEX } from "../constant"

export type WalletType = "metamask" | "hashconnect" | null

export interface WalletState {
  address:          string | null
  hederaAccountId:  string | null
  chainId:          string | null
  isConnected:      boolean
  isCorrectNetwork: boolean
  isConnecting:     boolean
  walletType:       WalletType
  error:            string | null
}

const INITIAL: WalletState = {
  address:          null,
  hederaAccountId:  null,
  chainId:          null,
  isConnected:      false,
  isCorrectNetwork: false,
  isConnecting:     false,
  walletType:       null,
  error:            null,
}

export function useWallet() {
  const [state, setState] = useState<WalletState>(INITIAL)

  const update = (patch: Partial<WalletState>) =>
    setState(prev => ({ ...prev, ...patch }))

  // ── Option A — MetaMask + Hashio RPC ─────────────────────────────────────

  const connectMetaMask = useCallback(async () => {
    const eth = (window as any).ethereum
    if (!eth) {
      update({ error: "MetaMask not found — install from metamask.io" })
      return
    }
    update({ isConnecting: true, error: null })
    try {
      const accounts: string[] = await eth.request({ method: "eth_requestAccounts" })
      if (!accounts.length) throw new Error("No accounts returned")

      const chainId: string = await eth.request({ method: "eth_chainId" })

      if (chainId !== HEDERA_CHAIN_HEX) {
        try {
          await eth.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: HEDERA_CHAIN_HEX }],
          })
        } catch (switchErr: any) {
          if (switchErr.code === 4902) {
            await eth.request({
              method: "wallet_addEthereumChain",
              params: [HEDERA_TESTNET_PARAMS],
            })
          } else throw switchErr
        }
      }

      update({
        address:          accounts[0],
        hederaAccountId:  null,
        chainId:          HEDERA_CHAIN_HEX,
        isConnected:      true,
        isCorrectNetwork: true,
        walletType:       "metamask",
        isConnecting:     false,
      })
    } catch (err: any) {
      update({ error: err.message, isConnecting: false })
    }
  }, [])

  // ── Option B — HashConnect v3 + HashPack ──────────────────────────────────
  // Uses WalletConnect under the hood. Requires a WalletConnect project ID.
  // Get one free at https://cloud.walletconnect.com

  const connectHashConnect = useCallback(async () => {
    update({ isConnecting: true, error: null })
    try {
      const { HashConnect, HashConnectConnectionState } = await import("hashconnect")
      const { LedgerId } = await import("@hashgraph/sdk")

      const projectId = import.meta.env.VITE_HASHCONNECT_PROJECT_ID
      if (!projectId) {
        throw new Error(
          "VITE_HASHCONNECT_PROJECT_ID not set — get one free at https://cloud.walletconnect.com"
        )
      }

      const appMetadata = {
        name:        "TrustBox Hedera AI",
        description: "Verifiable trust infrastructure for AI agents on Hedera",
        icons:       [`${window.location.origin}/favicon.svg`],
        url:         window.location.origin,
      }

      // v3 constructor: (ledgerId, projectId, metadata, debug)
      const hc = new HashConnect(LedgerId.TESTNET, projectId, appMetadata, false)

      // Register events before init
      hc.pairingEvent.on((pairingData: any) => {
        const accountId = pairingData?.accountIds?.[0] ?? null
        if (accountId) {
          update({
            address:          accountId,          // use Hedera account ID as address
            hederaAccountId:  accountId,
            chainId:          "0x128",
            isConnected:      true,
            isCorrectNetwork: true,
            walletType:       "hashconnect",
            isConnecting:     false,
          })
          // Store instance for signing
          ;(window as any).__hc = hc
        }
      })

      hc.disconnectionEvent.on(() => {
        setState(INITIAL)
        ;(window as any).__hc = null
      })

      // Init + open pairing modal (shows QR + HashPack extension detection)
      await hc.init()
      hc.openPairingModal()

      // Timeout if no pairing in 60s
      setTimeout(() => {
        if (!(window as any).__hc) {
          update({
            error: "Pairing timed out — install HashPack from hashpack.app and try again",
            isConnecting: false,
          })
        }
      }, 60_000)

    } catch (err: any) {
      update({ error: `HashConnect error: ${err.message}`, isConnecting: false })
    }
  }, [])

  // ── Sign message ──────────────────────────────────────────────────────────

  const signMessage = useCallback(async (message: string): Promise<string> => {
    if (state.walletType === "metamask") {
      const eth = (window as any).ethereum
      if (!eth || !state.address) throw new Error("MetaMask not connected")
      return eth.request({
        method: "personal_sign",
        params: [message, state.address],
      })
    }

    if (state.walletType === "hashconnect") {
      const hc = (window as any).__hc
      if (!hc || !state.hederaAccountId) throw new Error("HashConnect not connected")
      // v3: use signer API
      try {
        const { AccountId } = await import("@hashgraph/sdk")
        const signer = hc.getSigner(AccountId.fromString(state.hederaAccountId))
        // Sign arbitrary message bytes
        const msgBytes = new TextEncoder().encode(message)
        const result = await signer.sign([msgBytes])
        // Return hex signature
        return `0x${Buffer.from(result[0].signature).toString("hex")}`
      } catch (err: any) {
        throw new Error(`HashConnect signing failed: ${err.message}`)
      }
    }

    throw new Error("No wallet connected")
  }, [state])

  // ── Disconnect ────────────────────────────────────────────────────────────

  const disconnect = useCallback(async () => {
    const hc = (window as any).__hc
    if (hc) {
      try { await hc.disconnect() } catch { /* ignore */ }
      ;(window as any).__hc = null
    }
    setState(INITIAL)
  }, [])

  // ── MetaMask event listeners ──────────────────────────────────────────────

  useEffect(() => {
    const eth = (window as any).ethereum
    if (!eth) return

    const onAccountsChanged = (accounts: string[]) => {
      if (!accounts.length) { disconnect(); return }
      update({ address: accounts[0] })
    }
    const onChainChanged = (chainId: string) => {
      update({ chainId, isCorrectNetwork: chainId === HEDERA_CHAIN_HEX })
    }

    eth.on("accountsChanged", onAccountsChanged)
    eth.on("chainChanged",    onChainChanged)
    return () => {
      eth.removeListener("accountsChanged", onAccountsChanged)
      eth.removeListener("chainChanged",    onChainChanged)
    }
  }, [disconnect])

  return {
    ...state,
    connectMetaMask,
    connectHashConnect,
    signMessage,
    disconnect,
  }
}
