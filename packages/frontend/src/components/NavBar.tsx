import { useNavigate, useLocation } from "react-router-dom"
import { useWalletContext } from "../context/WalletContext"
import { useAuthContext }   from "../context/AuthContext"

const LINKS = [
  { path:"/dashboard", label:"Dashboard" },
  { path:"/history",   label:"History"   },
  { path:"/market",    label:"Agents"    },
  { path:"/chat",      label:"AI Agent"  },
]

export default function NavBar() {
  const nav = useNavigate()
  const loc = useLocation()
  const { address, isConnected, disconnect, walletType } = useWalletContext() as any
  const { isAuthed, logout } = useAuthContext()

  return (
    <nav className="glass" style={{
      height:60, display:"flex", alignItems:"center",
      padding:"0 24px", borderBottom:"1px solid var(--border)",
      position:"sticky", top:0, zIndex:100,
      justifyContent:"space-between",
    }}>
      {/* Logo */}
      <div onClick={() => nav("/")} style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer" }}>
        <div style={{
          width:30, height:30, borderRadius:7,
          background:"linear-gradient(135deg,#00A5E0,#00d4b8)",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontFamily:"var(--font-display)", fontWeight:800, fontSize:11, color:"#000",
        }}>TB</div>
        <span style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:14, letterSpacing:"-0.01em" }}>
          TrustBox <span style={{ color:"var(--hbar)" }}>Hedera</span>
        </span>
      </div>

      {/* Nav links */}
      <div style={{ display:"flex", gap:2 }}>
        {LINKS.map((l: {path:string;label:string}) => {
          const active = loc.pathname === l.path
          return (
            <button key={l.path} onClick={() => nav(l.path)} style={{
              background: active ? "var(--hbar-dim)" : "transparent",
              color:      active ? "var(--hbar)" : "var(--text-3)",
              border:"none", borderRadius:7, padding:"6px 14px",
              cursor:"pointer", fontSize:13, fontWeight: active ? 600 : 400,
              transition:"all .15s", fontFamily:"var(--font-body)",
            }}
            onMouseEnter={e => { if (!active) (e.currentTarget as any).style.color="var(--text)" }}
            onMouseLeave={e => { if (!active) (e.currentTarget as any).style.color="var(--text-3)" }}
            >{l.label}</button>
          )
        })}
      </div>

      {/* Wallet */}
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        {isConnected && address && (
          <div style={{
            display:"flex", alignItems:"center", gap:8,
            background:"var(--surface-2)", border:"1px solid var(--border)",
            borderRadius:20, padding:"5px 12px",
          }}>
            <span style={{ width:6, height:6, borderRadius:"50%", background:"var(--teal)", boxShadow:"0 0 6px var(--teal)", display:"inline-block" }} />
            <span style={{ fontSize:11, fontFamily:"var(--font-mono)", color:"var(--text-2)" }}>
              {address.slice(0,6)}…{address.slice(-4)}
            </span>
            <span style={{ fontSize:9, color:"var(--text-3)" }}>
              {walletType === "hashconnect" ? "♦" : "🦊"}
            </span>
          </div>
        )}
        {isConnected && (
          <button className="btn btn-ghost" style={{ padding:"6px 12px", fontSize:12 }}
            onClick={() => { logout(); disconnect(); nav("/") }}>
            Disconnect
          </button>
        )}
      </div>
    </nav>
  )
}
