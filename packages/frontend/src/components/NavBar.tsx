import { useNavigate, useLocation } from "react-router-dom"
import { useWalletContext } from "../context/WalletContext"
import { useAuthContext }   from "../context/AuthContext"

export default function NavBar() {
  const nav      = useNavigate()
  const loc      = useLocation()
  const { address, isConnected, disconnect } = useWalletContext()
  const { isAuthed, logout } = useAuthContext()

  const links = [
    { path: "/dashboard", label: "Dashboard" },
    { path: "/history",   label: "History"   },
    { path: "/market",    label: "Marketplace"},
  ]

  return (
    <nav style={{
      background: "var(--surface)", borderBottom: "1px solid var(--border)",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 24px", height: "56px", position: "sticky", top: 0, zIndex: 100,
    }}>
      {/* Logo */}
      <div
        onClick={() => nav("/")}
        style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer" }}
      >
        <div style={{
          width:28, height:28, borderRadius:6,
          background:"linear-gradient(135deg,#00A5E0,#00e5c0)",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:12, fontWeight:700, color:"#000",
        }}>TB</div>
        <span style={{ fontWeight:600, fontSize:14 }}>TrustBox Hedera</span>
      </div>

      {/* Links */}
      <div style={{ display:"flex", gap:4 }}>
        {links.map(l => (
          <button
            key={l.path}
            onClick={() => nav(l.path)}
            style={{
              background: loc.pathname === l.path ? "var(--hbar-dim)" : "transparent",
              color:      loc.pathname === l.path ? "var(--hbar)" : "var(--muted)",
              border: "none", borderRadius:6,
              padding:"6px 14px", cursor:"pointer",
              fontSize:13, fontWeight:500,
            }}
          >{l.label}</button>
        ))}
      </div>

      {/* Wallet */}
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        {isConnected && address && (
          <span style={{
            background:"var(--surface2)", border:"1px solid var(--border)",
            borderRadius:20, padding:"4px 12px",
            fontSize:12, color:"var(--muted)", fontFamily:"monospace",
          }}>
            {address.slice(0,6)}…{address.slice(-4)}
          </span>
        )}
        {isConnected && (
          <button
            className="btn btn-outline"
            style={{ padding:"6px 14px", fontSize:12 }}
            onClick={() => { logout(); disconnect(); nav("/") }}
          >Disconnect</button>
        )}
      </div>
    </nav>
  )
}
