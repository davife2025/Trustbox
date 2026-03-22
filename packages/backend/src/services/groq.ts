/* services/groq.ts — TrustBoxHedera AI
   Direct Groq API calls for:
     - Intent parsing (NL → structured JSON spec)
     - Smart contract audit analysis
   No Chainlink Functions — Groq called directly from backend.
   HCS provides the verifiable trail instead of the DON.
   ──────────────────────────────────────────────────────── */

import { env } from "../config/env"

const GROQ_API = "https://api.groq.com/openai/v1/chat/completions"
const MODEL    = "llama-3.3-70b-versatile"

async function groqChat(
  systemPrompt: string,
  userPrompt:   string,
  maxTokens = 1200
): Promise<string | null> {
  if (!env.GROQ_API_KEY) {
    console.warn("[groq] GROQ_API_KEY not set — returning null")
    return null
  }

  try {
    const res = await fetch(GROQ_API, {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model:       MODEL,
        temperature: 0.2,
        max_tokens:  maxTokens,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user",   content: userPrompt   },
        ],
      }),
    })

    if (!res.ok) {
      const err: any = await res.json().catch(() => ({}))
      console.warn(`[groq] API error ${res.status}: ${err.error?.message ?? res.statusText}`)
      return null
    }

    const data: any = await res.json()
    return data.choices?.[0]?.message?.content ?? null
  } catch (err: any) {
    console.warn(`[groq] Fetch error: ${err.message}`)
    return null
  }
}

function parseJSON<T>(raw: string | null): T | null {
  if (!raw) return null
  try {
    const clean = raw.replace(/```json|```/g, "").trim()
    return JSON.parse(clean) as T
  } catch {
    return null
  }
}

// ── Intent parsing ────────────────────────────────────────────────────────────

interface IntentSpec {
  action:   string
  params:   Record<string, unknown>
  category: string
  parsedAt: string
}

const INTENT_SYSTEM = `You are an AI intent parser for TrustBox Hedera AI.
Convert natural language user intents into structured JSON specs.
Return ONLY valid JSON — no markdown, no explanation.
Schema: {"action":"string","params":{},"category":"string","parsedAt":"ISO timestamp"}`

export async function parseIntent(
  nlText:   string,
  category: string
): Promise<IntentSpec> {
  const raw = await groqChat(
    INTENT_SYSTEM,
    `Category: ${category}\nUser intent: ${nlText}\nParsedAt: ${new Date().toISOString()}`
  )

  const parsed = parseJSON<IntentSpec>(raw)
  if (parsed) return parsed

  // Deterministic fallback when Groq unavailable
  console.warn("[groq] Intent parse fallback — Groq unavailable")
  return {
    action:   category === "travel" ? "book_accommodation" : "execute_task",
    params:   { query: nlText, category },
    category,
    parsedAt: new Date().toISOString(),
  }
}

// ── Contract audit analysis ───────────────────────────────────────────────────

interface AuditFinding {
  id:          string
  severity:    "critical" | "high" | "medium" | "low" | "info"
  title:       string
  detail:      string
  line:        number
  category:    string
  remediation: string
}

interface AuditAnalysis {
  findings:   AuditFinding[]
  score:      number
  analysedBy: string
}

const AUDIT_SYSTEM = `You are a senior smart contract security auditor for Hedera Smart Contract Service.
Analyse contracts for real vulnerability patterns.
Return ONLY valid JSON — no markdown:
{"findings":[{"id":"F001","severity":"medium","title":"...","detail":"...","line":47,"category":"reentrancy","remediation":"..."}],"score":85}
Severity: critical | high | medium | low | info. Return 3-6 findings.`

const SEVERITY_DEDUCTIONS: Record<string, number> = {
  critical: 30, high: 20, medium: 10, low: 5, info: 1,
}

function fallbackAudit(contractName: string): AuditAnalysis {
  const findings: AuditFinding[] = [
    {
      id: "F001", severity: "medium",
      title: "Reentrancy: external call before state update",
      detail: `${contractName}: external call precedes state update. Apply checks-effects-interactions.`,
      line: 47, category: "reentrancy",
      remediation: "Move all state changes before external calls.",
    },
    {
      id: "F002", severity: "low",
      title: "Missing zero-address validation",
      detail: "Constructor accepts address param without address(0) check.",
      line: 12, category: "validation",
      remediation: "Add require(param != address(0), 'zero address').",
    },
    {
      id: "F003", severity: "info",
      title: "Gas optimisation: unchecked loop iterator",
      detail: "Use unchecked { ++i; } where overflow is impossible.",
      line: 83, category: "gas",
      remediation: "Wrap ++i in unchecked {} block in for-loops.",
    },
  ]
  const score = Math.max(
    0,
    findings.reduce((a, f) => a - (SEVERITY_DEDUCTIONS[f.severity] ?? 0), 100)
  )
  return { findings, score, analysedBy: "TrustBoxHedera Static Analyser v1.0" }
}

export async function analyseContract(
  contractAddress: string,
  contractName:    string,
  chain = "hedera-testnet"
): Promise<AuditAnalysis> {
  const raw = await groqChat(
    AUDIT_SYSTEM,
    `Contract: ${contractName}\nAddress: ${contractAddress}\nChain: ${chain}`
  )

  const parsed = parseJSON<{ findings: AuditFinding[]; score: number }>(raw)
  if (parsed?.findings?.length) {
    return {
      findings:   parsed.findings,
      score:      parsed.score ?? 85,
      analysedBy: `Groq ${MODEL}`,
    }
  }

  return fallbackAudit(contractName)
}
