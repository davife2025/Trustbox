/* agent/router.ts — TrustBoxHedera AI — Fixed
   - Removed unused API_BASE
   - Single import block from groq
   - Better unknown handler
*/

import { parseIntent, analyseContract } from "../services/groq"
import { env } from "../config/env"

type WorkflowType = "audit"|"verify"|"execute"|"scan"|"blindaudit"|"help"|"status"|"unknown"

interface ParsedIntent {
  workflow: WorkflowType
  params:   Record<string, string>
  raw:      string
}

const PATTERNS: Array<{ workflow: WorkflowType; patterns: RegExp[] }> = [
  { workflow: "audit",      patterns: [/audit\s+(contract|address|code)/i, /analys[ei]\s+(contract|address)/i, /check\s+(contract|this)/i, /scan\s+(for\s+)?(vulnerabilit|security|bug)/i, /review\s+(contract|code|solidity)/i] },
  { workflow: "verify",     patterns: [/verify\s+(agent|ai|model)/i, /mint\s+(credential|nft|erc-?8004)/i, /register\s+(agent|ai)/i, /credential\s+(for|agent)/i, /erc.?8004/i] },
  { workflow: "execute",    patterns: [/execute\s+(intent|action|task)/i, /run\s+(this|my|the)\s+(intent|action)/i, /book\s+(a|hotel|flight)/i, /swap\s+(token|hbar|eth)/i, /send\s+(hbar|token)/i, /i\s+want\s+to\s+\w+/i] },
  { workflow: "scan",       patterns: [/security\s+(scan|check|agent)/i, /register\s+(security|tee)\s+agent/i, /stake\s+(hbar|agent)/i, /scan\s+(agent|tee)/i] },
  { workflow: "blindaudit", patterns: [/blind\s+audit/i, /tee\s+audit/i, /private\s+audit/i, /phala/i, /sgx/i, /audit.*(private|secret|confidential)/i] },
  { workflow: "status",     patterns: [/\b(status|health|alive|running|online)\b/i, /what\s+(can|do)\s+you/i, /capabilities/i] },
  { workflow: "help",       patterns: [/^help$/i, /how\s+(do|can|to)/i, /what\s+(is|are|workflows)/i, /tell\s+me\s+(about|more)/i, /^explain/i] },
]

function classifyMessage(message: string): ParsedIntent {
  const lower = message.toLowerCase().trim()
  for (const { workflow, patterns } of PATTERNS) {
    if (patterns.some(p => p.test(lower))) {
      const params: Record<string, string> = {}
      const addr = message.match(/0x[a-fA-F0-9]{40}/)
      if (addr) params.address = addr[0]
      const topic = message.match(/\d+\.\d+\.\d+/)
      if (topic) params.topicId = topic[0]
      return { workflow, params, raw: message }
    }
  }
  return { workflow: "unknown", params: {}, raw: message }
}

async function handleHelp(): Promise<string> {
  return `🔐 TrustBox AI Agent — workflows I support:

📋 Smart Contract Audit
   "Audit contract 0x1234..."

🤖 Verify AI Agent (ERC-8004 NFT)
   "Verify agent named TrustGuard using model llama-3.1-70b"

⚡ Execute Intent
   "Book a hotel in Lagos for 3 nights, budget $200/night"

🛡️ Security Agent Scan
   "Security scan agent agt_001 with TEE endpoint https://..."

🔐 Blind TEE Audit
   "Blind audit contract 0x1234..."

💡 All results anchored on HCS with absolute Hedera finality.
   Full dashboard: https://trustboxhedera-ai.vercel.app`
}

async function handleStatus(): Promise<string> {
  return `✅ TrustBox AI Agent — online

Network:   Hedera ${env.HEDERA_NETWORK}
Contracts: TrustRegistry · AuditRegistry · AgentMarketplace · IntentVault
Workflows: audit · verify · execute · scan · blindaudit
Dashboard: https://trustboxhedera-ai.vercel.app

Send "help" for examples.`
}

