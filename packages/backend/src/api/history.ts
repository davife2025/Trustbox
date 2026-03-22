/* api/history.ts — TrustBoxHedera AI
   Primary source: Supabase (if configured)
   Secondary:      Hedera Mirror Node (HCS topics)
   Fallback:       In-memory store
*/

import { Router, Request, Response } from "express"
import { requireJWT }    from "../middleware/auth"
import { apiLimiter }    from "../middleware/rateLimit"
import { getTopicMessages } from "../services/hedera"
import {
  getAudits, getIntents, getAgents, getBlindAudits, getDashboardStats,
  saveAudit, saveIntent, saveAgent, saveBlindAudit,
} from "../services/supabase"
import { env } from "../config/env"

export const historyRouter = Router()

// ── Dashboard ─────────────────────────────────────────────────────────────────

historyRouter.get("/dashboard", requireJWT, async (req: Request, res: Response) => {
  try {
    const wallet = (req as any).jwtPayload?.walletAddress
    const stats  = await getDashboardStats(wallet)
    res.json(stats)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// ── Audits ────────────────────────────────────────────────────────────────────

historyRouter.get("/audits", requireJWT, async (req: Request, res: Response) => {
  try {
    const wallet = (req as any).jwtPayload?.walletAddress
    const rows   = await getAudits(wallet)
    if (rows.length) return res.json({ audits: rows, source: "supabase" })

    // Fallback: Mirror Node HCS topic
    const msgs = await getTopicMessages(env.HCS_AUDIT_TOPIC_ID, 50)
    const audits = msgs.filter(m => m.message?.event === "AUDIT_SUBMITTED")
      .map(m => ({ ...m.message, hcsSeqNum: m.sequenceNumber, source: "hcs" }))
    res.json({ audits })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

historyRouter.post("/audits", async (req: Request, res: Response) => {
  try { await saveAudit(req.body); res.json({ ok: true }) }
  catch (err: any) { res.status(500).json({ error: err.message }) }
})

// ── Intents ───────────────────────────────────────────────────────────────────

historyRouter.get("/intents", requireJWT, async (req: Request, res: Response) => {
  try {
    const wallet = (req as any).jwtPayload?.walletAddress
    const rows   = await getIntents(wallet)
    if (rows.length) return res.json({ intents: rows, source: "supabase" })

    const msgs    = await getTopicMessages(env.HCS_INTENT_TOPIC_ID, 50)
    const intents = msgs.filter(m => m.message?.event === "INTENT_SUBMITTED")
      .map(m => ({ ...m.message, hcsSeqNum: m.sequenceNumber, source: "hcs" }))
    res.json({ intents })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

historyRouter.post("/intents", async (req: Request, res: Response) => {
  try { await saveIntent(req.body); res.json({ ok: true }) }
  catch (err: any) { res.status(500).json({ error: err.message }) }
})

// ── Agents ────────────────────────────────────────────────────────────────────

historyRouter.get("/agents", requireJWT, async (req: Request, res: Response) => {
  try {
    const wallet = (req as any).jwtPayload?.walletAddress
    const rows   = await getAgents(wallet)
    if (rows.length) return res.json({ agents: rows, source: "supabase" })

    const msgs   = await getTopicMessages(env.HCS_AGENT_TOPIC_ID, 50)
    const agents = msgs.filter(m => ["AGENT_REGISTERED","AGENT_SCANNED"].includes(m.message?.event))
      .map(m => ({ ...m.message, hcsSeqNum: m.sequenceNumber, source: "hcs" }))
    res.json({ agents })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

historyRouter.post("/agents", async (req: Request, res: Response) => {
  try { await saveAgent(req.body); res.json({ ok: true }) }
  catch (err: any) { res.status(500).json({ error: err.message }) }
})

// ── Blind Audits ──────────────────────────────────────────────────────────────

historyRouter.get("/blindaudits", requireJWT, async (req: Request, res: Response) => {
  try {
    const wallet = (req as any).jwtPayload?.walletAddress
    const rows   = await getBlindAudits(wallet)
    if (rows.length) return res.json({ blindaudits: rows, source: "supabase" })

    const msgs       = await getTopicMessages(env.HCS_BLINDAUDIT_TOPIC_ID, 50)
    const blindaudits = msgs.filter(m => m.message?.event === "BLINDAUDIT_COMPLETED")
      .map(m => ({ ...m.message, hcsSeqNum: m.sequenceNumber, source: "hcs" }))
    res.json({ blindaudits })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

historyRouter.post("/blindaudits", async (req: Request, res: Response) => {
  try { await saveBlindAudit(req.body); res.json({ ok: true }) }
  catch (err: any) { res.status(500).json({ error: err.message }) }
})

// ── Notifications ─────────────────────────────────────────────────────────────

historyRouter.get("/notifications", requireJWT, (_req: Request, res: Response) => {
  res.json({ notifications: [] })
})

historyRouter.post("/notifications/read", requireJWT, (_req: Request, res: Response) => {
  res.json({ ok: true })
})
