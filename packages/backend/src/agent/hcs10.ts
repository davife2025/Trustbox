/* agent/hcs10.ts — TrustBoxHedera AI
   HCS-10 OpenConvAI agent:
     - Registers TrustBox AI Agent in HOL Registry Broker
     - Listens on inbound HCS topic for natural language messages
     - Routes to TrustBox workflow handlers
     - Responds via outbound HCS topic
   ──────────────────────────────────────────────────────────── */

import {
  HCS10Client,
  AgentBuilder,
  AIAgentCapability,
  InboundTopicType,
} from "@hashgraphonline/standards-sdk"
import * as fs   from "fs"
import * as path from "path"
import { env }   from "../config/env"

// ── State file — persists agent identity between restarts ─────────────────────

const STATE_FILE = path.resolve(__dirname, "../../agent-state.json")

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
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"))
    }
  } catch { /* ignore */ }
  return null
}

function saveState(state: AgentState): void {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2))
  console.log(`[hcs10] Agent state saved → ${STATE_FILE}`)
}

// ── Build HCS10Client ─────────────────────────────────────────────────────────

function buildClient(accountId: string, privateKey: string): HCS10Client {
  return new HCS10Client({
    network:                env.HEDERA_NETWORK as "testnet" | "mainnet",
    operatorId:             accountId,
    operatorPrivateKey:     privateKey,
    logLevel:               "info",
    prettyPrint:            true,
    guardedRegistryBaseUrl: env.HOL_REGISTRY_URL,
  })
}

// ── Register agent ────────────────────────────────────────────────────────────

export async function registerTrustBoxAgent(): Promise<AgentState> {
  // Use existing state if already registered
  const existing = loadState()
  if (existing) {
    console.log(`[hcs10] Agent already registered: ${existing.accountId}`)
    console.log(`[hcs10] Inbound:  ${existing.inboundTopic}`)
    console.log(`[hcs10] Outbound: ${existing.outboundTopic}`)
    return existing
  }

  // Use dedicated agent account if provided, otherwise use operator
  const accountId  = env.HOL_AGENT_ACCOUNT_ID  ?? env.HEDERA_OPERATOR_ID
  const privateKey = env.HOL_AGENT_PRIVATE_KEY  ?? env.HEDERA_OPERATOR_KEY

  if (!accountId || !privateKey) {
    throw new Error(
      "HEDERA_OPERATOR_ID and HEDERA_OPERATOR_KEY (or HOL_AGENT_ACCOUNT_ID + HOL_AGENT_PRIVATE_KEY) must be set"
    )
  }

  const client = buildClient(accountId, privateKey)
  const alias  = `trustbox_${Date.now().toString(36)}`

  console.log("\n[hcs10] Registering TrustBox AI Agent in HOL Registry…")
  console.log(`[hcs10] Registry: ${env.HOL_REGISTRY_URL}`)
  console.log(`[hcs10] Account:  ${accountId}`)

  const agentBuilder = new AgentBuilder()
    .setName("TrustBox AI Agent")
    .setAlias(alias)
    .setDescription(
      "Verifiable trust infrastructure for AI agents on Hedera. " +
      "I can audit smart contracts, verify agent credentials (ERC-8004), " +
      "execute signed intents, run security scans, and perform blind TEE audits. " +
      "All results anchored on Hedera Consensus Service."
    )
    .setAgentType("autonomous")
    .setCapabilities([
      AIAgentCapability.TEXT_GENERATION,
      AIAgentCapability.TEXT_SUMMARIZATION,
    ])
    .setModel("llama-3.1-70b-versatile")
    .setInboundTopicType(InboundTopicType.PUBLIC)
    .addProperty("dapp",       "https://trustboxhedera-ai.vercel.app")
    .addProperty("version",    "1.0.0")
    .addProperty("workflows",  "audit,verify,execute,scan,blindaudit")
    .addProperty("erc8004",    "true")
    .addProperty("chain",      "hedera-testnet")
    .addProperty("hbar_stake", "true")

  const result = await client.createAndRegisterAgent(agentBuilder, {
    initialBalance: 5,                    // fund new agent account with 5 HBAR
    progressCallback: (msg: string) => console.log(`[hcs10] ${msg}`),
  })

  const state: AgentState = {
    accountId:     result.accountId,
    privateKey:    result.privateKey ?? privateKey,
    inboundTopic:  result.metadata?.inboundTopicId  ?? "",
    outboundTopic: result.metadata?.outboundTopicId ?? "",
    registryUrl:   env.HOL_REGISTRY_URL,
    registeredAt:  new Date().toISOString(),
    name:          "TrustBox AI Agent",
    alias,
  }

  saveState(state)

  console.log("\n[hcs10] ✅ Agent registered!")
  console.log(`[hcs10] Account:  ${state.accountId}`)
  console.log(`[hcs10] Inbound:  ${state.inboundTopic}`)
  console.log(`[hcs10] Outbound: ${state.outboundTopic}`)
  console.log(`[hcs10] Registry: ${env.HOL_REGISTRY_URL}`)
  console.log(`\n[hcs10] Add to .env:`)
  console.log(`  HOL_AGENT_INBOUND_TOPIC=${state.inboundTopic}`)
  console.log(`  HOL_AGENT_OUTBOUND_TOPIC=${state.outboundTopic}`)

  return state
}

