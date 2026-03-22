import { useState, useRef, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useWalletContext }  from "../context/WalletContext"
import { useAuthContext }    from "../context/AuthContext"
import { useDashboard }      from "../hooks/useDashboard"
import { ENTITY_TYPES, ACTION_META } from "../constant"
import ResultsDrawer from "../components/ResultsDrawer"

// ── TrustBox Canvas ───────────────────────────────────────────────────────────

function TrustBoxCanvas({ phase, color }: { phase: "idle"|"loading"|"done"|"error"; color: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const frame = useRef(0)
  const t = useRef(0)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")!
    const W = canvas.width = 180
    const H = canvas.height = 180
    const cx = W/2, cy = H/2

    function hexPath(cx: number, cy: number, r: number) {
      ctx.beginPath()
      for (let i = 0; i < 6; i++) {
        const a = Math.PI/3*i - Math.PI/6
        const x = cx + r*Math.cos(a), y = cy + r*Math.sin(a)
        i === 0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y)
      }
      ctx.closePath()
    }

    function draw() {
      ctx.clearRect(0,0,W,H)
      t.current += phase === "loading" ? 0.04 : 0.012

      const col = color || "#00A5E0"
      const alpha = phase === "idle" ? 0.6 : phase === "loading" ? 0.9 : 1.0

      // Outer rotating ring
      if (phase === "loading") {
        ctx.save()
        ctx.translate(cx, cy)
        ctx.rotate(t.current)
        ctx.strokeStyle = col + "60"
        ctx.lineWidth = 1
        ctx.setLineDash([6,10])
        ctx.beginPath()
        ctx.arc(0,0,72,0,Math.PI*2)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.restore()
      }

      // Pulse rings
      for (let i = 0; i < 3; i++) {
        const r = 40 + i*16 + Math.sin(t.current*2 + i) * (phase==="loading" ? 6 : 2)
        ctx.beginPath()
        ctx.arc(cx, cy, r, 0, Math.PI*2)
        ctx.strokeStyle = col + Math.floor((0.15 - i*0.04) * 255).toString(16).padStart(2,"0")
        ctx.lineWidth = 1
        ctx.stroke()
      }

      // Main hex
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(Math.sin(t.current*0.5) * 0.05)
      hexPath(0, 0, 44)
      ctx.fillStyle = col + "18"
      ctx.fill()
      ctx.strokeStyle = col + (phase === "loading" ? "cc" : "88")
      ctx.lineWidth = phase === "loading" ? 2 : 1.5
      ctx.stroke()
      ctx.restore()

      // Inner hex
      hexPath(cx, cy, 28)
      ctx.fillStyle = col + "30"
      ctx.fill()
      ctx.strokeStyle = col + "66"
      ctx.lineWidth = 1
      ctx.stroke()

      // Center dot
      ctx.beginPath()
      ctx.arc(cx, cy, phase === "loading" ? 6 + Math.sin(t.current*4)*2 : 5, 0, Math.PI*2)
      ctx.fillStyle = phase === "done" ? "#10b981" : phase === "error" ? "#f43f5e" : col
      ctx.fill()

      // Corner dots
      for (let i = 0; i < 6; i++) {
        const a = Math.PI/3*i - Math.PI/6
        const x = cx + 44*Math.cos(a), y = cy + 44*Math.sin(a)
        ctx.beginPath()
        ctx.arc(x, y, 3, 0, Math.PI*2)
        ctx.fillStyle = i % 2 === 0 ? col + "cc" : col + "66"
        ctx.fill()
      }

      // Status text
      ctx.fillStyle = col
      ctx.font = "600 9px 'Syne', sans-serif"
      ctx.textAlign = "center"
      ctx.letterSpacing = "0.08em"
      const label = phase === "loading" ? "PROCESSING" : phase === "done" ? "ANCHORED" : phase === "error" ? "FAILED" : "TRUSTBOX"
      ctx.fillText(label, cx, cy + 60)

      frame.current = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(frame.current)
  }, [phase, color])

  return <canvas ref={ref} style={{ width:180, height:180 }} />
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const nav = useNavigate()
  const { address, isConnected, connectMetaMask, connectHashConnect } = useWalletContext()
  const { isAuthed, login, loading: authLoading } = useAuthContext()
  const { stats, loading: statsLoading } = useDashboard()

  const [selected,    setSelected]    = useState<typeof ENTITY_TYPES[0] | null>(null)
  const [fields,      setFields]      = useState<Record<string,string>>({})
  const [drawerOpen,  setDrawerOpen]  = useState(false)
  const [lastResult,  setLastResult]  = useState<any>(null)
  const [phase,       setPhase]       = useState<"idle"|"loading"|"done"|"error">("idle")

  if (!isConnected) return (
    <div style={{ minHeight:"calc(100vh - 60px)", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
      <div style={{
        background:"var(--surface)", border:"1px solid var(--border)",
        borderRadius:16, padding:"48px 40px", textAlign:"center", maxWidth:420,
      }}>
        <div style={{ fontSize:48, marginBottom:20 }}>ℏ</div>
        <h2 style={{ fontFamily:"var(--font-display)", fontWeight:800, fontSize:24, letterSpacing:"-0.02em", marginBottom:10 }}>
          Connect your wallet
        </h2>
        <p style={{ color:"var(--text-2)", fontSize:13, marginBottom:28, lineHeight:1.6 }}>
          Use MetaMask with Hedera Testnet (chainId 296) or HashPack for native Hedera signing.
        </p>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <button className="btn btn-primary" style={{ width:"100%" }} onClick={connectMetaMask}>🦊 MetaMask + Hashio RPC</button>
          <button className="btn btn-ghost" style={{ width:"100%" }} onClick={connectHashConnect}>♦ HashPack (HashConnect)</button>
        </div>
      </div>
    </div>
  )

  if (!isAuthed) return (
    <div style={{ minHeight:"calc(100vh - 60px)", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
      <div style={{
        background:"var(--surface)", border:"1px solid var(--border)",
        borderRadius:16, padding:"48px 40px", textAlign:"center", maxWidth:380,
      }}>
        <div style={{ fontSize:40, marginBottom:16 }}>🔐</div>
        <h2 style={{ fontFamily:"var(--font-display)", fontWeight:800, fontSize:22, letterSpacing:"-0.02em", marginBottom:8 }}>Sign in</h2>
        <p style={{ color:"var(--text-2)", fontSize:13, marginBottom:24, lineHeight:1.6 }}>
          Sign a message with your wallet. No gas required.
        </p>
        <button className="btn btn-primary" style={{ width:"100%" }} onClick={() => login()} disabled={authLoading}>
          {authLoading ? <><span className="spinner" style={{width:14,height:14}}/> Signing…</> : "Sign in to TrustBox"}
        </button>
      </div>
    </div>
  )

  const accentColor = selected ? ACTION_META[selected.action]?.color ?? "var(--hbar)" : "var(--hbar)"

  return (
    <div style={{ display:"flex", height:"calc(100vh - 60px)", overflow:"hidden" }}>

      {/* ── Left sidebar — workflow selector ─────────────────────────────── */}
      <div style={{
        width:260, flexShrink:0,
        background:"var(--surface)", borderRight:"1px solid var(--border)",
        overflowY:"auto", padding:"20px 12px",
      }}>
        <div style={{ fontSize:10, fontFamily:"var(--font-display)", fontWeight:700, color:"var(--text-3)", letterSpacing:"0.1em", padding:"0 8px", marginBottom:12 }}>
          WORKFLOWS
        </div>
        {ENTITY_TYPES.map(e => {
          const meta = ACTION_META[e.action]
          const isActive = selected?.id === e.id
          return (
            <button key={e.id}
              onClick={() => { setSelected(e); setFields({}); setLastResult(null); setPhase("idle") }}
              style={{
                width:"100%", display:"flex", alignItems:"center", gap:12,
                padding:"10px 12px", borderRadius:8, marginBottom:4,
                background: isActive ? meta?.color+"18" : "transparent",
                border: isActive ? `1px solid ${meta?.color}44` : "1px solid transparent",
                cursor:"pointer", textAlign:"left", transition:"all .15s",
              }}
              onMouseEnter={e2 => { if (!isActive) (e2.currentTarget as any).style.background="var(--surface-2)" }}
              onMouseLeave={e2 => { if (!isActive) (e2.currentTarget as any).style.background="transparent" }}
            >
              <span style={{ fontSize:20, flexShrink:0 }}>{e.icon}</span>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:600, color: isActive ? meta?.color : "var(--text)" }}>{e.label}</div>
                <div style={{ fontSize:10, color:"var(--text-3)", marginTop:1 }}>{e.badge}</div>
              </div>
              {isActive && <div style={{ width:3, height:24, borderRadius:2, background:meta?.color, flexShrink:0 }} />}
            </button>
          )
        })}

        {/* Stats mini */}
        {!statsLoading && stats && (
          <div style={{ marginTop:24, padding:"12px 8px", borderTop:"1px solid var(--border)" }}>
            <div style={{ fontSize:10, fontFamily:"var(--font-display)", fontWeight:700, color:"var(--text-3)", letterSpacing:"0.1em", marginBottom:10 }}>ACTIVITY</div>
            {[
              { label:"Audits",  val:stats.totalAudits,  color:"var(--hbar)" },
              { label:"Intents", val:stats.totalIntents, color:"var(--teal)" },
              { label:"Agents",  val:stats.totalAgents,  color:"var(--purple)" },
            ].map(s => (
              <div key={s.label} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", fontSize:12 }}>
                <span style={{ color:"var(--text-3)" }}>{s.label}</span>
                <span style={{ fontFamily:"var(--font-mono)", fontWeight:500, color:s.color }}>{s.val}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Main area ─────────────────────────────────────────────────────── */}
      <div style={{ flex:1, overflowY:"auto", padding:"32px" }}>
        {!selected ? (
          /* Empty state */
          <div style={{ height:"100%", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", textAlign:"center" }}>
            <div style={{ animation:"float 4s ease infinite", marginBottom:32 }}>
              <TrustBoxCanvas phase="idle" color="var(--hbar)" />
            </div>
            <h2 style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:22, letterSpacing:"-0.02em", marginBottom:10 }}>
              Select a workflow
            </h2>
            <p style={{ color:"var(--text-2)", fontSize:13, maxWidth:360 }}>
              Choose one of the five workflows from the left panel to begin. Each workflow anchors results on Hedera with an HCS consensus timestamp.
            </p>
          </div>
        ) : (
          /* Workflow form */
          <div className="fade-in" style={{ maxWidth:640 }}>
            {/* Header */}
            <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:28 }}>
              <div style={{
                width:52, height:52, borderRadius:12,
                background: ACTION_META[selected.action]?.color + "18",
                border: `1px solid ${ACTION_META[selected.action]?.color}33`,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:24, flexShrink:0,
              }}>{selected.icon}</div>
              <div style={{ flex:1 }}>
                <h2 style={{ fontFamily:"var(--font-display)", fontWeight:800, fontSize:20, letterSpacing:"-0.02em" }}>
                  {selected.label}
                </h2>
                <div style={{ display:"flex", gap:6, marginTop:6, flexWrap:"wrap" }}>
                  <span className="badge" style={{
                    color:ACTION_META[selected.action]?.color,
                    background:ACTION_META[selected.action]?.color+"18",
                    border:`1px solid ${ACTION_META[selected.action]?.color}33`,
                  }}>{selected.badge}</span>
                  {selected.chains.slice(0,3).map(c => (
                    <span key={c.label} className="chain-pill" style={{ color:c.color, borderColor:c.color+"44", fontSize:10 }}>
                      {c.icon} {c.label}
                    </span>
                  ))}
                </div>
              </div>
              {/* Mini canvas */}
              <div style={{ opacity: phase === "idle" ? 0.5 : 1, transition:"opacity .3s" }}>
                <TrustBoxCanvas phase={phase} color={ACTION_META[selected.action]?.color ?? "#00A5E0"} />
              </div>
            </div>

            <p style={{ color:"var(--text-2)", fontSize:13, lineHeight:1.6, marginBottom:28 }}>{selected.desc}</p>

            {/* Fields */}
            <div style={{ display:"flex", flexDirection:"column", gap:14, marginBottom:28 }}>
              {selected.fields.map(f => (
                <div key={f.key}>
                  <label style={{ display:"block", fontSize:11, fontWeight:600, color:"var(--text-2)", marginBottom:6, fontFamily:"var(--font-display)", letterSpacing:"0.04em" }}>
                    {f.label.toUpperCase()}{f.required && <span style={{ color:"var(--red)", marginLeft:3 }}>*</span>}
                  </label>
                  {f.type === "textarea" ? (
                    <textarea className="input" rows={3} placeholder={f.placeholder}
                      value={fields[f.key] ?? ""}
                      onChange={e => setFields(p => ({...p,[f.key]:e.target.value}))}
                      style={{ resize:"vertical", fontFamily:"var(--font-body)" }}
                    />
                  ) : (
                    <input className="input" type={f.type ?? "text"} placeholder={f.placeholder}
                      value={fields[f.key] ?? ""}
                      onChange={e => setFields(p => ({...p,[f.key]:e.target.value}))}
                      style={{ fontFamily: f.key.includes("Address") || f.key.includes("Id") ? "var(--font-mono)" : "var(--font-body)" }}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Submit */}
            <button
              className="btn btn-primary"
              style={{ width:"100%", padding:"13px", fontSize:14, fontFamily:"var(--font-display)", fontWeight:700, letterSpacing:"0.02em" }}
              onClick={() => { setPhase("loading"); setDrawerOpen(true) }}
              disabled={selected.fields.filter(f => f.required).some(f => !fields[f.key])}
            >
              {selected.isHITL ? `Analyse ${selected.label} →` : `Run ${selected.label} →`}
            </button>

            {/* Last result */}
            {lastResult && (
              <div className="card fade-in" style={{ marginTop:16, padding:"14px 16px", borderColor:"var(--teal)33" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ color:"var(--teal)", fontSize:13 }}>✓</span>
                    <span style={{ fontSize:12, fontWeight:600, color:"var(--teal)" }}>Last result anchored</span>
                  </div>
                  {lastResult.hcsSeqNum && (
                    <span style={{ fontSize:10, color:"var(--text-3)", fontFamily:"var(--font-mono)" }}>HCS #{lastResult.hcsSeqNum}</span>
                  )}
                </div>
                {lastResult.txHash && (
                  <a href={lastResult.explorerUrl} target="_blank" rel="noreferrer"
                    style={{ display:"block", marginTop:6, fontSize:11, fontFamily:"var(--font-mono)", color:"var(--hbar)" }}>
                    {lastResult.txHash.slice(0,24)}… ↗
                  </a>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Drawer */}
      {drawerOpen && selected && (
        <ResultsDrawer
          action={selected.action}
          fields={fields}
          isHITL={selected.isHITL}
          onClose={() => { setDrawerOpen(false); setPhase("idle") }}
          onSuccess={r => { setLastResult(r); setDrawerOpen(false); setPhase("done") }}
        />
      )}
    </div>
  )
}
