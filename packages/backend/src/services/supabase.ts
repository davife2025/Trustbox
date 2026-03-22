/* services/supabase.ts — TrustBoxHedera AI
   Supabase persistence layer.
   Falls back to in-memory store when SUPABASE_URL not set (demo mode).

   Tables (create in Supabase dashboard SQL editor):
   ─────────────────────────────────────────────────
   CREATE TABLE audits (
     id          TEXT PRIMARY KEY,
     wallet      TEXT,
     contract    TEXT,
     score       INT,
     report_cid  TEXT,
     tx_hash     TEXT,
     hcs_seq     TEXT,
     created_at  TIMESTAMPTZ DEFAULT NOW()
   );
   CREATE TABLE intents (
     id            TEXT PRIMARY KEY,
     wallet        TEXT,
     category      TEXT,
     spec_hash     TEXT,
     execution_hash TEXT,
     tx_hash       TEXT,
     hcs_seq       TEXT,
     created_at    TIMESTAMPTZ DEFAULT NOW()
   );
   CREATE TABLE agents (
     id          TEXT PRIMARY KEY,
     wallet      TEXT,
     agent_name  TEXT,
     model       TEXT,
     token_id    TEXT,
     tx_hash     TEXT,
     hcs_seq     TEXT,
     created_at  TIMESTAMPTZ DEFAULT NOW()
   );
   CREATE TABLE blindaudits (
     id              TEXT PRIMARY KEY,
     wallet          TEXT,
     contract_addr   TEXT,
     job_id          TEXT,
     findings_hash   TEXT,
     attestation_cid TEXT,
     hcs_seq         TEXT,
     created_at      TIMESTAMPTZ DEFAULT NOW()
   );
*/

import { env } from "../config/env"

// ── In-memory fallback ────────────────────────────────────────────────────────

const mem: Record<string, any[]> = {
  audits: [], intents: [], agents: [], blindaudits: [],
}

// ── Supabase client (lazy) ────────────────────────────────────────────────────

let _sb: any = null

async function getClient() {
  if (!env.SUPABASE_URL || !env.SUPABASE_KEY) return null
  if (_sb) return _sb
  const { createClient } = await import("@supabase/supabase-js")
  _sb = createClient(env.SUPABASE_URL, env.SUPABASE_KEY)
  return _sb
}

const HAS_SUPABASE = !!(process.env.SUPABASE_URL && process.env.SUPABASE_KEY)

if (!HAS_SUPABASE) {
  console.warn("[supabase] SUPABASE_URL/KEY not set — using in-memory store")
}

// ── Generic helpers ───────────────────────────────────────────────────────────

async function insert(table: string, record: any): Promise<void> {
  const sb = await getClient()
  if (!sb) { mem[table]?.unshift(record); return }
  const { error } = await sb.from(table).insert(record)
  if (error) {
    console.warn(`[supabase] insert ${table}: ${error.message} — falling back to memory`)
    mem[table]?.unshift(record)
  }
}

async function select(table: string, wallet?: string, limit = 50): Promise<any[]> {
  const sb = await getClient()
  if (!sb) {
    const rows = mem[table] ?? []
    return wallet ? rows.filter(r => r.wallet === wallet) : rows.slice(0, limit)
  }
  let q = sb.from(table).select("*").order("created_at", { ascending: false }).limit(limit)
  if (wallet) q = q.eq("wallet", wallet)
  const { data, error } = await q
  if (error) {
    console.warn(`[supabase] select ${table}: ${error.message}`)
    return mem[table] ?? []
  }
  return data ?? []
}

// ── Typed insert helpers ──────────────────────────────────────────────────────

export async function saveAudit(data: {
  id: string; wallet: string; contract: string
  score: number; reportCid: string; txHash: string; hcsSeq: string
}) {
  return insert("audits", {
    id: data.id, wallet: data.wallet, contract: data.contract,
    score: data.score, report_cid: data.reportCid,
    tx_hash: data.txHash, hcs_seq: data.hcsSeq,
  })
}

export async function saveIntent(data: {
  id: string; wallet: string; category: string
  specHash: string; executionHash: string; txHash: string; hcsSeq: string
}) {
  return insert("intents", {
    id: data.id, wallet: data.wallet, category: data.category,
    spec_hash: data.specHash, execution_hash: data.executionHash,
    tx_hash: data.txHash, hcs_seq: data.hcsSeq,
  })
}

export async function saveAgent(data: {
  id: string; wallet: string; agentName: string
  model: string; tokenId: string; txHash: string; hcsSeq: string
}) {
  return insert("agents", {
    id: data.id, wallet: data.wallet, agent_name: data.agentName,
    model: data.model, token_id: data.tokenId,
    tx_hash: data.txHash, hcs_seq: data.hcsSeq,
  })
}

export async function saveBlindAudit(data: {
  id: string; wallet: string; contractAddr: string; jobId: string
  findingsHash: string; attestationCid: string; hcsSeq: string
}) {
  return insert("blindaudits", {
    id: data.id, wallet: data.wallet, contract_addr: data.contractAddr,
    job_id: data.jobId, findings_hash: data.findingsHash,
    attestation_cid: data.attestationCid, hcs_seq: data.hcsSeq,
  })
}

// ── Query helpers ─────────────────────────────────────────────────────────────

export const getAudits      = (wallet?: string) => select("audits",      wallet)
export const getIntents     = (wallet?: string) => select("intents",     wallet)
export const getAgents      = (wallet?: string) => select("agents",      wallet)
export const getBlindAudits = (wallet?: string) => select("blindaudits", wallet)

export async function getDashboardStats(wallet?: string) {
  const [audits, intents, agents] = await Promise.all([
    getAudits(wallet), getIntents(wallet), getAgents(wallet),
  ])
  return {
    totalAudits:  audits.length,
    totalIntents: intents.length,
    totalAgents:  agents.length,
    recentActivity: [
      ...audits.slice(0,3).map(a => ({ type:"audit",  id:a.id, label:`Audit: ${a.contract?.slice(0,10)}…`, timestamp:a.created_at, txHash:a.tx_hash, hcsSeq:a.hcs_seq })),
      ...intents.slice(0,2).map(i => ({ type:"intent", id:i.id, label:`Intent: ${i.category}`,             timestamp:i.created_at, txHash:i.tx_hash, hcsSeq:i.hcs_seq })),
      ...agents.slice(0,2).map(a => ({ type:"agent",  id:a.id, label:`Agent: ${a.agent_name}`,            timestamp:a.created_at, txHash:a.tx_hash, hcsSeq:a.hcs_seq })),
    ].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0,10),
    unreadNotifs: 0,
  }
}
