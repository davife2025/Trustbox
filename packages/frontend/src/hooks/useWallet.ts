/* hooks/useWallet.ts — TrustBoxHedera AI
   Dual wallet support:
     Option A — MetaMask + Hashio RPC (EVM-compatible, chainId 296)
     Option B — HashConnect + HashPack (Hedera-native, HCS signing)
   ──────────────────────────────────────────────────────────────── */

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

  // ── Option A — MetaMask ───────────────────────────────────────────────────

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
        hederaAccountId:  null,        // MetaMask doesn't expose Hedera account ID
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

  // ── Option B — HashConnect (HashPack) ─────────────────────────────────────

  const connectHashConnect = useCallback(async () => {
    update({ isConnecting: true, error: null })
    try {
      // Dynamic import — only loads if HashConnect is installed
      const { HashConnect } = await import("@hashgraph/hashconnect")

      const hashconnect = new HashConnect()

      const appMetadata = {
        name:        "TrustBox Hedera AI",
        description: "Verifiable trust infrastructure for AI agents on Hedera",
        icon:        `${window.location.origin}/favicon.svg`,
        url:         window.location.origin,
      }

      const initData = await hashconnect.init(appMetadata, "testnet", false)

      hashconnect.foundExtensionEvent.once(async (walletMetadata) => {
        await hashconnect.connectToLocalWallet()
      })

      hashconnect.pairingEvent.once((pairingData) => {
        const accountId = pairingData.accountIds?.[0] ?? null
        // Derive EVM address from Hedera account — mirror node lookup
        update({
          address:          accountId ? `0x${accountId.replace(/\./g, "")}` : null,
          hederaAccountId:  accountId,
          chainId:          "0x128",
          isConnected:      true,
          isCorrectNetwork: true,
          walletType:       "hashconnect",
          isConnecting:     false,
        })
        // Store hashconnect instance for signing
        ;(window as any).__hc = hashconnect
        ;(window as any).__hcTopic = initData.topic
      })

      // Start pairing flow
      hashconnect.findLocalWallets()

      // Timeout if no wallet found in 15s
      setTimeout(() => {
        if (!state.isConnected) {
          update({ error: "HashPack not found — install from hashpack.app", isConnecting: false })
        }
      }, 15_000)
    } catch (err: any) {
      update({ error: `HashConnect error: ${err.message}`, isConnecting: false })
    }
  }, [state.isConnected])

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
      const hc      = (window as any).__hc
      const topic   = (window as any).__hcTopic
      if (!hc || !state.hederaAccountId) throw new Error("HashConnect not connected")
      // HashConnect signing — returns bytes as hex
      const result = await hc.signMessages(topic, {
        accountToSign: state.hederaAccountId,
        message:       btoa(message),
      })
      return result?.signedMessages?.[0]?.signature ?? ""
    }

    throw new Error("No wallet connected")
  }, [state])

  // ── Disconnect ────────────────────────────────────────────────────────────

  const disconnect = useCallback(() => {
    setState(INITIAL)
    if ((window as any).__hc) {
      (window as any).__hc = null
    }
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
      update({
        chainId,
        isCorrectNetwork: chainId === HEDERA_CHAIN_HEX,
      })
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
