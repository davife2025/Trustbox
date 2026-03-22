/* agent/hcs10.ts — TrustBoxHedera AI
   HCS-10 agent registration + message polling using raw @hashgraph/sdk.
   No browser SDKs. Pure Node.js.

   HCS-10 OpenConvAI spec:
     - Agent has an inbound HCS topic (public, anyone can submit)
     - Agent has an outbound HCS topic (agent publishes replies)
     - Messages use JSON envelope: { op, data, operator_id, ... }
     - Registration writes agent profile to a registry topic
*/

import {
  Client,
  AccountId,
  PrivateKey,
  TopicCreateTransaction,
  TopicMessageSubmitTransaction,
  TopicId,
} from "@hashgraph/sdk"
import * as fs   from "fs"
import * as path from "path"
import { env }   from "../config/env"

// ── State file ────────────────────────────────────────────────────────────────

const STATE_FILE = path.resolve(process.cwd(), "agent-state.json")

export interface AgentState {
  accountId:    string
  privateKey:   string
  inboundTopic: string
  outboundTopic:string
  registryUrl:  string
  registeredAt: string
  name:         string
  alias:        string
}

function loadState(): AgentState | null {
  try {
    if (fs.existsSync(STATE_FILE))
      return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"))
  } catch { }
  return null
}

function saveState(s: AgentState) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2))
  console.log(`[hcs10] State saved → ${STATE_FILE}`)
}

// ── Hedera client ─────────────────────────────────────────────────────────────

function buildHederaClient(accountId: string, privateKey: string): Client {
  const client = Client.forTestnet()
  client.setOperator(
    AccountId.fromString(accountId),
    PrivateKey.fromString(privateKey)
  )
  return client
}

// ── Create HCS topic ──────────────────────────────────────────────────────────

async function createTopic(client: Client, memo: string, privateKey: PrivateKey): Promise<string> {
  const tx = await new TopicCreateTransaction()
    .setTopicMemo(memo)
    .setAdminKey(privateKey.publicKey)
    .setSubmitKey(privateKey.publicKey)
    .execute(client)

  const receipt = await tx.getReceipt(client)
  return receipt.topicId!.toString()
}

// ── Register agent ────────────────────────────────────────────────────────────

export async function registerTrustBoxAgent(): Promise<AgentState> {
  const existing = loadState()
  if (existing) {
    console.log(`[hcs10] Already registered: ${existing.accountId}`)
    console.log(`[hcs10] Inbound:  ${existing.inboundTopic}`)
    console.log(`[hcs10] Outbound: ${existing.outboundTopic}`)
    return existing
  }

  const accountId  = env.HOL_AGENT_ACCOUNT_ID  ?? env.HEDERA_OPERATOR_ID
  const privateKey = env.HOL_AGENT_PRIVATE_KEY  ?? env.HEDERA_OPERATOR_KEY

  if (!accountId || !privateKey)
    throw new Error("HEDERA_OPERATOR_ID + HEDERA_OPERATOR_KEY must be set in .env")

  const client = buildHederaClient(accountId, privateKey)
  const pk     = PrivateKey.fromString(privateKey)
  const alias  = `trustbox_${Date.now().toString(36)}`

  console.log(`\n[hcs10] Registering TrustBox AI Agent...`)
  console.log(`[hcs10] Account: ${accountId}`)

  // Create inbound + outbound HCS topics
  console.log(`[hcs10] Creating inbound topic...`)
  const inboundTopic  = await createTopic(client, `TrustBoxHedera AI Agent — inbound (${alias})`, pk)
  console.log(`[hcs10] Creating outbound topic...`)
  const outboundTopic = await createTopic(client, `TrustBoxHedera AI Agent — outbound (${alias})`, pk)

  console.log(`[hcs10] Inbound:  ${inboundTopic}`)
  console.log(`[hcs10] Outbound: ${outboundTopic}`)

  // Publish HCS-11 agent profile to outbound topic
  const profile = {
    op:           "agent_profile",
    operator_id:  accountId,
    name:         "TrustBox AI Agent",
    alias,
    description:  "Verifiable trust infrastructure for AI agents on Hedera. Audit contracts, verify ERC-8004 credentials, execute signed intents, run security scans and blind TEE audits.",
    model:        "llama-3.3-70b-versatile",
    type:         "autonomous",
    capabilities: ["audit", "verify", "execute", "scan", "blindaudit"],
    inbound_topic:  inboundTopic,
    outbound_topic: outboundTopic,
    dapp:         "https://trustboxhedera-ai.vercel.app",
    version:      "1.0.0",
    timestamp:    new Date().toISOString(),
  }

  await submitToTopic(client, pk, outboundTopic, JSON.stringify(profile))
  console.log(`[hcs10] Agent profile published to outbound topic`)

  // Register with HOL Registry via outbound topic message
  const registryMsg = {
    op:           "register",
    operator_id:  accountId,
    agent_profile: profile,
    registry_url: env.HOL_REGISTRY_URL,
  }
  await submitToTopic(client, pk, outboundTopic, JSON.stringify(registryMsg))

  client.close()

  const state: AgentState = {
    accountId,
    privateKey,
    inboundTopic,
    outboundTopic,
    registryUrl:  env.HOL_REGISTRY_URL,
    registeredAt: new Date().toISOString(),
    name:         "TrustBox AI Agent",
    alias,
  }

  saveState(state)

  console.log(`\n[hcs10] ✅ Agent registered!`)
  console.log(`[hcs10] HashScan inbound:  https://hashscan.io/testnet/topic/${inboundTopic}`)
  console.log(`[hcs10] HashScan outbound: https://hashscan.io/testnet/topic/${outboundTopic}`)
  console.log(`\n[hcs10] Add to .env:`)
  console.log(`  HOL_AGENT_INBOUND_TOPIC=${inboundTopic}`)
  console.log(`  HOL_AGENT_OUTBOUND_TOPIC=${outboundTopic}`)

  return state
}

