import { useNavigate } from "react-router-dom"
import { useWalletContext } from "../context/WalletContext"

const WORKFLOWS = [
  {
    id:"audit", icon:"📋", label:"Smart Contract Audit",
    badge:"HITL", badgeColor:"#00A5E0",
    desc:"Groq AI analyses your contract and returns structured findings. You review, sign the reportHash, and anchor the Merkle root on AuditRegistry.sol.",
    chains:[{icon:"ℏ",label:"HSCS",color:"#00A5E0"},{icon:"⬡",label:"HCS",color:"#00d4b8"}],
  },
  {
    id:"verify", icon:"🤖", label:"Verify AI Agent",
    badge:"ERC-8004", badgeColor:"#8b5cf6",
    desc:"Mint a soulbound ERC-8004 credential NFT. Model hash and capability hash committed on-chain. Non-transferable. Anchored on HCS.",
    chains:[{icon:"ℏ",label:"HSCS",color:"#00A5E0"},{icon:"⬡",label:"HCS",color:"#00d4b8"}],
  },
  {
    id:"execute", icon:"⚡", label:"Execute Intent",
    badge:"Groq + HSCS", badgeColor:"#00d4b8",
    desc:"Natural language → Groq parses to JSON spec → you sign specHash (not raw text) → IntentVault.sol. Mirror Node triggers execution. Full HCS trail.",
    chains:[{icon:"ℏ",label:"HSCS",color:"#00A5E0"},{icon:"🧠",label:"Groq",color:"#f5a623"},{icon:"⬡",label:"HCS",color:"#00d4b8"}],
  },
  {
    id:"scan", icon:"🛡️", label:"Security Agent Scan",
    badge:"HBAR Stake", badgeColor:"#f5a623",
    desc:"Register a security agent on AgentMarketplace.sol with HBAR stake. Behavioural scan. Scan results anchored on HCS.",
    chains:[{icon:"ℏ",label:"HSCS",color:"#00A5E0"},{icon:"🔒",label:"Phala TEE",color:"#8b5cf6"}],
  },
  {
    id:"blindaudit", icon:"🔐", label:"Blind TEE Audit",
    badge:"SGX Enclave", badgeColor:"#f43f5e",
    desc:"Source code encrypted and dispatched to a Phala SGX enclave. Code never leaves the TEE. Findings hash + attestation anchored on HCS.",
    chains:[{icon:"🔒",label:"Phala SGX",color:"#8b5cf6"},{icon:"⬡",label:"HCS",color:"#00d4b8"}],
  },
]

const STATS = [
  { value:"4", label:"Smart Contracts", sub:"Hedera HSCS" },
  { value:"4", label:"HCS Topics", sub:"Absolute finality" },
  { value:"5", label:"AI Workflows", sub:"HITL + automated" },
  { value:"∞", label:"Verifiability", sub:"On Hedera" },
]

