/* api/history.ts — TrustBoxHedera AI
   GET /api/history/dashboard  — dashboard stats
   GET /api/history/audits     — audit history
   GET /api/history/intents    — intent history
   GET /api/history/agents     — agent history
   GET /api/history/blindaudits— blind audit history

   Primary source: Hedera Mirror Node (HCS topic messages)
   Fallback:       in-memory store (demo mode)
   ──────────────────────────────────────────────────────── */

import { Router, Request, Response } from "express"
import { requireJWT }         from "../middleware/auth"
import { apiLimiter }         from "../middleware/rateLimit"
import { getTopicMessages }   from "../services/hedera"
import { env }                from "../config/env"

export const historyRouter = Router()

// ── In-memory fallback store ──────────────────────────────────────────────────

const mem: Record<string, any[]> = {
  audits:     [],
  intents:    [],
  agents:     [],
  blindaudits:[],
  notifications: [],
}

export function memInsert(table: string, record: any) {
  if (!mem[table]) mem[table] = []
  mem[table].unshift({ ...record, id: record.id ?? `${table}_${Date.now()}` })
}

// ── Mirror Node helpers ───────────────────────────────────────────────────────

async function topicHistory(topicId: string, limit = 25): Promise<any[]> {
  if (!topicId || topicId === "0.0.0") return []
  return getTopicMessages(topicId, limit)
}

// ── Routes ────────────────────────────────────────────────────────────────────

historyRouter.get("/dashboard", requireJWT, async (req: Request, res: Response) => {
  try {
    const [auditMsgs, intentMsgs, agentMsgs] = await Promise.all([
      topicHistory(env.HCS_AUDIT_TOPIC_ID,  5),
      topicHistory(env.HCS_INTENT_TOPIC_ID, 5),
      topicHistory(env.HCS_AGENT_TOPIC_ID,  5),
    ])

    const totalAudits  = auditMsgs.length  || mem.audits.length
    const totalIntents = intentMsgs.length || mem.intents.length
    const totalAgents  = agentMsgs.length  || mem.agents.length

    const recentActivity = [
      ...auditMsgs.slice(0, 3).map(m => ({
        id: m.sequenceNumber, type: "audit",
        label: `Audit: ${m.message?.contractName ?? "contract"}`,
        timestamp: m.consensusTimestamp, status: "completed",
        link: `https://hashscan.io/testnet/topic/${env.HCS_AUDIT_TOPIC_ID}`,
      })),
      ...intentMsgs.slice(0, 2).map(m => ({
        id: m.sequenceNumber, type: "intent",
        label: `Intent: ${m.message?.category ?? "unknown"}`,
        timestamp: m.consensusTimestamp, status: "executed",
        link: `https://hashscan.io/testnet/topic/${env.HCS_INTENT_TOPIC_ID}`,
      })),
      ...mem.audits.slice(0, 3).map((a: any) => ({
        id: a.id, type: "audit",
        label: `Audit: ${a.contractName ?? "contract"}`,
        timestamp: a.auditedAt, status: "completed",
      })),
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10)

    res.json({
      totalAudits,
      totalIntents,
      totalAgents,
      unreadNotifs:   mem.notifications.filter(n => !n.read).length,
      recentActivity,
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

historyRouter.get("/audits", requireJWT, async (_req: Request, res: Response) => {
  try {
    const msgs = await topicHistory(env.HCS_AUDIT_TOPIC_ID, 50)
    const fromHCS = msgs
      .filter(m => m.message?.event === "AUDIT_SUBMITTED")
      .map(m => ({ ...m.message, hcsSeqNum: m.sequenceNumber, source: "hcs" }))
    res.json({ audits: fromHCS.length ? fromHCS : mem.audits })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

historyRouter.post("/audits", async (req: Request, res: Response) => {
  memInsert("audits", req.body)
  res.json({ ok: true })
})

historyRouter.get("/intents", requireJWT, async (_req: Request, res: Response) => {
  try {
    const msgs = await topicHistory(env.HCS_INTENT_TOPIC_ID, 50)
    const fromHCS = msgs
      .filter(m => m.message?.event === "INTENT_SUBMITTED")
      .map(m => ({ ...m.message, hcsSeqNum: m.sequenceNumber, source: "hcs" }))
    res.json({ intents: fromHCS.length ? fromHCS : mem.intents })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

historyRouter.post("/intents", async (req: Request, res: Response) => {
  memInsert("intents", req.body)
  res.json({ ok: true })
})

historyRouter.get("/agents", requireJWT, async (_req: Request, res: Response) => {
  try {
    const msgs = await topicHistory(env.HCS_AGENT_TOPIC_ID, 50)
    const fromHCS = msgs
      .filter(m => ["AGENT_REGISTERED","AGENT_SCANNED"].includes(m.message?.event))
      .map(m => ({ ...m.message, hcsSeqNum: m.sequenceNumber, source: "hcs" }))
    res.json({ agents: fromHCS.length ? fromHCS : mem.agents })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

historyRouter.post("/agents", async (req: Request, res: Response) => {
  memInsert("agents", req.body)
  res.json({ ok: true })
})

historyRouter.get("/blindaudits", requireJWT, async (_req: Request, res: Response) => {
  try {
    const msgs = await topicHistory(env.HCS_BLINDAUDIT_TOPIC_ID, 50)
    const fromHCS = msgs
      .filter(m => m.message?.event === "BLINDAUDIT_COMPLETED")
      .map(m => ({ ...m.message, hcsSeqNum: m.sequenceNumber, source: "hcs" }))
    res.json({ blindaudits: fromHCS.length ? fromHCS : mem.blindaudits })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

historyRouter.post("/blindaudits", async (req: Request, res: Response) => {
  memInsert("blindaudits", req.body)
  res.json({ ok: true })
})

historyRouter.get("/notifications", requireJWT, (_req: Request, res: Response) => {
  res.json({ notifications: mem.notifications })
})

historyRouter.post("/notifications/read", requireJWT, (_req: Request, res: Response) => {
  mem.notifications.forEach(n => { n.read = true })
  res.json({ ok: true })
})
