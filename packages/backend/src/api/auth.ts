/* api/auth.ts — TrustBoxHedera AI
   POST /api/auth/login   — EIP-191 sign-in → JWT
   POST /api/auth/refresh — refresh JWT
   GET  /api/auth/me      — current user
   ──────────────────────────────────────────────── */

import { Router, Request, Response } from "express"
import { ethers }       from "ethers"
import { signJWT, requireJWT } from "../middleware/auth"

export const authRouter = Router()

const MESSAGE_PREFIX = "Sign in to TrustBoxHedera AI\nNonce: "

authRouter.post("/login", async (req: Request, res: Response) => {
  try {
    const { walletAddress, signature, hederaAccount } = req.body
    if (!walletAddress || !signature) {
      return res.status(400).json({ error: "walletAddress and signature required" })
    }

    // The frontend signs MESSAGE_PREFIX + walletAddress
    const message  = `${MESSAGE_PREFIX}${walletAddress.toLowerCase()}`
    const recovered = ethers.verifyMessage(message, signature)

    if (recovered.toLowerCase() !== walletAddress.toLowerCase()) {
      return res.status(401).json({ error: "Signature mismatch" })
    }

    const token     = signJWT(walletAddress, hederaAccount)
    const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 7

    res.json({
      token,
      expiresAt,
      user: {
        id:              `user_${walletAddress.slice(2, 10)}`,
        wallet_address:  walletAddress.toLowerCase(),
        hedera_account:  hederaAccount ?? null,
        created_at:      new Date().toISOString(),
      },
    })
  } catch (err: any) {
    res.status(401).json({ error: err.message })
  }
})

authRouter.get("/me", requireJWT, (req: Request, res: Response) => {
  const payload = (req as any).jwtPayload
  res.json({ user: payload })
})

authRouter.post("/refresh", requireJWT, (req: Request, res: Response) => {
  const payload   = (req as any).jwtPayload
  const token     = signJWT(payload.walletAddress, payload.hederaAccount)
  const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 7
  res.json({ token, expiresAt })
})
