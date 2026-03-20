import { useNavigate } from "react-router-dom"
import { useWalletContext } from "../context/WalletContext"
import { ENTITY_TYPES } from "../constant"

const CHAINS = [
  { icon:"ℏ",  label:"Hedera HSCS",  color:"#00A5E0" },
  { icon:"⬡",  label:"HCS Trails",   color:"#00e5c0" },
  { icon:"🧠", label:"Groq AI",      color:"#f55036" },
  { icon:"🔒", label:"Phala TEE",    color:"#8259EF" },
]

export default function Landing() {
  const nav = useNavigate()
  const { isConnected, connectMetaMask, connectHashConnect, isConnecting } = useWalletContext()

  return (
    <div style={{ minHeight:"100vh", background:"var(--bg)" }}>

      {/* Hero */}
      <div style={{ textAlign:"center", padding:"80px 24px 60px" }}>
        <div style={{
          display:"inline-flex", alignItems:"center", gap:8,
          background:"var(--hbar-dim)", border:"1px solid var(--hbar)",
          borderRadius:20, padding:"5px 16px", marginBottom:24,
          fontSize:12, color:"var(--hbar)",
        }}>
          ⬡ Built natively on Hedera Consensus Service
        </div>

        <h1 style={{ fontSize:48, fontWeight:700, lineHeight:1.15, marginBottom:20 }}>
          Verifiable Trust<br/>
          <span style={{ color:"var(--hbar)" }}>for AI Agents</span>
        </h1>

        <p style={{ color:"var(--muted)", fontSize:16, maxWidth:520, margin:"0 auto 40px", lineHeight:1.7 }}>
          Audit smart contracts, verify AI credentials, and execute signed intents —
          all anchored on Hedera with sub-second finality and absolute consensus.
        </p>

        {/* Chain badges */}
        <div style={{ display:"flex", justifyContent:"center", gap:10, flexWrap:"wrap", marginBottom:40 }}>
          {CHAINS.map(c => (
            <span key={c.label} className="chain-pill" style={{ color:c.color, borderColor:c.color+"44" }}>
              {c.icon} {c.label}
            </span>
          ))}
        </div>

        {/* CTA */}
        {!isConnected ? (
          <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
            <button
              className="btn btn-primary"
              style={{ fontSize:15, padding:"12px 28px" }}
              onClick={connectMetaMask}
              disabled={isConnecting}
            >
              {isConnecting ? "Connecting…" : "🦊 Connect MetaMask"}
            </button>
            <button
              className="btn btn-outline"
              style={{ fontSize:15, padding:"12px 28px" }}
              onClick={connectHashConnect}
              disabled={isConnecting}
            >
              ♦ Connect HashPack
            </button>
          </div>
        ) : (
          <button
            className="btn btn-primary"
            style={{ fontSize:15, padding:"12px 32px" }}
            onClick={() => nav("/dashboard")}
          >Open Dashboard →</button>
        )}
      </div>

      {/* Workflow cards */}
      <div style={{ maxWidth:1100, margin:"0 auto", padding:"0 24px 80px" }}>
        <h2 style={{ textAlign:"center", fontSize:22, fontWeight:600, marginBottom:32 }}>
          Five Verifiable Workflows
        </h2>
        <div style={{
          display:"grid",
          gridTemplateColumns:"repeat(auto-fill, minmax(300px, 1fr))",
          gap:16,
        }}>
          {ENTITY_TYPES.map(e => (
            <div key={e.id} className="card" style={{ cursor:"pointer" }}
              onClick={() => isConnected ? nav("/dashboard") : connectMetaMask()}
            >
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
                <span style={{ fontSize:28 }}>{e.icon}</span>
                <div>
                  <div style={{ fontWeight:600, fontSize:15 }}>{e.label}</div>
                  <span className="chain-pill" style={{
                    color: e.badgeColor, borderColor: e.badgeColor+"44",
                    fontSize:10, marginTop:4, display:"inline-block",
                  }}>{e.badge}</span>
                </div>
              </div>
              <p style={{ color:"var(--muted)", fontSize:13, lineHeight:1.6 }}>{e.desc}</p>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginTop:14 }}>
                {e.chains.map(c => (
                  <span key={c.label} className="chain-pill"
                    style={{ color:c.color, borderColor:c.color+"33", fontSize:10 }}>
                    {c.icon} {c.label}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats bar */}
      <div style={{
        borderTop:"1px solid var(--border)",
        padding:"24px",
        display:"flex", justifyContent:"center", gap:48, flexWrap:"wrap",
      }}>
        {[
          ["5 Workflows",    "Fully Hedera-native"],
          ["HCS Trails",     "Every action timestamped"],
          ["Soulbound NFTs", "ERC-8004 on HSCS"],
          ["Blind TEE",      "Phala SGX attestation"],
        ].map(([title, sub]) => (
          <div key={title} style={{ textAlign:"center" }}>
            <div style={{ fontWeight:700, color:"var(--hbar)", fontSize:15 }}>{title}</div>
            <div style={{ color:"var(--muted)", fontSize:12, marginTop:2 }}>{sub}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
