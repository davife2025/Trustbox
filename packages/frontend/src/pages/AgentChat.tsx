/* pages/AgentChat.tsx — TrustBoxHedera AI
   Natural language chat with TrustBox AI Agent via HCS-10.
   Messages routed through REST bridge → agent → HCS outbound topic.
   ──────────────────────────────────────────────────────────── */

import { useState, useEffect, useRef } from "react"
import { API_URL, hashscanTopic } from "../constant"
import { useWalletContext } from "../context/WalletContext"

interface AgentInfo {
  registered:   boolean
  name:         string
  accountId?:   string
  inboundTopic?:string
  outboundTopic?:string
  hashscanInbound?:  string
  hashscanOutbound?: string
  protocols?:   string[]
}

interface ChatMessage {
  id:        string
  role:      "user" | "agent"
  content:   string
  timestamp: string
  hcsSeq?:   string
}

const EXAMPLES = [
  "Audit contract 0x62e2Ba19a38AcA58B829aEC3ED8Db9bfd89D5Fd3",
  "Verify agent named TrustGuard using model llama-3.1-70b",
  "Book a hotel in Lagos for 3 nights, budget $200/night",
  "What can you do?",
]

export default function AgentChat() {
  const { address } = useWalletContext()
  const [agent,    setAgent]    = useState<AgentInfo | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input,    setInput]    = useState("")
  const [loading,  setLoading]  = useState(false)
  const [agentLoading, setAgentLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Load agent info
  useEffect(() => {
    fetch(`${API_URL}/api/hol/agent`)
      .then(r => r.json())
      .then(setAgent)
      .catch(console.error)
      .finally(() => setAgentLoading(false))
  }, [])

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Welcome message
  useEffect(() => {
    setMessages([{
      id:        "welcome",
      role:      "agent",
      content:   `👋 Hi! I'm TrustBox AI Agent, registered in the HOL Registry via HCS-10.\n\nI can audit smart contracts, verify AI agent credentials (ERC-8004), execute signed intents, run security scans, and perform blind TEE audits — all anchored on Hedera.\n\nSend "help" to see all workflows, or try one of the examples below.`,
      timestamp: new Date().toISOString(),
    }])
  }, [])

  async function sendMessage(text?: string) {
    const msg = (text ?? input).trim()
    if (!msg || loading) return
    setInput("")

    const userMsg: ChatMessage = {
      id:        `u_${Date.now()}`,
      role:      "user",
      content:   msg,
      timestamp: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      const res  = await fetch(`${API_URL}/api/hol/chat`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          message:   msg,
          sender:    address ?? "anonymous",
          sendToHCS: true,
        }),
      })
      const data = await res.json()

      setMessages(prev => [...prev, {
        id:        `a_${Date.now()}`,
        role:      "agent",
        content:   data.message ?? data.error ?? "No response",
        timestamp: data.timestamp ?? new Date().toISOString(),
      }])
    } catch (err: any) {
      setMessages(prev => [...prev, {
        id:        `err_${Date.now()}`,
        role:      "agent",
        content:   `⚠️ Error: ${err.message}`,
        timestamp: new Date().toISOString(),
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div style={{ maxWidth:900, margin:"0 auto", padding:24, height:"calc(100vh - 56px)", display:"flex", flexDirection:"column" }}>

      {/* Agent header */}
      <div className="card" style={{ marginBottom:16, padding:"14px 18px" }}>
        {agentLoading ? (
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div className="spinner" style={{ width:16, height:16 }} />
            <span style={{ fontSize:13, color:"var(--muted)" }}>Loading agent info…</span>
          </div>
        ) : agent ? (
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:12 }}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              {/* Agent avatar */}
              <div style={{
                width:40, height:40, borderRadius:8,
                background:"linear-gradient(135deg, #00A5E0, #00e5c0)",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:18, flexShrink:0,
              }}>🤖</div>
              <div>
                <div style={{ fontWeight:600, fontSize:15 }}>{agent.name}</div>
                <div style={{ fontSize:11, color:"var(--muted)", marginTop:2 }}>
                  {agent.registered ? (
                    <span style={{ color:"var(--teal)" }}>● Online — registered in HOL Registry</span>
                  ) : (
                    <span style={{ color:"var(--amber)" }}>● Not registered yet</span>
                  )}
                </div>
              </div>
            </div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {agent.protocols?.map(p => (
                <span key={p} className="chain-pill" style={{ color:"var(--hbar)", borderColor:"var(--hbar)44", fontSize:10 }}>
                  {p}
                </span>
              ))}
              {agent.hashscanInbound && (
                <a href={agent.hashscanInbound} target="_blank" rel="noreferrer"
                  style={{ fontSize:11, color:"var(--teal)", display:"flex", alignItems:"center", gap:3 }}>
                  ⬡ Inbound Topic ↗
                </a>
              )}
              {agent.hashscanOutbound && (
                <a href={agent.hashscanOutbound} target="_blank" rel="noreferrer"
                  style={{ fontSize:11, color:"var(--muted)", display:"flex", alignItems:"center", gap:3 }}>
                  ⬡ Outbound Topic ↗
                </a>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* Messages */}
      <div style={{
        flex:1, overflowY:"auto", display:"flex", flexDirection:"column", gap:12,
        paddingRight:4, marginBottom:12,
      }}>
        {messages.map(m => (
          <div key={m.id} style={{
            display:"flex",
            justifyContent: m.role === "user" ? "flex-end" : "flex-start",
          }}>
            {m.role === "agent" && (
              <div style={{
                width:28, height:28, borderRadius:6, flexShrink:0, marginRight:8, marginTop:4,
                background:"linear-gradient(135deg, #00A5E0, #00e5c0)",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:13,
              }}>🤖</div>
            )}
            <div style={{
              maxWidth:"72%",
              background: m.role === "user" ? "var(--hbar)" : "var(--surface)",
              border: m.role === "user" ? "none" : "1px solid var(--border)",
              color:  m.role === "user" ? "#000" : "var(--text)",
              borderRadius: m.role === "user" ? "12px 12px 2px 12px" : "2px 12px 12px 12px",
              padding:"10px 14px",
              fontSize:13, lineHeight:1.6,
              whiteSpace:"pre-wrap", wordBreak:"break-word",
            }}>
              {m.content}
              <div style={{
                fontSize:10, marginTop:6, opacity:0.5, textAlign:"right",
              }}>
                {new Date(m.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{
              width:28, height:28, borderRadius:6,
              background:"linear-gradient(135deg, #00A5E0, #00e5c0)",
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:13,
            }}>🤖</div>
            <div style={{
              background:"var(--surface)", border:"1px solid var(--border)",
              borderRadius:"2px 12px 12px 12px", padding:"10px 16px",
            }}>
              <div style={{ display:"flex", gap:4 }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{
                    width:6, height:6, borderRadius:"50%", background:"var(--hbar)",
                    animation:`fadeIn .6s ease ${i * 0.2}s infinite alternate`,
                    opacity:0.4,
                  }} />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Example prompts */}
      {messages.length <= 1 && (
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:12 }}>
          {EXAMPLES.map(ex => (
            <button key={ex}
              onClick={() => sendMessage(ex)}
              style={{
                background:"var(--surface2)", border:"1px solid var(--border)",
                borderRadius:8, padding:"6px 12px", cursor:"pointer",
                fontSize:11, color:"var(--muted)",
              }}
            >{ex}</button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{
        display:"flex", gap:10, alignItems:"flex-end",
        background:"var(--surface)", border:"1px solid var(--border)",
        borderRadius:10, padding:"10px 14px",
      }}>
        <textarea
          className="input"
          rows={1}
          placeholder="Message TrustBox AI Agent… (Enter to send)"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{
            flex:1, background:"transparent", border:"none", resize:"none",
            padding:0, minHeight:22, maxHeight:120,
          }}
        />
        <button
          className="btn btn-primary"
          style={{ padding:"8px 16px", fontSize:13, flexShrink:0 }}
          onClick={() => sendMessage()}
          disabled={!input.trim() || loading}
        >Send ↑</button>
      </div>

      <div style={{ fontSize:10, color:"var(--muted)", textAlign:"center", marginTop:8 }}>
        Replies broadcast to HCS outbound topic · Verifiable on HashScan
        {agent?.accountId && ` · Agent: ${agent.accountId}`}
      </div>
    </div>
  )
}