// ── Message listener ──────────────────────────────────────────────────────────

type MessageHandler = (
  sender:  string,
  message: string,
  context: { connectionTopic?: string; sequenceNumber?: string }
) => Promise<string>

let _client: HCS10Client | null = null
let _state:  AgentState  | null = null

export async function startHCS10Listener(onMessage: MessageHandler): Promise<void> {
  _state = loadState()
  if (!_state) {
    console.warn("[hcs10] No agent state found — run registerTrustBoxAgent() first")
    return
  }

  _client = buildClient(_state.accountId, _state.privateKey)

  console.log(`[hcs10] Listening on inbound topic ${_state.inboundTopic}…`)

  // Start monitoring inbound topic for connection requests + messages
  await _client.startMonitoring({
    topicId:           _state.inboundTopic,
    progressCallback:  (msg: string) => console.log(`[hcs10] ${msg}`),
    onConnectionRequest: async (request: any) => {
      console.log(`[hcs10] Connection request from ${request.requestingAccountId}`)
      try {
        await _client!.handleConnectionRequest(request)
        console.log(`[hcs10] Connection accepted: ${request.requestingAccountId}`)
      } catch (err: any) {
        console.warn(`[hcs10] Connection accept failed: ${err.message}`)
      }
    },
    onMessage: async (msg: any) => {
      const sender  = msg.senderAccountId ?? "unknown"
      const content = msg.content ?? msg.message ?? ""
      const connTopic = msg.connectionTopicId

      if (!content) return

      console.log(`[hcs10] Message from ${sender}: ${content.slice(0, 80)}…`)

      try {
        const reply = await onMessage(sender, content, {
          connectionTopic: connTopic,
          sequenceNumber:  msg.sequenceNumber?.toString(),
        })
        // Send reply back on the connection topic
        if (connTopic) {
          await _client!.sendMessage(connTopic, reply)
        } else {
          await _client!.sendMessage(_state!.outboundTopic, reply)
        }
        console.log(`[hcs10] Reply sent to ${sender}`)
      } catch (err: any) {
        console.warn(`[hcs10] Handler error: ${err.message}`)
      }
    },
  })
}

export function getAgentState(): AgentState | null {
  return _state ?? loadState()
}

export async function sendHCS10Message(topicId: string, message: string): Promise<void> {
  const state = getAgentState()
  if (!state || !_client) {
    console.warn("[hcs10] Not connected — cannot send message")
    return
  }
  await _client.sendMessage(topicId, message)
}
