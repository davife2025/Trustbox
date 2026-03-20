import { useState, useEffect } from "react"
import { API_URL, hashscanContract } from "../constant"

interface Agent {
  id:           string
  name:         string
  operator:     string
  tokenId:      string
  trustScore:   number
  status:       "online" | "offline" | "degraded"
  capabilities: string[]
  teeEnabled:   boolean
  stakeAmount?: string
  hcsSeqNum?:  string
}

export default function Marketplace() {
  const [agents,  setAgents]  = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState("")

  useEffect(() => {
    fetch(`${API_URL}/api/agents`)
      .then(r => r.json())
      .then(d => setAgents(d.agents ?? []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filtered = agents.filter(a =>
    !search ||
    a.name?.toLowerCase().includes(search.toLowerCase()) ||
    a.id?.toLowerCase().includes(search.toLowerCase())
  )

  const statusColor = (s: string) =>
    s === "online" ? "var(--teal)" : s === "degraded" ? "var(--amber)" : "var(--muted)"

  return (
    <div style={{ maxWidth:1100, margin:"0 auto", padding:24 }}>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
        <h1 style={{ fontSize:20, fontWeight:600 }}>Agent Marketplace</h1>
        <span style={{ fontSize:12, color:"var(--muted)" }}>
          {agents.length} agent{agents.length !== 1 ? "s" : ""} registered
        </span>
      </div>
      <p style={{ color:"var(--muted)", fontSize:13, marginBottom:20 }}>
        Verified AI agents registered on Hedera AgentMarketplace with HBAR stake.
        All registrations anchored on HCS.
      </p>

      {/* Search */}
      <input
        className="input"
        style={{ maxWidth:340, marginBottom:20 }}
        placeholder="Search by name or agent ID…"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {loading && (
        <div style={{ textAlign:"center", padding:60 }}>
          <div className="spinner" style={{ margin:"0 auto" }} />
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div style={{ textAlign:"center", padding:60, color:"var(--muted)", fontSize:14 }}>
          No agents found. Register one via the Security Agent workflow.
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(300px,1fr))", gap:14 }}>
        {filtered.map(a => (
          <div key={a.id} className="card fade-in">
            {/* Top row */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
              <div>
                <div style={{ fontWeight:600, fontSize:14 }}>{a.name ?? a.id}</div>
                <div style={{ fontSize:11, color:"var(--muted)", fontFamily:"monospace", marginTop:2 }}>
                  {a.id}
                </div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                <div style={{ width:7, height:7, borderRadius:"50%", background:statusColor(a.status) }} />
                <span style={{ fontSize:11, color:statusColor(a.status) }}>{a.status}</span>
              </div>
            </div>

            {/* Trust score bar */}
            <div style={{ marginBottom:12 }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"var(--muted)", marginBottom:4 }}>
                <span>Trust Score</span>
                <span style={{ color:"var(--hbar)", fontWeight:600 }}>{a.trustScore}/100</span>
              </div>
              <div style={{ background:"var(--surface2)", borderRadius:4, height:4 }}>
                <div style={{
                  width:`${a.trustScore}%`, height:4, borderRadius:4,
                  background: a.trustScore >= 80 ? "var(--teal)" :
                              a.trustScore >= 60 ? "var(--amber)" : "var(--red)",
                  transition:"width .4s",
                }} />
              </div>
            </div>

            {/* Badges */}
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:12 }}>
              {a.teeEnabled && (
                <span className="chain-pill" style={{ color:"var(--purple)", borderColor:"var(--purple)44", fontSize:10 }}>
                  🔒 TEE
                </span>
              )}
              {a.tokenId && a.tokenId !== "0" && (
                <span className="chain-pill" style={{ color:"var(--hbar)", borderColor:"var(--hbar)44", fontSize:10 }}>
                  ℏ Token #{a.tokenId}
                </span>
              )}
              {a.stakeAmount && (
                <span className="chain-pill" style={{ color:"var(--amber)", borderColor:"var(--amber)44", fontSize:10 }}>
                  ⛏ {a.stakeAmount} HBAR
                </span>
              )}
            </div>

            {/* Capabilities */}
            {a.capabilities?.length > 0 && (
              <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                {a.capabilities.slice(0, 4).map(cap => (
                  <span key={cap} style={{
                    background:"var(--surface2)", borderRadius:4,
                    padding:"2px 8px", fontSize:10, color:"var(--muted)",
                  }}>{cap}</span>
                ))}
                {a.capabilities.length > 4 && (
                  <span style={{ fontSize:10, color:"var(--muted)" }}>+{a.capabilities.length - 4}</span>
                )}
              </div>
            )}

            {/* HCS link */}
            {a.hcsSeqNum && (
              <div style={{ marginTop:10, paddingTop:10, borderTop:"1px solid var(--border)" }}>
                <span style={{ fontSize:11, color:"var(--muted)" }}>HCS seq#{a.hcsSeqNum}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
