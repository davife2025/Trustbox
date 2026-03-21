/* agent/router.ts — TrustBoxHedera AI
   Natural language router for HCS-10 messages.
   Parses user intent and dispatches to TrustBox workflow handlers.
   Returns a plain-text response suitable for HCS-10 reply.
   ──────────────────────────────────────────────────────────── */

import { parseIntent }    from "../services/groq"
import { analyseContract } from "../services/groq"
import { env }            from "../config/env"

const API_BASE = `http://localhost:${env.PORT ?? 4000}`

// ── Intent classification ─────────────────────────────────────────────────────

type WorkflowType =
  | "audit"
  | "verify"
  | "execute"
  | "scan"
  | "blindaudit"
  | "help"
  | "status"
  | "unknown"

interface ParsedIntent {
  workflow:  WorkflowType
  params:    Record<string, string>
  raw:       string
}

const PATTERNS: Array<{ workflow: WorkflowType; patterns: RegExp[] }> = [
  {
    workflow: "audit",
    patterns: [
      /audit\s+(contract|address|code)/i,
      /analyse?\s+(contract|address)/i,
      /check\s+(contract|this)/i,
      /scan\s+(for\s+)?(vulnerabilit|security|bug)/i,
      /review\s+(contract|code|solidity)/i,
    ],
  },
  {
    workflow: "verify",
    patterns: [
      /verify\s+(agent|ai|model)/i,
      /mint\s+(credential|nft|erc-8004)/i,
      /register\s+(agent|ai)/i,
      /credential\s+(for|agent)/i,
      /erc.?8004/i,
    ],
  },
  {
    workflow: "execute",
    patterns: [
      /execute\s+(intent|action|task)/i,
      /run\s+(this|my|the)\s+(intent|action)/i,
      /book\s+(a|hotel|flight)/i,
      /swap\s+(token|hbar|eth)/i,
      /send\s+(hbar|token)/i,
      /i\s+want\s+to\s+\w+/i,
    ],
  },
  {
    workflow: "scan",
    patterns: [
      /security\s+(scan|check|agent)/i,
      /register\s+(security|tee)\s+agent/i,
      /stake\s+(hbar|agent)/i,
      /scan\s+(agent|tee)/i,
    ],
  },
  {
    workflow: "blindaudit",
    patterns: [
      /blind\s+audit/i,
      /tee\s+audit/i,
      /private\s+audit/i,
      /phala/i,
      /sgx/i,
      /audit.*(private|secret|confidential)/i,
    ],
  },
  {
    workflow: "status",
    patterns: [
      /status|health|alive|running/i,
      /what\s+(can|do)\s+you/i,
      /capabilities/i,
    ],
  },
  {
    workflow: "help",
    patterns: [
      /^help$/i,
      /how\s+(do|can|to)/i,
      /what\s+(is|are|workflows)/i,
      /tell\s+me\s+(about|more)/i,
      /explain/i,
    ],
  },
]

function classifyMessage(message: string): ParsedIntent {
  const lower = message.toLowerCase().trim()

  for (const { workflow, patterns } of PATTERNS) {
    if (patterns.some(p => p.test(lower))) {
      // Extract common params
      const params: Record<string, string> = {}

      const addrMatch = message.match(/0x[a-fA-F0-9]{40}/)
      if (addrMatch) params.address = addrMatch[0]

      const topicMatch = message.match(/\d+\.\d+\.\d+/)
      if (topicMatch) params.topicId = topicMatch[0]

      return { workflow, params, raw: message }
    }
  }

  return { workflow: "unknown", params: {}, raw: message }
}

// ── Workflow handlers ─────────────────────────────────────────────────────────

async function handleHelp(): Promise<string> {
  return `🔐 TrustBox AI Agent — I can help you with:

📋 Smart Contract Audit
  → "Audit contract 0x1234..." or "Check this contract for vulnerabilities"

🤖 Verify AI Agent (ERC-8004)
  → "Verify agent named SecureAudit using model llama-3.1-70b"

⚡ Execute Intent
  → "Book a hotel in Lagos for 3 nights, budget $200/night"
  → "Swap 10 HBAR to USDC"

🛡️ Security Agent Scan
  → "Security scan agent agt_001 with TEE endpoint https://..."

🔐 Blind TEE Audit
  → "Blind audit contract 0x1234... using agent agt_tee_001"

💡 All results are anchored on Hedera Consensus Service (HCS) with absolute finality.
   Visit https://trustboxhedera-ai.vercel.app to use the full dashboard.`
}

async function handleStatus(): Promise<string> {
  return `✅ TrustBox AI Agent is online

Network:   Hedera ${env.HEDERA_NETWORK}
Workflows: audit · verify · execute · scan · blindaudit
Backend:   https://trustboxhedera-backend.onrender.com/health
Dashboard: https://trustboxhedera-ai.vercel.app

Send "help" for workflow examples.`
}

async function handleAudit(parsed: ParsedIntent): Promise<string> {
  const address = parsed.params.address
  if (!address) {
    return `📋 Contract Audit

To audit a contract, send:
  "Audit contract 0x<address>"
  
Example: "Audit contract 0x62e2Ba19a38AcA58B829aEC3ED8Db9bfd89D5Fd3"

I'll run a Groq AI analysis, return findings, and anchor the report on HCS.`
  }

  try {
    const { findings, score, analysedBy } = await analyseContract(address, address.slice(0, 10))
    const critical = findings.filter((f: any) => f.severity === "critical").length
    const high     = findings.filter((f: any) => f.severity === "high").length
    const medium   = findings.filter((f: any) => f.severity === "medium").length

    const findingsSummary = findings.slice(0, 3)
      .map((f: any) => `  • [${f.severity.toUpperCase()}] ${f.title}`)
      .join("\n")

    return `📋 Audit Analysis — ${address.slice(0, 10)}...

Score:     ${score}/100
Findings:  ${findings.length} total (${critical} critical, ${high} high, ${medium} medium)
Analysed:  ${analysedBy}

Top findings:
${findingsSummary}

To anchor this report on-chain, visit:
https://trustboxhedera-ai.vercel.app → Smart Contract → enter ${address}

Full HITL flow: findings → you review → sign → AuditRegistry.sol → HCS trail`
  } catch (err: any) {
    return `⚠️ Analysis failed: ${err.message}\n\nVisit https://trustboxhedera-ai.vercel.app to run the full audit workflow.`
  }
}

