import { useState } from "react"
import { useNavigate }       from "react-router-dom"
import { useWalletContext }  from "../context/WalletContext"
import { useAuthContext }    from "../context/AuthContext"
import { useDashboard }      from "../hooks/useDashboard"
import { ENTITY_TYPES, EntityType, ACTION_META } from "../constant"
import ResultsDrawer from "../components/ResultsDrawer"

export default function Dashboard() {
  const nav  = useNavigate()
  const { address, isConnected, connectMetaMask, connectHashConnect } = useWalletContext()
  const { isAuthed, login, loading: authLoading } = useAuthContext()
  const { stats } = useDashboard()

  const [selected,    setSelected]    = useState<EntityType | null>(null)
  const [fields,      setFields]      = useState<Record<string, string>>({})
  const [drawerOpen,  setDrawerOpen]  = useState(false)
  const [lastResult,  setLastResult]  = useState<any>(null)

  // ── Not connected ─────────────────────────────────────────────────────────
  if (!isConnected) return (
    <div style={{ minHeight:"calc(100vh - 56px)", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div className="card" style={{ textAlign:"center", padding:"40px 48px", maxWidth:400 }}>
        <div style={{ fontSize:32, marginBottom:16 }}>ℏ</div>
        <h2 style={{ fontWeight:600, marginBottom:8 }}>Connect your wallet</h2>
        <p style={{ color:"var(--muted)", fontSize:13, marginBottom:24 }}>
          Use MetaMask with Hedera Testnet or HashPack for native Hedera signing.
        </p>
        <div style={{ display:"flex", gap:10, flexDirection:"column" }}>
          <button className="btn btn-primary" style={{ justifyContent:"center" }}
            onClick={connectMetaMask}>🦊 MetaMask + Hashio RPC</button>
          <button className="btn btn-outline" style={{ justifyContent:"center" }}
            onClick={connectHashConnect}>♦ HashPack (HashConnect)</button>
        </div>
      </div>
    </div>
  )

  // ── Not signed in ──────────────────────────────────────────────────────────
  if (!isAuthed) return (
    <div style={{ minHeight:"calc(100vh - 56px)", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div className="card" style={{ textAlign:"center", padding:"40px 48px", maxWidth:380 }}>
        <div style={{ fontSize:32, marginBottom:16 }}>🔐</div>
        <h2 style={{ fontWeight:600, marginBottom:8 }}>Sign in</h2>
        <p style={{ color:"var(--muted)", fontSize:13, marginBottom:24 }}>
          Sign a message with your wallet to authenticate. No gas required.
        </p>
        <button className="btn btn-primary" style={{ width:"100%", justifyContent:"center" }}
          onClick={() => login()} disabled={authLoading}>
          {authLoading ? "Signing…" : "Sign in to TrustBox"}
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ maxWidth:1200, margin:"0 auto", padding:24 }}>

      {/* Stats bar */}
      {stats && (
        <div style={{
          display:"grid", gridTemplateColumns:"repeat(4, 1fr)",
          gap:12, marginBottom:28,
        }}>
          {[
            { label:"Audits",        val: stats.totalAudits,  color:"var(--hbar)"   },
            { label:"Intents",       val: stats.totalIntents, color:"var(--teal)"   },
            { label:"Agents",        val: stats.totalAgents,  color:"var(--purple)" },
            { label:"Notifications", val: stats.unreadNotifs, color:"var(--amber)"  },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding:"16px 20px" }}>
              <div style={{ fontSize:22, fontWeight:700, color:s.color }}>{s.val}</div>
              <div style={{ fontSize:12, color:"var(--muted)", marginTop:2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns: selected ? "1fr 1fr" : "1fr", gap:24 }}>

        {/* Entity selector */}
        <div>
          <h2 style={{ fontSize:16, fontWeight:600, marginBottom:16 }}>Select Workflow</h2>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            {ENTITY_TYPES.map(e => (
              <button key={e.id}
                onClick={() => { setSelected(e); setFields({}); setLastResult(null) }}
                style={{
                  background: selected?.id === e.id ? "var(--hbar-dim)" : "var(--surface)",
                  border: `1px solid ${selected?.id === e.id ? "var(--hbar)" : "var(--border)"}`,
                  borderRadius:10, padding:"14px 16px", cursor:"pointer",
                  textAlign:"left", transition:"all .15s",
                }}>
                <div style={{ fontSize:22, marginBottom:6 }}>{e.icon}</div>
                <div style={{ fontSize:13, fontWeight:600, color:"var(--text)" }}>{e.label}</div>
                <div style={{ fontSize:11, color:"var(--muted)", marginTop:3 }}>
                  <span style={{
                    color: ACTION_META[e.action]?.color,
                    background: ACTION_META[e.action]?.color + "18",
                    borderRadius:10, padding:"1px 7px",
                  }}>{e.badge}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Entity form */}
        {selected && (
          <div className="fade-in">
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <h2 style={{ fontSize:16, fontWeight:600 }}>
                {selected.icon} {selected.label}
              </h2>
              <div style={{ display:"flex", gap:8 }}>
                {selected.chains.map(c => (
                  <span key={c.label} className="chain-pill"
                    style={{ color:c.color, borderColor:c.color+"44", fontSize:10 }}>
                    {c.icon} {c.label}
                  </span>
                ))}
              </div>
            </div>

            <p style={{ color:"var(--muted)", fontSize:13, marginBottom:20 }}>{selected.desc}</p>

            {/* Fields */}
            <div style={{ display:"flex", flexDirection:"column", gap:12, marginBottom:20 }}>
              {selected.fields.map(f => (
                <div key={f.key}>
                  <label style={{ fontSize:12, color:"var(--muted)", display:"block", marginBottom:5 }}>
                    {f.label}{f.required && <span style={{ color:"var(--red)" }}> *</span>}
                  </label>
                  {f.type === "textarea" ? (
                    <textarea
                      className="input"
                      rows={3}
                      placeholder={f.placeholder}
                      value={fields[f.key] ?? ""}
                      onChange={e => setFields(p => ({ ...p, [f.key]: e.target.value }))}
                      style={{ resize:"vertical" }}
                    />
                  ) : (
                    <input
                      className="input"
                      type={f.type ?? "text"}
                      placeholder={f.placeholder}
                      value={fields[f.key] ?? ""}
                      onChange={e => setFields(p => ({ ...p, [f.key]: e.target.value }))}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Submit */}
            <button
              className="btn btn-primary"
              style={{ width:"100%", justifyContent:"center", fontSize:14 }}
              onClick={() => setDrawerOpen(true)}
              disabled={selected.fields.filter(f => f.required).some(f => !fields[f.key])}
            >
              {selected.isHITL ? `Analyse ${selected.label} →` : `Run ${selected.label} Scan →`}
            </button>

            {/* Last result quick view */}
            {lastResult && (
              <div className="card fade-in" style={{ marginTop:16, padding:"12px 14px" }}>
                <div style={{ fontSize:12, color:"var(--teal)", fontWeight:600, marginBottom:6 }}>
                  ✅ Last result
                </div>
                {lastResult.txHash && (
                  <a href={lastResult.explorerUrl} target="_blank" rel="noreferrer"
                    style={{ fontSize:11, color:"var(--hbar)", fontFamily:"monospace" }}>
                    {lastResult.txHash.slice(0,22)}… ↗
                  </a>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Results drawer */}
      {drawerOpen && selected && (
        <ResultsDrawer
          action={selected.action}
          fields={fields}
          isHITL={selected.isHITL}
          onClose={() => setDrawerOpen(false)}
          onSuccess={r => { setLastResult(r); setDrawerOpen(false) }}
        />
      )}
    </div>
  )
}
