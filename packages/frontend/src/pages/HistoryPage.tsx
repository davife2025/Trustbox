import { useState } from "react"
import { useHistory } from "../hooks/useHistory"
import { hashscanTx, hashscanTopic, HASHSCAN } from "../constant"

type Tab = "audits"|"intents"|"agents"|"blindaudits"

const TABS: { id:Tab; label:string; icon:string; color:string }[] = [
  { id:"audits",     label:"Audits",      icon:"📋", color:"var(--hbar)"   },
  { id:"intents",    label:"Intents",     icon:"⚡", color:"var(--teal)"   },
  { id:"agents",     label:"Agents",      icon:"🤖", color:"var(--purple)" },
  { id:"blindaudits",label:"Blind Audits",icon:"🔐", color:"var(--red)"    },
]

function TimeAgo({ timestamp }: { timestamp: string }) {
  const diff = Date.now() - new Date(timestamp).getTime()
  const m = Math.floor(diff/60000), h = Math.floor(m/60), d = Math.floor(h/24)
  const label = d > 0 ? `${d}d ago` : h > 0 ? `${h}h ago` : m > 0 ? `${m}m ago` : "just now"
  return <span style={{ fontSize:11, color:"var(--text-3)", fontFamily:"var(--font-mono)" }}>{label}</span>
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? "var(--teal)" : score >= 60 ? "var(--amber)" : "var(--red)"
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
      <div style={{ width:48, height:4, borderRadius:2, background:"var(--surface-3)" }}>
        <div style={{ width:`${score}%`, height:"100%", borderRadius:2, background:color, transition:"width .5s" }} />
      </div>
      <span style={{ fontSize:11, fontFamily:"var(--font-mono)", color, fontWeight:600 }}>{score}</span>
    </div>
  )
}

export default function HistoryPage() {
  const [tab, setTab] = useState<Tab>("audits")
  const { audits, intents, agents, blindaudits, loading } = useHistory()

  const data: Record<Tab, any[]> = { audits, intents, agents, blindaudits }
  const items = data[tab]
  const activeTab = TABS.find(t => t.id === tab)!

  return (
    <div style={{ maxWidth:960, margin:"0 auto", padding:"32px 24px" }}>
      {/* Header */}
      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontFamily:"var(--font-display)", fontWeight:800, fontSize:28, letterSpacing:"-0.02em", marginBottom:6 }}>Activity History</h1>
        <p style={{ color:"var(--text-2)", fontSize:13 }}>
          Sourced from Hedera Mirror Node — every record has an immutable HCS consensus timestamp.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:4, marginBottom:24, borderBottom:"1px solid var(--border)", paddingBottom:0 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            background:"none", border:"none",
            borderBottom: tab===t.id ? `2px solid ${t.color}` : "2px solid transparent",
            marginBottom:-1, padding:"10px 16px",
            cursor:"pointer", fontSize:13,
            fontWeight: tab===t.id ? 700 : 400,
            fontFamily: tab===t.id ? "var(--font-display)" : "var(--font-body)",
            color: tab===t.id ? t.color : "var(--text-3)",
            transition:"all .15s",
          }}>
            {t.icon} {t.label}
            <span style={{
              marginLeft:8, fontSize:10, padding:"1px 6px", borderRadius:10,
              background: tab===t.id ? t.color+"22" : "var(--surface-2)",
              color: tab===t.id ? t.color : "var(--text-3)",
            }}>
              {data[t.id].length}
            </span>
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign:"center", padding:60 }}>
          <div className="spinner" style={{ margin:"0 auto 12px" }} />
          <p style={{ color:"var(--text-3)", fontSize:12 }}>Fetching from Mirror Node…</p>
        </div>
      )}

      {/* Empty */}
      {!loading && items.length === 0 && (
        <div style={{
          textAlign:"center", padding:"60px 24px",
          background:"var(--surface)", border:"1px solid var(--border)",
          borderRadius:12,
        }}>
          <div style={{ fontSize:36, marginBottom:12, opacity:.5 }}>{activeTab.icon}</div>
          <p style={{ color:"var(--text-2)", fontSize:14, fontWeight:500 }}>No {tab} yet</p>
          <p style={{ color:"var(--text-3)", fontSize:12, marginTop:4 }}>Run a workflow from the Dashboard to see it here.</p>
        </div>
      )}

      {/* Items */}
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {items.map((item, i) => (
          <div key={item.id ?? item.txHash ?? i}
            className="card fade-in"
            style={{ animationDelay:`${i*0.04}s`, padding:"16px 18px" }}
          >
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12 }}>
              <div style={{ flex:1, minWidth:0 }}>
                {/* Audit */}
                {tab === "audits" && (
                  <>
                    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                      <span style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:14 }}>
                        {item.contractName ?? item.contractAddress?.slice(0,12)+"…"}
                      </span>
                      {item.score !== undefined && <ScoreBadge score={item.score} />}
                    </div>
                    <div style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"var(--text-3)" }}>
                      {item.contractAddress}
                    </div>
                  </>
                )}
                {/* Intent */}
                {tab === "intents" && (
                  <>
                    <div style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:14, marginBottom:4 }}>
                      {item.category ?? "Intent"} <span style={{ color:"var(--text-3)", fontWeight:400 }}>#{item.intentId ?? "—"}</span>
                    </div>
                    {item.specHash && (
                      <div style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"var(--text-3)" }}>
                        specHash: {item.specHash?.slice(0,22)}…
                      </div>
                    )}
                  </>
                )}
                {/* Agent */}
                {tab === "agents" && (
                  <>
                    <div style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:14, marginBottom:4 }}>
                      {item.agentId ?? item.id}
                    </div>
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                      {item.tokenId && <span className="badge" style={{ color:"var(--hbar)", background:"var(--hbar-dim)", fontSize:9 }}>Token #{item.tokenId}</span>}
                      {item.trustScore !== undefined && <span className="badge" style={{ color:"var(--teal)", background:"var(--teal-dim)", fontSize:9 }}>Score: {item.trustScore}/100</span>}
                    </div>
                  </>
                )}
                {/* Blind audit */}
                {tab === "blindaudits" && (
                  <>
                    <div style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:14, marginBottom:4 }}>
                      Job {item.jobId ?? "—"}
                    </div>
                    <div style={{ fontSize:11, color:"var(--text-3)" }}>
                      {item.teeProvider ?? "Phala Network"} · {item.valid ? "✓ Valid attestation" : "Attestation pending"}
                    </div>
                  </>
                )}
              </div>

              <div style={{ textAlign:"right", flexShrink:0 }}>
                <TimeAgo timestamp={item.auditedAt ?? item.timestamp ?? item.registeredAt ?? new Date().toISOString()} />
                <div style={{ marginTop:6, display:"flex", gap:6, justifyContent:"flex-end" }}>
                  {item.txHash && (
                    <a href={hashscanTx(item.txHash)} target="_blank" rel="noreferrer"
                      className="badge" style={{ color:"var(--hbar)", background:"var(--hbar-dim)", textDecoration:"none", fontSize:9 }}>
                      TX ↗
                    </a>
                  )}
                  {item.hcsTopicId && (
                    <a href={hashscanTopic(item.hcsTopicId)} target="_blank" rel="noreferrer"
                      className="badge" style={{ color:"var(--teal)", background:"var(--teal-dim)", textDecoration:"none", fontSize:9 }}>
                      HCS ↗
                    </a>
                  )}
                  {item.hcsSeqNum && (
                    <span style={{ fontSize:10, color:"var(--text-3)", fontFamily:"var(--font-mono)" }}>
                      #{item.hcsSeqNum}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
