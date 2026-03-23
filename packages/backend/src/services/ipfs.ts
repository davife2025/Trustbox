/* services/ipfs.ts — TrustBoxHedera AI
   Pinata IPFS wrapper with graceful stub fallback.
   All workflows continue in demo mode when PINATA_JWT not set.
   ─────────────────────────────────────────────────────────── */

import { createHash } from "crypto"
import { env }        from "../config/env"

let _pinata: any | null = null

function stubCid(data: object): { cid: string; url: string } {
  const hash = createHash("sha256").update(JSON.stringify(data)).digest("hex")
  const cid  = `QmStub${hash.slice(0, 40)}`
  return { cid, url: `https://ipfs.io/ipfs/${cid}` }
}

async function getPinata(): Promise<any | null> {
  if (!env.PINATA_JWT) return null
  if (!_pinata) {
    const { PinataSDK } = await import("pinata")
    _pinata = new PinataSDK({
      pinataJwt:     env.PINATA_JWT,
      pinataGateway: env.PINATA_GATEWAY,
    })
  }
  return _pinata
}

export async function pinJSON(
  data:    object,
  name   = "upload"
): Promise<{ cid: string; url: string }> {
  const pinata = await getPinata()
  if (!pinata) {
    console.warn(`[ipfs] No PINATA_JWT — stub CID for "${name}"`)
    return stubCid(data)
  }
  try {
    // Try new Pinata SDK v2 API first, fall back to v1
    let cid: string
    if (pinata.upload?.json) {
      const result = await pinata.upload.json(data).addMetadata({ name: `trustboxhedera-${name}-${Date.now()}` })
      cid = result.cid ?? result.IpfsHash
    } else if (pinata.pinning?.pinJSONToIPFS) {
      const result = await pinata.pinning.pinJSONToIPFS(data, {
        pinataMetadata: { name: `trustboxhedera-${name}-${Date.now()}` },
      })
      cid = result.IpfsHash
    } else {
      throw new Error("Pinata SDK API not recognised")
    }
    return {
      cid,
      url: `${env.PINATA_GATEWAY ?? "https://gateway.pinata.cloud"}/ipfs/${cid}`,
    }
  } catch (err: any) {
    console.warn(`[ipfs] Pinata error for "${name}": ${err.message} — stub CID`)
    return stubCid(data)
  }
}

export const uploadJSON = pinJSON

export async function fetchJSON(cid: string): Promise<object> {
  const url = `${env.PINATA_GATEWAY}/ipfs/${cid}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`IPFS fetch failed for CID ${cid}: ${res.statusText}`)
  return res.json() as object
}

// ── Typed helpers ─────────────────────────────────────────────────────────────

export const pinAgentMetadata     = (d: object) => pinJSON(d, `agent-${(d as any).agentId}`)
export const pinAuditReport       = (d: object) => pinJSON(d, `audit-${(d as any).contractAddress?.slice(0,8)}`)
export const pinZKReceipt         = (d: object) => pinJSON(d, `zk-receipt`)
export const pinTEEAttestation    = (d: object) => pinJSON(d, `tee-${(d as any).jobId}`)
export const pinIntentRecord      = (d: object) => pinJSON(d, `intent-${(d as any).intentId}`)
