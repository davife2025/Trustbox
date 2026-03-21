/* api/hol.ts — TrustBoxHedera AI
   GET  /api/hol/agent       — agent identity + HCS-10 topics
   POST /api/hol/register    — register agent in HOL Registry (one-time)
   POST /api/hol/chat        — send a message to the agent (REST bridge)
   GET  /api/hol/messages    — recent outbound messages
   ────────────────────────────────────────────────────────────────────── */

import { Router, Request, Response } from "express"
import { walletRateLimit }   from "../middleware/rateLimit"
import { getAgentState, sendHCS10Message, registerTrustBoxAgent } from "../agent/hcs10"
import { routeMessage }      from "../agent/router"
import { env }               from "../config/env"

export const holRouter = Router()

// ── GET /api/hol/agent ────────────────────────────────────────────────────────
// Returns agent identity for the frontend chat panel

holRouter.get("/agent", (_req: Request, res: Response) => {
  const state = getAgentState()

  if (!state) {
    return res.json({
      registered:  false,
      name:        "TrustBox AI Agent",
      description: "Not yet registered — call POST /api/hol/register",
      network:     env.HEDERA_NETWORK,
      registryUrl: env.HOL_REGISTRY_URL,
    })
  }

  res.json({
    registered:    true,
    name:          state.name,
    alias:         state.alias,
    accountId:     state.accountId,
    inboundTopic:  state.inboundTopic,
    outboundTopic: state.outboundTopic,
    registryUrl:   state.registryUrl,
    registeredAt:  state.registeredAt,
    hashscanAccount: `https://hashscan.io/${env.HEDERA_NETWORK}/account/${state.accountId}`,
    hashscanInbound: `https://hashscan.io/${env.HEDERA_NETWORK}/topic/${state.inboundTopic}`,
    hashscanOutbound:`https://hashscan.io/${env.HEDERA_NETWORK}/topic/${state.outboundTopic}`,
    protocols: ["HCS-10", "HCS-11", "ERC-8004"],
    dapp: "https://trustboxhedera-ai.vercel.app",
  })
})

// ── POST /api/hol/register ────────────────────────────────────────────────────
// One-time registration in HOL Registry

holRouter.post("/register", async (_req: Request, res: Response) => {
  try {
    const state = await registerTrustBoxAgent()
    res.json({
      success:      true,
      message:      "TrustBox AI Agent registered in HOL Registry",
      accountId:    state.accountId,
      inboundTopic: state.inboundTopic,
      outboundTopic:state.outboundTopic,
      registryUrl:  state.registryUrl,
      registeredAt: state.registeredAt,
      hashscanInbound: `https://hashscan.io/${env.HEDERA_NETWORK}/topic/${state.inboundTopic}`,
    })
  } catch (err: any) {
    console.error("[hol/register]", err.message)
    res.status(500).json({ error: err.message })
  }
})

// ── POST /api/hol/chat ────────────────────────────────────────────────────────
// REST bridge — frontend can send messages without running a full HCS-10 client

holRouter.post("/chat", walletRateLimit, async (req: Request, res: Response) => {
  try {
    const { message, sender, sendToHCS } = req.body
    if (!message) return res.status(400).json({ error: "message required" })

    const senderAddr = sender ?? "anonymous"
    const reply = await routeMessage(senderAddr, message)

    // Optionally also broadcast reply to outbound HCS topic
    if (sendToHCS !== false) {
      const state = getAgentState()
      if (state?.outboundTopic) {
        sendHCS10Message(state.outboundTopic, reply).catch(e =>
          console.warn("[hol/chat] HCS broadcast failed:", e.message)
        )
      }
    }

    res.json({
      success: true,
      message: reply,
      agent: {
        name:    "TrustBox AI Agent",
        account: getAgentState()?.accountId ?? "unregistered",
      },
      timestamp: new Date().toISOString(),
    })
  } catch (err: any) {
    console.error("[hol/chat]", err.message)
    res.status(500).json({ error: err.message })
  }
})

// ── GET /api/hol/messages ─────────────────────────────────────────────────────
// Recent outbound messages from Mirror Node

holRouter.get("/messages", async (_req: Request, res: Response) => {
  try {
    const state = getAgentState()
    if (!state?.outboundTopic) {
      return res.json({ messages: [], note: "Agent not yet registered" })
    }

    const mirror = env.HEDERA_NETWORK === "mainnet"
      ? "https://mainnet.mirrornode.hedera.com/api/v1"
      : "https://testnet.mirrornode.hedera.com/api/v1"

    const r = await fetch(`${mirror}/topics/${state.outboundTopic}/messages?limit=20&order=desc`)
    if (!r.ok) return res.json({ messages: [] })

    const data: any = await r.json()
    const messages = (data.messages ?? []).map((m: any) => ({
      sequenceNumber:     m.sequence_number,
      consensusTimestamp: m.consensus_timestamp,
      message:            Buffer.from(m.message, "base64").toString("utf8"),
    }))

    res.json({
      messages,
      outboundTopic: state.outboundTopic,
      hashscanUrl:   `https://hashscan.io/${env.HEDERA_NETWORK}/topic/${state.outboundTopic}`,
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})