async function handleVerify(parsed: ParsedIntent): Promise<string> {
  const agentMatch = parsed.raw.match(/named?\s+["']?([a-zA-Z0-9 _-]+)["']?/i)
  const modelMatch = parsed.raw.match(/model\s+["']?([a-zA-Z0-9._/-]+)["']?/i)

  const agentName = agentMatch?.[1]?.trim() ?? null
  const model     = modelMatch?.[1]?.trim()  ?? null

  if (!agentName) {
    return `🤖 Verify AI Agent (ERC-8004)

To mint an agent credential, send:
  "Verify agent named <name> using model <model>"

Example: "Verify agent named TrustGuard using model llama-3.1-70b"

I'll mint a soulbound ERC-8004 NFT on TrustRegistry.sol and write an HCS trail.
Visit https://trustboxhedera-ai.vercel.app for the full HITL flow.`
  }

  return `🤖 ERC-8004 Credential Mint

Agent:  ${agentName}
Model:  ${model ?? "not specified"}

To complete the mint, visit:
https://trustboxhedera-ai.vercel.app → AI Agent → fill in details → Sign with MetaMask or HashPack

The credential will be:
  • Soulbound (non-transferable)
  • Anchored on TrustRegistry.sol (HSCS chainId 296)
  • Model hash committed on-chain
  • HCS trail written to HCS_AGENT_TOPIC`
}

async function handleExecute(parsed: ParsedIntent): Promise<string> {
  try {
    const spec = await parseIntent(parsed.raw, "general")
    const specJson = JSON.stringify(spec, null, 2)

    return `⚡ Intent Parsed

Your intent: "${parsed.raw.slice(0, 100)}"

Parsed spec:
${specJson}

To execute this intent on-chain:
1. Visit https://trustboxhedera-ai.vercel.app → Intent Command
2. Paste your intent text
3. Review the parsed spec
4. Sign specHash with MetaMask or HashPack
5. Anchored on IntentVault.sol → HCS trail

Note: You sign the specHash (not raw text) — blocking prompt injection.`
  } catch {
    return `⚡ Execute Intent

Send me what you want to do in natural language:
  "Book a hotel in Lagos for 3 nights"
  "Swap 10 HBAR to USDC"

I'll parse it with Groq AI into a structured spec you can review and sign.
Visit https://trustboxhedera-ai.vercel.app for the full flow.`
  }
}

async function handleScan(parsed: ParsedIntent): Promise<string> {
  return `🛡️ Security Agent Scan

To register a security agent on AgentMarketplace.sol:

Required:
  • Agent ID (e.g. agt_001)
  • Agent Name
  • TEE Endpoint URL (https://...)
  • HBAR Stake amount

Visit https://trustboxhedera-ai.vercel.app → Security Agent

The agent will be:
  • Registered on AgentMarketplace.sol with HBAR stake
  • Behavioural scan performed
  • HCS trail written to HCS_AGENT_TOPIC
  • Results verifiable on HashScan`
}

async function handleBlindAudit(parsed: ParsedIntent): Promise<string> {
  const address = parsed.params.address
  return `🔐 Blind TEE Audit

Your code is encrypted and audited inside a Phala SGX enclave.
The source never leaves the TEE.

${address ? `Contract: ${address}` : "Provide a contract address in the full workflow"}

Visit https://trustboxhedera-ai.vercel.app → Code Bundle

Flow:
  1. Code encrypted with agent TEE public key
  2. Dispatched to Phala SGX enclave
  3. Findings hash + SGX attestation quote returned
  4. Attestation anchored on HCS_BLINDAUDIT_TOPIC
  5. Result pinned to IPFS`
}

async function handleUnknown(parsed: ParsedIntent): Promise<string> {
  // Try Groq for a more intelligent response
  try {
    const spec = await parseIntent(parsed.raw, "general")
    if (spec.action && spec.action !== "execute_task") {
      return `I understood: ${spec.action}\n\nVisit https://trustboxhedera-ai.vercel.app to run this workflow.\n\nSend "help" to see what I can do.`
    }
  } catch { /* ignore */ }

  return `I didn't quite understand that. Send "help" to see what I can do.

Quick options:
  • "audit contract 0x..."
  • "verify agent named X"
  • "execute intent: book a hotel..."
  • "security scan agent agt_001"
  • "blind audit contract 0x..."`
}

// ── Main router ───────────────────────────────────────────────────────────────

export async function routeMessage(
  sender:  string,
  message: string
): Promise<string> {
  console.log(`[router] ${sender}: ${message.slice(0, 80)}`)

  const parsed = classifyMessage(message)
  console.log(`[router] Classified as: ${parsed.workflow}`)

  switch (parsed.workflow) {
    case "help":       return handleHelp()
    case "status":     return handleStatus()
    case "audit":      return handleAudit(parsed)
    case "verify":     return handleVerify(parsed)
    case "execute":    return handleExecute(parsed)
    case "scan":       return handleScan(parsed)
    case "blindaudit": return handleBlindAudit(parsed)
    default:           return handleUnknown(parsed)
  }
}
