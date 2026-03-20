/* api/agents.ts — TrustBoxHedera AI
   GET /api/agents — agent list from AgentMarketplace HSCS + HCS topic
   ──────────────────────────────────────────────────────────────────── */

import { Router, Request, Response } from "express"
import { getAgentMarketplace }   from "../services/ethers"
import { getTopicMessages }      from "../services/hedera"
import { env }                   from "../config/env"

export const agentsRouter = Router()

let _cache: { data: any[]; expiresAt: number } | null = null

agentsRouter.get("/", async (_req: Request, res: Response) => {
  try {
    if (_cache && Date.now() < _cache.expiresAt) {
      return res.json({ agents: _cache.data, cached: true })
    }

    // Pull agent events from HCS topic (Mirror Node)
    const msgs = await getTopicMessages(env.HCS_AGENT_TOPIC_ID, 50)
    const hcsAgents = msgs
      .filter(m => m.message?.event === "AGENT_REGISTERED" || m.message?.event === "AGENT_SCANNED")
      .map(m => ({
        id:           m.message.agentId,
        name:         m.message.agentName  ?? m.message.agentId,
        operator:     m.message.operator   ?? "Unknown",
        tokenId:      m.message.tokenId    ?? "0",
        trustScore:   m.message.trustScore ?? 80,
        status:       "online",
        capabilities: [],
        teeEnabled:   true,
        hcsSeqNum:    m.sequenceNumber,
        registeredAt: m.consensusTimestamp,
      }))

    const agents = hcsAgents.length > 0 ? hcsAgents : [
      {
        id: "agt_demo001", name: "TrustGuard Scanner",
        operator: "0x0000000000000000000000000000000000000001",
        tokenId: "1", trustScore: 92, status: "online",
        capabilities: ["audit", "reentrancy", "access-control"],
        teeEnabled: true, hcsSeqNum: "1",
        registeredAt: new Date().toISOString(),
      },
    ]

    _cache = { data: agents, expiresAt: Date.now() + 60_000 }
    res.json({ agents })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})