async function handleAudit(parsed: ParsedIntent): Promise<string> {
  const address = parsed.params.address
  if (!address) {
    return `📋 Contract Audit

Send: "Audit contract 0x<address>"
Example: "Audit contract 0x7Dd290DaF02F98d3d583fb35540c5d78dDeCEcbA"

I'll run Groq AI analysis and return structured findings.
To anchor on-chain: https://trustboxhedera-ai.vercel.app → Smart Contract`
  }
  try {
    const { findings, score, analysedBy } = await analyseContract(address, address.slice(0, 10))
    const critical = findings.filter((f: any) => f.severity === "critical").length
    const high     = findings.filter((f: any) => f.severity === "high").length
    const medium   = findings.filter((f: any) => f.severity === "medium").length
    const top = findings.slice(0, 3).map((f: any) => `  • [${f.severity.toUpperCase()}] ${f.title}`).join("\n")
    return `📋 Audit — ${address.slice(0, 10)}...

Score:    ${score}/100
Findings: ${findings.length} (${critical} critical · ${high} high · ${medium} medium)
By:       ${analysedBy}

Top findings:
${top}

To sign + anchor on AuditRegistry.sol:
https://trustboxhedera-ai.vercel.app → Smart Contract → ${address}`
  } catch (err: any) {
    return `⚠️ Analysis error: ${err.message}\n\nTry the full workflow at https://trustboxhedera-ai.vercel.app`
  }
}

async function handleVerify(parsed: ParsedIntent): Promise<string> {
  const agentMatch = parsed.raw.match(/named?\s+["']?([a-zA-Z0-9 _-]+?)["']?(?:\s|$|using)/i)
  const modelMatch = parsed.raw.match(/(?:model|using)\s+["']?([a-zA-Z0-9._/:-]+)["']?/i)
  const agentName  = agentMatch?.[1]?.trim() ?? null
  const model      = modelMatch?.[1]?.trim()  ?? null

  if (!agentName) {
    return `🤖 Verify AI Agent (ERC-8004)

Send: "Verify agent named <name> using model <model>"
Example: "Verify agent named TrustGuard using model llama-3.1-70b"

Full HITL flow: https://trustboxhedera-ai.vercel.app → AI Agent`
  }
  return `🤖 ERC-8004 Credential Mint

Agent: ${agentName}
Model: ${model ?? "not specified"}

To mint the soulbound NFT:
https://trustboxhedera-ai.vercel.app → AI Agent → Sign with MetaMask or HashPack

The credential is:
  • Soulbound on TrustRegistry.sol (HSCS chainId 296)
  • Model hash committed on-chain
  • HCS trail on HCS_AGENT_TOPIC`
}

async function handleExecute(parsed: ParsedIntent): Promise<string> {
  try {
    const spec     = await parseIntent(parsed.raw, "general")
    const specJson = JSON.stringify(spec, null, 2)
    return `⚡ Intent Parsed by Groq

"${parsed.raw.slice(0, 100)}"

Structured spec:
${specJson}

To sign + execute on IntentVault.sol:
1. https://trustboxhedera-ai.vercel.app → Intent Command
2. Review spec → Sign specHash → Anchored on HCS`
  } catch {
    return `⚡ Execute Intent

Send natural language — I'll parse it with Groq:
  "Book a hotel in Lagos for 3 nights"
  "Swap 10 HBAR to USDC"

Full flow: https://trustboxhedera-ai.vercel.app → Intent Command`
  }
}

async function handleScan(_parsed: ParsedIntent): Promise<string> {
  return `🛡️ Security Agent Scan

Required: Agent ID · Agent Name · TEE Endpoint URL · HBAR Stake

Full workflow: https://trustboxhedera-ai.vercel.app → Security Agent

Registers on AgentMarketplace.sol with HBAR stake.
Behavioural scan + HCS trail on HCS_AGENT_TOPIC.`
}

async function handleBlindAudit(parsed: ParsedIntent): Promise<string> {
  const address = parsed.params.address
  return `🔐 Blind TEE Audit

Code audited inside Phala SGX — source never leaves the enclave.
${address ? `Contract: ${address}` : "Provide contract address in the full workflow"}

Full flow: https://trustboxhedera-ai.vercel.app → Code Bundle

Result: findings hash + SGX attestation anchored on HCS_BLINDAUDIT_TOPIC`
}

async function handleUnknown(parsed: ParsedIntent): Promise<string> {
  // Try Groq to interpret the message
  try {
    const spec = await parseIntent(parsed.raw, "general")
    const action = spec?.action
    if (action && action !== "execute_task" && action !== "unknown") {
      return `I think you want to: ${action}\n\nVisit https://trustboxhedera-ai.vercel.app to run this workflow.\n\nSend "help" to see all options.`
    }
  } catch { /* ignore */ }

  return `I didn't understand that. Try one of these:

  • "audit contract 0x..."
  • "verify agent named X using model Y"
  • "book a hotel in Lagos for 3 nights"
  • "security scan agent agt_001"
  • "blind audit contract 0x..."
  • "help" — see all workflows
  • "status" — check if I'm online`
}

export async function routeMessage(sender: string, message: string): Promise<string> {
  console.log(`[router] ${sender}: ${message.slice(0, 80)}`)
  const parsed = classifyMessage(message)
  console.log(`[router] → ${parsed.workflow}`)

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
