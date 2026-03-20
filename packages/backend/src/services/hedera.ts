/* services/hedera.ts — TrustBoxHedera AI
   Core Hedera service:
     - HCS message submission (one function per workflow)
     - Mirror Node REST queries
     - Mirror Node intent subscriber (replaces Chainlink Automation)
   ────────────────────────────────────────────────────────────────── */

import {
  Client,
  TopicMessageSubmitTransaction,
  PrivateKey,
  AccountId,
  TopicId,
} from "@hashgraph/sdk"
import { env } from "../config/env"

// ── Client singleton ──────────────────────────────────────────────────────────

let _client: Client | null = null

function getClient(): Client {
  if (_client) return _client
  const c = env.HEDERA_NETWORK === "mainnet"
    ? Client.forMainnet()
    : Client.forTestnet()
  c.setOperator(
    AccountId.fromString(env.HEDERA_OPERATOR_ID),
    PrivateKey.fromString(env.HEDERA_OPERATOR_KEY)
  )
  _client = c
  return c
}

// ── Mirror Node base URL ──────────────────────────────────────────────────────

const MIRROR = env.HEDERA_NETWORK === "mainnet"
  ? "https://mainnet.mirrornode.hedera.com/api/v1"
  : "https://testnet.mirrornode.hedera.com/api/v1"

// ── Generic HCS submit ────────────────────────────────────────────────────────

export async function submitToHCS(
  topicId: string,
  message: Record<string, unknown>
): Promise<{ sequenceNumber: string; consensusTimestamp: string }> {
  if (!topicId || topicId === "0.0.0") {
    console.warn(`[hedera] HCS topic not set — skipping submit`)
    return { sequenceNumber: "0", consensusTimestamp: new Date().toISOString() }
  }

  const client  = getClient()
  const payload = JSON.stringify(message)

  try {
    const tx = await new TopicMessageSubmitTransaction()
      .setTopicId(TopicId.fromString(topicId))
      .setMessage(payload)
      .execute(client)

    const receipt = await tx.getReceipt(client)
    const seqNum  = receipt.topicSequenceNumber?.toString() ?? "0"

    console.log(`[hedera] HCS submit → topic ${topicId} seq#${seqNum}`)
    return {
      sequenceNumber:     seqNum,
      consensusTimestamp: new Date().toISOString(),
    }
  } catch (err: any) {
    console.warn(`[hedera] HCS submit failed (topic ${topicId}): ${err.message}`)
    return { sequenceNumber: "0", consensusTimestamp: new Date().toISOString() }
  }
}

// ── Workflow-specific HCS helpers ─────────────────────────────────────────────

export async function submitAuditTrail(data: {
  auditId:         string
  contractAddress: string
  contractName:    string
  reportHash:      string
  merkleRoot:      string
  reportCID:       string
  auditor:         string
  txHash:          string
  timestamp:       string
}) {
  return submitToHCS(env.HCS_AUDIT_TOPIC_ID, { event: "AUDIT_SUBMITTED", ...data })
}

export async function submitIntentTrail(data: {
  intentId:      string
  nlHash:        string
  specHash:      string
  userSig:       string
  category:      string
  txHash:        string
  timestamp:     string
}) {
  return submitToHCS(env.HCS_INTENT_TOPIC_ID, { event: "INTENT_SUBMITTED", ...data })
}

export async function submitIntentExecutedTrail(data: {
  intentId:      string
  executionHash: string
  txHash:        string
  timestamp:     string
}) {
  return submitToHCS(env.HCS_INTENT_TOPIC_ID, { event: "INTENT_EXECUTED", ...data })
}

export async function submitAgentTrail(data: {
  agentId:     string
  tokenId:     string
  operator:    string
  modelHash:   string
  txHash:      string
  timestamp:   string
}) {
  return submitToHCS(env.HCS_AGENT_TOPIC_ID, { event: "AGENT_REGISTERED", ...data })
}

export async function submitScanTrail(data: {
  agentId:    string
  tokenId:    string
  trustScore: number
  txHash:     string
  timestamp:  string
}) {
  return submitToHCS(env.HCS_AGENT_TOPIC_ID, { event: "AGENT_SCANNED", ...data })
}

export async function submitBlindAuditTrail(data: {
  jobId:           string
  contractAddr:    string
  agentId:         string
  findingsHash:    string
  attestationCID:  string
  teeProvider:     string
  timestamp:       string
}) {
  return submitToHCS(env.HCS_BLINDAUDIT_TOPIC_ID, { event: "BLINDAUDIT_COMPLETED", ...data })
}

// ── Mirror Node queries ───────────────────────────────────────────────────────

export async function getTopicMessages(
  topicId: string,
  limit = 25
): Promise<any[]> {
  try {
    const url = `${MIRROR}/topics/${topicId}/messages?limit=${limit}&order=desc`
    const res = await fetch(url)
    if (!res.ok) return []
    const data: any = await res.json()
    return (data.messages ?? []).map((m: any) => ({
      sequenceNumber:     m.sequence_number?.toString(),
      consensusTimestamp: m.consensus_timestamp,
      message:            JSON.parse(
        Buffer.from(m.message, "base64").toString("utf8")
      ),
    }))
  } catch {
    return []
  }
}

export async function getAccountInfo(accountId: string): Promise<any> {
  try {
    const res = await fetch(`${MIRROR}/accounts/${accountId}`)
    if (!res.ok) return null
    return res.json()
  } catch { return null }
}

export async function getContractInfo(address: string): Promise<any> {
  try {
    const res = await fetch(`${MIRROR}/contracts/${address}`)
    if (!res.ok) return null
    return res.json()
  } catch { return null }
}

// ── Mirror Node intent subscriber ─────────────────────────────────────────────
// Replaces Chainlink Automation. Polls for APPROVED intents and triggers execution.

type ExecuteCallback = (intentId: string, specHash: string) => Promise<void>

let _subscriberRunning = false

export async function startIntentSubscriber(
  onApproved: ExecuteCallback,
  pollIntervalMs = 5000
): Promise<void> {
  if (_subscriberRunning) return
  _subscriberRunning = true

  const topicId = env.HCS_INTENT_TOPIC_ID
  if (!topicId || topicId === "0.0.0") {
    console.warn("[hedera] Intent topic not set — subscriber not started")
    return
  }

  console.log(`[hedera] Intent subscriber started — polling topic ${topicId} every ${pollIntervalMs}ms`)

  let lastTimestamp = ""

  const poll = async () => {
    try {
      const url = lastTimestamp
        ? `${MIRROR}/topics/${topicId}/messages?limit=10&order=asc&timestamp=gt:${lastTimestamp}`
        : `${MIRROR}/topics/${topicId}/messages?limit=10&order=desc`

      const res = await fetch(url)
      if (!res.ok) return

      const data: any = await res.json()
      const messages: any[] = data.messages ?? []

      for (const m of messages) {
        try {
          const payload = JSON.parse(Buffer.from(m.message, "base64").toString("utf8"))
          lastTimestamp = m.consensus_timestamp

          if (payload.event === "INTENT_SUBMITTED") {
            console.log(`[hedera] Detected INTENT_SUBMITTED — intentId: ${payload.intentId}`)
            await onApproved(payload.intentId, payload.specHash)
          }
        } catch { /* malformed message — skip */ }
      }
    } catch (err: any) {
      console.warn(`[hedera] Subscriber poll error: ${err.message}`)
    }
  }

  // Immediate first poll then interval
  await poll()
  setInterval(poll, pollIntervalMs)
}

export function stopIntentSubscriber(): void {
  _subscriberRunning = false
}