export default function Landing() {
  const nav = useNavigate()
  const { isConnected, isConnecting, connectMetaMask, connectHashConnect } = useWalletContext()

  return (
    <div style={{ minHeight:"100vh", background:"var(--bg)", overflowX:"hidden", fontFamily:"var(--font-body)" }}>

      {/* ── Background orbs ─────────────────────────────────────────────── */}
      <div className="orb orb-hbar" style={{ width:600, height:600, top:-200, left:-200, position:"fixed", opacity:0.6 }} />
      <div className="orb orb-teal" style={{ width:400, height:400, bottom:100, right:-100, position:"fixed", opacity:0.5 }} />
      <div className="orb orb-purple" style={{ width:300, height:300, top:"40%", right:"20%", position:"fixed", opacity:0.3 }} />

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav className="glass" style={{
        position:"fixed", top:0, left:0, right:0, zIndex:100,
        borderBottom:"1px solid var(--border)",
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"0 32px", height:60,
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{
            width:32, height:32, borderRadius:8,
            background:"linear-gradient(135deg,#00A5E0,#00d4b8)",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontFamily:"var(--font-display)", fontWeight:800, fontSize:12, color:"#000",
          }}>TB</div>
          <span style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:16, letterSpacing:"-0.02em" }}>
            TrustBox <span style={{ color:"var(--hbar)" }}>Hedera</span>
          </span>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          {isConnected
            ? <button className="btn btn-primary" onClick={() => nav("/dashboard")}>Open App →</button>
            : <>
                <button className="btn btn-ghost" onClick={connectHashConnect} disabled={isConnecting}>♦ HashPack</button>
                <button className="btn btn-primary" onClick={connectMetaMask} disabled={isConnecting}>
                  {isConnecting ? "Connecting…" : "🦊 Connect Wallet"}
                </button>
              </>
          }
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="hex-pattern" style={{
        minHeight:"100vh", display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center",
        padding:"120px 24px 80px", textAlign:"center", position:"relative",
      }}>
        {/* Hedera badge */}
        <div className="fade-in-up" style={{ animationDelay:".1s", marginBottom:24 }}>
          <span style={{
            display:"inline-flex", alignItems:"center", gap:8,
            background:"var(--hbar-dim)", border:"1px solid rgba(0,165,224,0.3)",
            borderRadius:20, padding:"6px 16px",
            fontSize:12, color:"var(--hbar)", fontFamily:"var(--font-display)",
            fontWeight:600, letterSpacing:"0.04em",
          }}>
            ℏ BUILT NATIVELY ON HEDERA
          </span>
        </div>

        {/* Headline */}
        <h1 className="fade-in-up" style={{
          animationDelay:".2s",
          fontFamily:"var(--font-display)", fontWeight:800,
          fontSize:"clamp(40px,7vw,88px)", lineHeight:1.05,
          letterSpacing:"-0.03em", marginBottom:24, maxWidth:900,
        }}>
          Verifiable Trust<br/>
          <span style={{
            background:"linear-gradient(135deg,#00A5E0 0%,#00d4b8 50%,#00A5E0 100%)",
            backgroundSize:"200%",
            WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
            animation:"shimmer 4s linear infinite",
          }}>for AI Agents</span>
        </h1>

        {/* Subtitle */}
        <p className="fade-in-up" style={{
          animationDelay:".3s",
          fontSize:"clamp(14px,2vw,18px)", color:"var(--text-2)",
          maxWidth:560, marginBottom:40, lineHeight:1.7,
        }}>
          Audit contracts, verify credentials, execute signed intents —
          all anchored on Hedera with absolute aBFT consensus finality.
        </p>

        {/* CTA */}
        <div className="fade-in-up" style={{ animationDelay:".4s", display:"flex", gap:12, flexWrap:"wrap", justifyContent:"center", marginBottom:64 }}>
          {isConnected
            ? <button className="btn btn-primary" style={{ padding:"14px 32px", fontSize:15 }} onClick={() => nav("/dashboard")}>
                Open Dashboard →
              </button>
            : <>
                <button className="btn btn-primary" style={{ padding:"14px 32px", fontSize:15 }} onClick={connectMetaMask} disabled={isConnecting}>
                  🦊 Connect MetaMask
                </button>
                <button className="btn btn-outline" style={{ padding:"14px 32px", fontSize:15 }} onClick={connectHashConnect} disabled={isConnecting}>
                  ♦ Connect HashPack
                </button>
              </>
          }
        </div>

        {/* Chain stack */}
        <div className="fade-in-up" style={{ animationDelay:".5s", display:"flex", gap:10, flexWrap:"wrap", justifyContent:"center" }}>
          {[
            {icon:"ℏ",label:"Hedera HSCS",color:"#00A5E0"},
            {icon:"⬡",label:"HCS Trails",color:"#00d4b8"},
            {icon:"🧠",label:"Groq AI",color:"#f5a623"},
            {icon:"🔒",label:"Phala TEE",color:"#8b5cf6"},
          ].map(c => (
            <span key={c.label} className="chain-pill" style={{ color:c.color, borderColor:c.color+"44", fontSize:12 }}>
              {c.icon} {c.label}
            </span>
          ))}
        </div>
      </section>

      {/* ── Stats ───────────────────────────────────────────────────────── */}
      <section style={{ borderTop:"1px solid var(--border)", borderBottom:"1px solid var(--border)", padding:"40px 32px" }}>
        <div style={{
          maxWidth:900, margin:"0 auto",
          display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:24,
        }}>
          {STATS.map(s => (
            <div key={s.label} style={{ textAlign:"center" }}>
              <div style={{ fontFamily:"var(--font-display)", fontWeight:800, fontSize:36, color:"var(--hbar)", lineHeight:1 }}>{s.value}</div>
              <div style={{ fontWeight:600, fontSize:13, marginTop:6 }}>{s.label}</div>
              <div style={{ fontSize:11, color:"var(--text-3)", marginTop:2 }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Why Hedera ──────────────────────────────────────────────────── */}
      <section style={{ padding:"80px 32px", maxWidth:1100, margin:"0 auto" }}>
        <div style={{ textAlign:"center", marginBottom:48 }}>
          <div style={{ fontSize:11, fontFamily:"var(--font-display)", fontWeight:700, color:"var(--hbar)", letterSpacing:"0.12em", marginBottom:12 }}>WHY HEDERA</div>
          <h2 style={{ fontFamily:"var(--font-display)", fontWeight:800, fontSize:"clamp(24px,4vw,40px)", letterSpacing:"-0.02em" }}>
            Built for what AI trust requires
          </h2>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))", gap:16 }}>
          {[
            { icon:"⚡", title:"Sub-second finality", desc:"aBFT consensus — no reorgs, no probabilistic confirmation. Every HCS message is final the moment it's submitted.", color:"var(--hbar)" },
            { icon:"🔒", title:"Fixed USD fees", desc:"No gas price spikes. Every transaction costs a predictable amount in USD — no auction dynamics for audit trails.", color:"var(--teal)" },
            { icon:"🗄️", title:"Mirror Node history", desc:"All HCS trails queryable via public REST API. No custom database needed for your entire transaction history.", color:"var(--purple)" },
            { icon:"♾️", title:"Absolute immutability", desc:"Once a consensus timestamp is written, it cannot be altered. Your audit trail is mathematically permanent.", color:"var(--amber)" },
          ].map(f => (
            <div key={f.title} className="card card-hover" style={{ borderColor:f.color+"22" }}>
              <div style={{ fontSize:28, marginBottom:12 }}>{f.icon}</div>
              <div style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:15, marginBottom:8, color:f.color }}>{f.title}</div>
              <p style={{ color:"var(--text-2)", fontSize:13, lineHeight:1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Workflows ───────────────────────────────────────────────────── */}
      <section style={{ padding:"80px 32px", background:"var(--bg-2)" }}>
        <div style={{ maxWidth:1100, margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:48 }}>
            <div style={{ fontSize:11, fontFamily:"var(--font-display)", fontWeight:700, color:"var(--hbar)", letterSpacing:"0.12em", marginBottom:12 }}>WORKFLOWS</div>
            <h2 style={{ fontFamily:"var(--font-display)", fontWeight:800, fontSize:"clamp(24px,4vw,40px)", letterSpacing:"-0.02em" }}>
              Five verifiable workflows
            </h2>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))", gap:16 }}>
            {WORKFLOWS.map((w, i) => (
              <div key={w.id} className="card card-hover" style={{
                cursor:"pointer",
                animationDelay:`${i*0.08}s`,
                borderColor: isConnected ? w.badgeColor+"22" : "var(--border)",
              }} onClick={() => isConnected ? nav("/dashboard") : connectMetaMask()}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
                  <span style={{ fontSize:32 }}>{w.icon}</span>
                  <span className="badge" style={{ color:w.badgeColor, background:w.badgeColor+"18", border:`1px solid ${w.badgeColor}33` }}>
                    {w.badge}
                  </span>
                </div>
                <div style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:16, marginBottom:8 }}>{w.label}</div>
                <p style={{ color:"var(--text-2)", fontSize:12, lineHeight:1.6, marginBottom:14 }}>{w.desc}</p>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                  {w.chains.map(c => (
                    <span key={c.label} className="chain-pill" style={{ color:c.color, borderColor:c.color+"44", fontSize:10 }}>
                      {c.icon} {c.label}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOL Agent CTA ────────────────────────────────────────────────── */}
      <section style={{ padding:"80px 32px", textAlign:"center" }}>
        <div style={{
          maxWidth:700, margin:"0 auto",
          background:"var(--surface)", border:"1px solid rgba(0,165,224,0.2)",
          borderRadius:16, padding:"48px 40px",
          boxShadow:"0 0 60px var(--hbar-dim)",
        }}>
          <div style={{ fontSize:40, marginBottom:16 }}>🤖</div>
          <h3 style={{ fontFamily:"var(--font-display)", fontWeight:800, fontSize:28, letterSpacing:"-0.02em", marginBottom:12 }}>
            Talk to TrustBox AI Agent
          </h3>
          <p style={{ color:"var(--text-2)", fontSize:14, lineHeight:1.7, marginBottom:28 }}>
            Registered in the HOL Registry via HCS-10. Send natural language to audit
            contracts, verify agents, or execute intents — responses broadcast on Hedera.
          </p>
          <div style={{ display:"flex", gap:8, justifyContent:"center", flexWrap:"wrap", marginBottom:24 }}>
            {["HCS-10","HCS-11","ERC-8004","A2A"].map(p => (
              <span key={p} className="badge" style={{ color:"var(--hbar)", background:"var(--hbar-dim)", border:"1px solid rgba(0,165,224,0.2)" }}>{p}</span>
            ))}
          </div>
          <button className="btn btn-primary" style={{ padding:"12px 28px" }} onClick={() => isConnected ? nav("/chat") : connectMetaMask()}>
            Open AI Agent Chat →
          </button>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer style={{
        borderTop:"1px solid var(--border)", padding:"32px",
        display:"flex", justifyContent:"space-between", alignItems:"center",
        flexWrap:"wrap", gap:16,
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{
            width:28, height:28, borderRadius:6,
            background:"linear-gradient(135deg,#00A5E0,#00d4b8)",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontFamily:"var(--font-display)", fontWeight:800, fontSize:10, color:"#000",
          }}>TB</div>
          <span style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:13 }}>TrustBoxHedera AI</span>
        </div>
        <div style={{ fontSize:12, color:"var(--text-3)" }}>
          Built on HSCS · Secured by HCS · Powered by Groq · Attested by Phala
        </div>
        <div style={{ display:"flex", gap:16 }}>
          {[
            {label:"HashScan",href:"https://hashscan.io/testnet"},
            {label:"Mirror Node",href:"https://testnet.mirrornode.hedera.com"},
            {label:"HOL Registry",href:"https://moonscape.tech"},
          ].map(l => (
            <a key={l.label} href={l.href} target="_blank" rel="noreferrer"
              style={{ fontSize:12, color:"var(--text-3)", textDecoration:"none" }}
              onMouseEnter={e => (e.target as any).style.color="var(--hbar)"}
              onMouseLeave={e => (e.target as any).style.color="var(--text-3)"}
            >{l.label} ↗</a>
          ))}
        </div>
      </footer>
    </div>
  )
}
