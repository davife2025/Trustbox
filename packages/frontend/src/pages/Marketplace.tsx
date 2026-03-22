import { useState, useEffect } from "react"
import { API_URL } from "../constant"

interface Agent {
  id: string; name: string; operator: string; tokenId: string
  trustScore: number; status: "online"|"offline"|"degraded"
  capabilities: string[]; teeEnabled: boolean; stakeAmount?: string; hcsSeqNum?: string
}

function TrustRing({ score, color }: { score: number; color: string }) {
  const r = 28, circ = 2*Math.PI*r
  const offset = circ - (score/100)*circ
  return (
    <div className="trust-ring" style={{ width:70, height:70 }}>
      <svg width="70" height="70" viewBox="0 0 70 70">
        <circle className="trust-ring-track" cx="35" cy="35" r={r} />
        <circle className="trust-ring-fill"
          cx="35" cy="35" r={r}
          stroke={color}
          strokeDasharray={circ}
          strokeDashoffset={offset}
        />
      </svg>
      <div style={{
        position:"absolute", inset:0, display:"flex",
        flexDirection:"column", alignItems:"center", justifyContent:"center",
      }}>
        <span style={{ fontFamily:"var(--font-display)", fontWeight:800, fontSize:15, color, lineHeight:1 }}>{score}</span>
        <span style={{ fontSize:8, color:"var(--text-3)" }}>TRUST</span>
      </div>
    </div>
  )
}

export default function Marketplace() {
  const [agents,  setAgents]  = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState("")
  const [filter,  setFilter]  = useState<"all"|"online"|"tee">("all")

  useEffect(() => {
    fetch(`${API_URL}/api/agents`).then(r => r.json())
      .then(d => setAgents(d.agents ?? []))
      .catch(console.error).finally(() => setLoading(false))
  }, [])

  const filtered = agents.filter(a => {
    const matchSearch = !search || a.name?.toLowerCase().includes(search.toLowerCase()) || a.id?.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === "all" || (filter === "online" && a.status === "online") || (filter === "tee" && a.teeEnabled)
    return matchSearch && matchFilter
  })

  const scoreColor = (s: number) => s >= 80 ? "var(--teal)" : s >= 60 ? "var(--amber)" : "var(--red)"
  const statusColor = (s: string) => s === "online" ? "var(--teal)" : s === "degraded" ? "var(--amber)" : "var(--text-3)"

  return (
    <div style={{ maxWidth:1100, margin:"0 auto", padding:"32px 24px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:28, flexWrap:"wrap", gap:16 }}>
        <div>
          <h1 style={{ fontFamily:"var(--font-display)", fontWeight:800, fontSize:28, letterSpacing:"-0.02em", marginBottom:6 }}>Agent Marketplace</h1>
          <p style={{ color:"var(--text-2)", fontSize:13 }}>
            Verified AI agents on Hedera AgentMarketplace.sol with HBAR stake.
          </p>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
          {/* Filter pills */}
          {(["all","online","tee"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding:"5px 14px", borderRadius:20, fontSize:11, fontWeight:600,
              fontFamily:"var(--font-display)", cursor:"pointer", border:"none",
              background: filter===f ? "var(--hbar)" : "var(--surface-2)",
              color:      filter===f ? "#000" : "var(--text-3)",
              letterSpacing:"0.04em", textTransform:"uppercase",
            }}>{f === "tee" ? "TEE Enabled" : f}</button>
          ))}
          {/* Search */}
          <input className="input" placeholder="Search agents…"
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ width:200 }}
          />
        </div>
      </div>

      {loading && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:14 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height:200, borderRadius:12 }} />)}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div style={{ textAlign:"center", padding:60, color:"var(--text-2)" }}>
          <div style={{ fontSize:36, marginBottom:12, opacity:.5 }}>🤖</div>
          <p style={{ fontSize:14, fontWeight:500 }}>No agents found</p>
          <p style={{ fontSize:12, color:"var(--text-3)", marginTop:4 }}>Register one via the Security Agent workflow.</p>
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:14 }}>
        {filtered.map((a,i) => (
          <div key={a.id} className="card card-hover fade-in" style={{ animationDelay:`${i*0.06}s`, padding:"18px 20px" }}>
            {/* Top row */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:15, marginBottom:3 }}>{a.name ?? a.id}</div>
                <div style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"var(--text-3)" }}>{a.id}</div>
              </div>
              <TrustRing score={a.trustScore ?? 0} color={scoreColor(a.trustScore ?? 0)} />
            </div>

            {/* Status */}
            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:12 }}>
              <div className="dot" style={{ background:statusColor(a.status) }} />
              <span style={{ fontSize:11, color:statusColor(a.status), fontWeight:500 }}>{a.status}</span>
              {a.stakeAmount && (
                <span style={{ marginLeft:"auto", fontSize:10, color:"var(--amber)", fontFamily:"var(--font-mono)" }}>
                  ⛏ {a.stakeAmount}
                </span>
              )}
            </div>

            {/* Badges */}
            <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom:12 }}>
              {a.teeEnabled && <span className="badge" style={{ color:"var(--purple)", background:"var(--purple-dim)", border:"1px solid rgba(139,92,246,.2)", fontSize:9 }}>🔒 TEE</span>}
              {a.tokenId && a.tokenId !== "0" && <span className="badge" style={{ color:"var(--hbar)", background:"var(--hbar-dim)", border:"1px solid rgba(0,165,224,.2)", fontSize:9 }}>ℏ #{a.tokenId}</span>}
            </div>

            {/* Capabilities */}
            {a.capabilities?.length > 0 && (
              <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                {a.capabilities.slice(0,3).map(cap => (
                  <span key={cap} style={{ background:"var(--surface-2)", borderRadius:4, padding:"2px 8px", fontSize:9, color:"var(--text-3)" }}>{cap}</span>
                ))}
                {a.capabilities.length > 3 && <span style={{ fontSize:9, color:"var(--text-3)" }}>+{a.capabilities.length-3}</span>}
              </div>
            )}

            {a.hcsSeqNum && (
              <div style={{ marginTop:12, paddingTop:10, borderTop:"1px solid var(--border)", fontSize:10, color:"var(--text-3)", fontFamily:"var(--font-mono)" }}>
                HCS seq#{a.hcsSeqNum}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