// ── Submit message to HCS topic ───────────────────────────────────────────────

async function submitToTopic(
  client:     Client,
  privateKey: PrivateKey,
  topicId:    string,
  message:    string
): Promise<void> {
  const tx = await new TopicMessageSubmitTransaction()
    .setTopicId(TopicId.fromString(topicId))
    .setMessage(message)
    .execute(client)
  await tx.getReceipt(client)
}

// ── Mirror Node polling ───────────────────────────────────────────────────────

type MessageHandler = (
  sender:  string,
  message: string,
  ctx:     { seqNum?: string }
) => Promise<string>

let _state:  AgentState | null = null
let _lastSeq = 0
let _timer:  ReturnType<typeof setInterval> | null = null

const MIRROR = "https://testnet.mirrornode.hedera.com/api/v1"

async function poll(onMessage: MessageHandler) {
  if (!_state?.inboundTopic) return

  try {
    const url = `${MIRROR}/topics/${_state.inboundTopic}/messages?limit=10&order=asc` +
      (_lastSeq > 0 ? `&sequencenumber=gt:${_lastSeq}` : "")

    const res = await fetch(url)
    if (!res.ok) return

    const data: any = await res.json()
    for (const m of (data.messages ?? [])) {
      _lastSeq = Math.max(_lastSeq, Number(m.sequence_number))

      let payload: any
      try { payload = JSON.parse(Buffer.from(m.message, "base64").toString("utf8")) }
      catch { continue }

      // Accept HCS-10 message envelopes
      const op      = payload.op ?? ""
      const content = String(payload.data ?? payload.message ?? "")
      const sender  = payload.operator_id ?? m.payer_account_id ?? "unknown"

      if (!["message", "connection_request"].includes(op) || !content) continue

      console.log(`[hcs10] ← ${sender}: ${content.slice(0, 80)}`)

      try {
        const reply      = await onMessage(sender, content, { seqNum: String(m.sequence_number) })
        const replyEnv   = JSON.stringify({ op: "message", data: reply, operator_id: _state.accountId, timestamp: new Date().toISOString() })
        const pk         = PrivateKey.fromString(_state.privateKey)
        const hClient    = buildHederaClient(_state.accountId, _state.privateKey)
        await submitToTopic(hClient, pk, _state.outboundTopic, replyEnv)
        hClient.close()
        console.log(`[hcs10] → reply sent to outbound topic`)
      } catch (e: any) {
        console.warn(`[hcs10] handler error: ${e.message}`)
      }
    }
  } catch (e: any) {
    console.warn(`[hcs10] poll error: ${e.message}`)
  }
}

export async function startHCS10Listener(onMessage: MessageHandler, intervalMs = 8000) {
  _state = loadState()
  if (!_state) {
    console.warn("[hcs10] No agent state — POST /api/hol/register first")
    return
  }
  console.log(`[hcs10] Polling inbound topic ${_state.inboundTopic} every ${intervalMs}ms`)
  await poll(onMessage)
  _timer = setInterval(() => poll(onMessage), intervalMs)
}

export function stopHCS10Listener() {
  if (_timer) { clearInterval(_timer); _timer = null }
}

export function getAgentState(): AgentState | null {
  return _state ?? loadState()
}

export async function sendHCS10Message(topicId: string, message: string) {
  const state = getAgentState()
  if (!state) { console.warn("[hcs10] No state"); return }
  try {
    const pk     = PrivateKey.fromString(state.privateKey)
    const client = buildHederaClient(state.accountId, state.privateKey)
    const env_   = JSON.stringify({ op: "message", data: message, operator_id: state.accountId, timestamp: new Date().toISOString() })
    await submitToTopic(client, pk, topicId, env_)
    client.close()
  } catch (e: any) {
    console.warn(`[hcs10] send error: ${e.message}`)
  }
}
