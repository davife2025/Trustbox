import { useState } from "react"
import { useHistory }   from "../hooks/useHistory"
import { hashscanTx, hashscanTopic, HASHSCAN } from "../constant"

type Tab = "audits" | "intents" | "agents" | "blindaudits"

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id:"audits",     label:"Audits",      icon:"📋" },
  { id:"intents",    label:"Intents",     icon:"⚡" },
  { id:"agents",     label:"Agents",      icon:"🤖" },
  { id:"blindaudits",label:"Blind Audits",icon:"🔐" },
]

export function HistoryPage() {
  const [tab, setTab] = useState<Tab>("audits")
  const { audits, intents, agents, blindaudits, loading } = useHistory()

  const data: Record<Tab, any[]> = { audits, intents, agents, blindaudits }
  const items = data[tab]

  return (
    <div style={{ maxWidth:960, margin:"0 auto", padding:24 }}>
      <h1 style={{ fontSize:20, fontWeight:600, marginBottom:20 }}>Activity History</h1>
      <p style={{ color:"var(--muted)", fontSize:13, marginBottom:24 }}>
        Sourced from Hedera Mirror Node — every record has an HCS consensus timestamp.
      </p>

      {/* Tabs */}
      <div style={{ display:"flex", gap:4, marginBottom:24, borderBottom:"1px solid var(--border)", paddingBottom:0 }}>
        {TABS.map(t => (
          <button key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              background: "none", border:"none",
              borderBottom: tab === t.id ? "2px solid var(--hbar)" : "2px solid transparent",
              padding:"10px 16px", cursor:"pointer",
              fontSize:13, fontWeight: tab === t.id ? 600 : 400,
              color: tab === t.id ? "var(--hbar)" : "var(--muted)",
            }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ textAlign:"center", padding:60 }}>
          <div className="spinner" style={{ margin:"0 auto" }} />
        </div>
      )}

      {!loading && items.length === 0 && (
        <div style={{ textAlign:"center", padding:60, color:"var(--muted)", fontSize:14 }}>
          No {tab} recorded yet. Run a workflow from the Dashboard.
        </div>
      )}

      {!loading && items.map((item, i) => (
        <div key={item.id ?? i} className="card fade-in" style={{ marginBottom:10 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div>
              {tab === "audits" && (
                <>
                  <div style={{ fontWeight:600, fontSize:14 }}>
                    {item.contractName ?? item.contractAddress}
                  </div>
                  <div style={{ color:"var(--muted)", fontSize:12, marginTop:2 }}>
                    Score: <span style={{ color:"var(--hbar)" }}>{item.score ?? "—"}/100</span>
                    {item.hcsSeqNum && ` · HCS seq#${item.hcsSeqNum}`}
                  </div>
                </>
              )}
              {tab === "intents" && (
                <>
                  <div style={{ fontWeight:600, fontSize:14 }}>
                    {item.category ?? "Intent"} — {item.intentId ?? "—"}
                  </div>
                  <div style={{ color:"var(--muted)", fontSize:12, marginTop:2 }}>
                    {item.hcsSeqNum && `HCS seq#${item.hcsSeqNum}`}
                  </div>
                </>
              )}
              {tab === "agents" && (
                <>
                  <div style={{ fontWeight:600, fontSize:14 }}>
                    {item.agentId ?? item.id}
                  </div>
                  <div style={{ color:"var(--muted)", fontSize:12, marginTop:2 }}>
                    Token #{item.tokenId ?? "—"}
                    {item.trustScore !== undefined && ` · Trust: ${item.trustScore}/100`}
                  </div>
                </>
              )}
              {tab === "blindaudits" && (
                <>
                  <div style={{ fontWeight:600, fontSize:14 }}>
                    Job {item.jobId ?? "—"}
                  </div>
                  <div style={{ color:"var(--muted)", fontSize:12, marginTop:2 }}>
                    {item.teeProvider ?? "Phala"} · {item.hcsSeqNum && `HCS seq#${item.hcsSeqNum}`}
                  </div>
                </>
              )}
            </div>

            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:11, color:"var(--muted)" }}>
                {item.auditedAt ?? item.timestamp ?? item.registeredAt ?? "—"}
              </div>
              {item.txHash && (
                <a href={hashscanTx(item.txHash)} target="_blank" rel="noreferrer"
                  style={{ fontSize:11, color:"var(--hbar)", display:"block", marginTop:4 }}>
                  HashScan ↗
                </a>
              )}
              {item.hcsTopicId && (
                <a href={hashscanTopic(item.hcsTopicId)} target="_blank" rel="noreferrer"
                  style={{ fontSize:11, color:"var(--teal)", display:"block" }}>
                  HCS Trail ↗
                </a>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
