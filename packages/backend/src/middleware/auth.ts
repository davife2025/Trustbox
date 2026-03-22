/* middleware/auth.ts — TrustBoxHedera AI
   EIP-191 wallet signature verification + JWT issuance.
   Works with both MetaMask (Option A) and HashConnect (Option B).
   ─────────────────────────────────────────────────────────────── */

import { Request, Response, NextFunction } from "express"
import { ethers }  from "ethers"
import jwt         from "jsonwebtoken"
import { env }     from "../config/env"

const TOKEN_TTL = 60 * 60 * 24 * 7   // 7 days

// ── JWT helpers ───────────────────────────────────────────────────────────────

export function signJWT(walletAddress: string, hederaAccount?: string): string {
  return jwt.sign(
    { walletAddress: walletAddress.toLowerCase(), hederaAccount },
    env.JWT_SECRET,
    { expiresIn: TOKEN_TTL }
  )
}

export function verifyJWT(token: string): {
  walletAddress: string
  hederaAccount?: string
} {
  return jwt.verify(token, env.JWT_SECRET) as any
}

// ── requireWalletSig ─────────────────────────────────────────────────────────
// Verifies EIP-191 personal_sign signature on the request body.
// Ensures the caller controls the wallet they claim to be.

export function requireWalletSig(req: Request, res: Response, next: NextFunction) {
  const { walletAddress, signature, specHash } = req.body

  // If no signature provided, check JWT instead
  const authHeader = req.headers.authorization
  if (!signature && authHeader?.startsWith("Bearer ")) {
    try {
      const payload = verifyJWT(authHeader.slice(7))
      if (!walletAddress || payload.walletAddress === walletAddress.toLowerCase()) {
        return next()
      }
      return res.status(401).json({ error: "JWT wallet mismatch" })
    } catch {
      return res.status(401).json({ error: "Invalid JWT" })
    }
  }

  if (!walletAddress || !signature) {
    return res.status(400).json({ error: "walletAddress and signature required" })
  }

  try {
    // Recover signer from EIP-191 personal_sign
    // Each workflow signs a different message — try all valid options
    const { reportHash, metadataURI, nlHash } = req.body
    const candidates = [specHash, reportHash, metadataURI, nlHash, walletAddress].filter(Boolean)
    let verified = false
    for (const msg of candidates) {
      try {
        const recovered = ethers.verifyMessage(msg, signature)
        if (recovered.toLowerCase() === walletAddress.toLowerCase()) {
          verified = true; break
        }
      } catch { /* try next */ }
    }
    if (!verified) {
      return res.status(401).json({ error: "Signature does not match walletAddress" })
    }
    next()
  } catch (err: any) {
    return res.status(401).json({ error: `Signature verification failed: ${err.message}` })
  }
}

// ── requireJWT ───────────────────────────────────────────────────────────────

export function requireJWT(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authorization header required" })
  }
  try {
    const payload = verifyJWT(authHeader.slice(7))
    ;(req as any).jwtPayload = payload
    next()
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" })
  }
}
