/* components/ResultsDrawer.tsx — TrustBoxHedera AI
   Handles all 5 workflow result displays + HITL approval flow.
   ─────────────────────────────────────────────────────────── */

import { useState, useEffect } from "react"
import { API_URL, hashscanTx, hashscanTopic } from "../constant"
import { useWalletContext }  from "../context/WalletContext"
import { useAuthContext }    from "../context/AuthContext"

interface Props {
  action:   "audit" | "verify" | "execute" | "scan" | "blindaudit"
  fields:   Record<string, string>
  isHITL:   boolean
  onClose:  () => void
  onSuccess:(result: any) => void
}

type Phase = "idle" | "loading" | "review" | "signing" | "submitting" | "done" | "error"

export default function ResultsDrawer({ action, fields, isHITL, onClose, onSuccess }: Props) {
  const { address, signMessage } = useWalletContext()
  const { authFetch }            = useAuthContext()

  const [phase,     setPhase]     = useState<Phase>("idle")
  const [prepData,  setPrepData]  = useState<any>(null)
  const [result,    setResult]    = useState<any>(null)
  const [errorMsg,  setErrorMsg]  = useState<string>("")

  useEffect(() => {
    if (isHITL) prepareStep()
    else        autoRun()
  }, [])

  // ── Phase 1: prepare ───────────────────────────────────────────────────────

  async function prepareStep() {
    setPhase("loading")
    try {
      const endpoint =
        action === "verify"  ? `${API_URL}/api/verify/prepare` :
        action === "audit"   ? `${API_URL}/api/audit/prepare`  :
        action === "execute" ? `${API_URL}/api/intent/parse`   : ""

      const res  = await authFetch(endpoint, {
        method: "POST",
        body:   JSON.stringify({ ...fields, walletAddress: address }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Prepare failed")
      setPrepData(data)
      setPhase("review")
    } catch (err: any) {
      setErrorMsg(err.message)
      setPhase("error")
    }
  }

  // ── Phase 2: sign + submit ─────────────────────────────────────────────────

  async function submitStep() {
    setPhase("signing")
    try {
      // Determine what to sign
      const toSign =
        action === "verify"  ? (prepData?.metadataURI ?? address!) :
        action === "audit"   ? prepData?.reportHash   :
        action === "execute" ? prepData?.specHash      : address!

      const signature = await signMessage(toSign)
      setPhase("submitting")

      const endpoint =
        action === "verify"  ? `${API_URL}/api/verify/mint`   :
        action === "audit"   ? `${API_URL}/api/audit`          :
        action === "execute" ? `${API_URL}/api/intent/submit`  : ""

      const body = action === "execute"
        ? { ...fields, walletAddress: address, ...prepData, specJson: prepData?.specJson, signature }
        : { ...fields, walletAddress: address, ...prepData, signature }

      const res  = await authFetch(endpoint, { method: "POST", body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Submit failed")

      setResult(data)
      setPhase("done")
      onSuccess(data)
    } catch (err: any) {
      setErrorMsg(err.message)
      setPhase("error")
    }
  }

  // ── Non-HITL: auto-run ─────────────────────────────────────────────────────

  async function autoRun() {
    setPhase("loading")
    try {
      const sig      = await signMessage(address!)
      const endpoint =
        action === "scan"       ? `${API_URL}/api/scan`       :
        action === "blindaudit" ? `${API_URL}/api/blindaudit` : ""

      const res  = await authFetch(endpoint, {
        method: "POST",
        body:   JSON.stringify({ ...fields, walletAddress: address, signature: sig }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? data.message ?? "Failed")

      setResult(data)
      setPhase("done")
      onSuccess(data)
    } catch (err: any) {
      setErrorMsg(err.message)
      setPhase("error")
    }
  }

  // ── Render helpers ─────────────────────────────────────────────────────────

  const Row = ({ label, val, mono = false }: { label: string; val: string; mono?: boolean }) => (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
      padding:"8px 0", borderBottom:"1px solid var(--border)" }}>
      <span style={{ color:"var(--muted)", fontSize:12 }}>{label}</span>
      <span style={{
        fontSize:12, fontFamily: mono ? "monospace" : undefined,
        color:"var(--text)", maxWidth:300, overflow:"hidden",
        textOverflow:"ellipsis", whiteSpace:"nowrap",
      }}>{val}</span>
    </div>
  )

  const Link = ({ href, label }: { href: string; label: string }) =>
    href ? <a href={href} target="_blank" rel="noreferrer"
      style={{ color:"var(--hbar)", fontSize:12, display:"block", marginTop:4 }}>{label} ↗</a>
    : null

  // ── UI ─────────────────────────────────────────────────────────────────────

  return (
    <div style={{
      position:"fixed", top:0, right:0, height:"100vh", width:420,
      background:"var(--surface)", borderLeft:"1px solid var(--border)",
      display:"flex", flexDirection:"column", zIndex:200, overflowY:"auto",
    }}>
      {/* Header */}
      <div style={{
        display:"flex", justifyContent:"space-between", alignItems:"center",
        padding:"16px 20px", borderBottom:"1px solid var(--border)",
        position:"sticky", top:0, background:"var(--surface)",
      }}>
        <span style={{ fontWeight:600 }}>
          {{ audit:"Contract Audit", verify:"Agent Credential",
             execute:"Intent Execution", scan:"Security Scan",
             blindaudit:"Blind TEE Audit" }[action]}
        </span>
        <button onClick={onClose} style={{
          background:"none", border:"none", color:"var(--muted)",
          cursor:"pointer", fontSize:18,
        }}>✕</button>
      </div>

      <div style={{ padding:"20px", flex:1 }}>

        {/* Loading */}
        {(phase === "loading" || phase === "signing" || phase === "submitting") && (
          <div style={{ textAlign:"center", padding:"60px 0" }}>
            <div className="spinner" style={{ margin:"0 auto 16px" }} />
            <p style={{ color:"var(--muted)", fontSize:13 }}>
              { phase === "loading"    ? "Analysing with Groq AI…"     :
                phase === "signing"   ? "Waiting for signature…"       :
                "Anchoring on Hedera HSCS…" }
            </p>
          </div>
        )}

        {/* Review (HITL) */}
        {phase === "review" && prepData && (
          <div className="fade-in">
            <div style={{
              background:"var(--hbar-dim)", border:"1px solid var(--hbar)",
              borderRadius:8, padding:"12px 14px", marginBottom:16, fontSize:12,
            }}>
              ⚠ Review carefully. You are signing a cryptographic commitment —
              not the raw text.
            </div>

            {/* Audit findings */}
            {action === "audit" && prepData.findings?.map((f: any) => (
              <div key={f.id} className="card" style={{ marginBottom:10, padding:"12px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                  <span style={{ fontSize:12, fontWeight:600 }}>{f.title}</span>
                  <span style={{ fontSize:10, padding:"2px 8px", borderRadius:10,
                    background: f.severity==="critical"?"var(--red-dim)":
                                f.severity==="high"?"rgba(255,100,0,.1)":
                                f.severity==="medium"?"var(--hbar-dim)":"var(--surface2)",
                    color: f.severity==="critical"?"var(--red)":
                           f.severity==="high"?"#ff6400":
                           f.severity==="medium"?"var(--hbar)":"var(--muted)",
                  }}>{f.severity}</span>
                </div>
                <p style={{ color:"var(--muted)", fontSize:11 }}>{f.detail}</p>
              </div>
            ))}

            {/* Intent spec */}
            {action === "execute" && prepData.specJson && (
              <pre style={{
                background:"var(--surface2)", borderRadius:8, padding:14,
                fontSize:11, overflow:"auto", marginBottom:16,
                border:"1px solid var(--border)",
              }}>{JSON.stringify(prepData.specJson, null, 2)}</pre>
            )}

            {/* Agent metadata */}
            {action === "verify" && (
              <div>
                <Row label="Agent ID"     val={prepData.agentId}     mono />
                <Row label="Model Hash"   val={prepData.modelHash?.slice(0,20)+"…"} mono />
                <Row label="Metadata CID" val={prepData.metadataCID} mono />
                <Row label="Trust Score"  val={`${prepData.trustScore}/100`} />
              </div>
            )}

            <button
              className="btn btn-primary"
              style={{ width:"100%", marginTop:20, justifyContent:"center" }}
              onClick={submitStep}
            >Sign & Anchor on Hedera →</button>
          </div>
        )}

        {/* Done */}
        {phase === "done" && result && (
          <div className="fade-in">
            <div style={{
              textAlign:"center", padding:"20px 0 24px",
              borderBottom:"1px solid var(--border)", marginBottom:20,
            }}>
              <div style={{ fontSize:32, marginBottom:8 }}>✅</div>
              <div style={{ fontWeight:600, color:"var(--teal)", fontSize:15 }}>
                Anchored on Hedera
              </div>
            </div>

            {result.txHash    && <Row label="Tx Hash"    val={result.txHash.slice(0,20)+"…"}    mono />}
            {result.auditId   && <Row label="Audit ID"   val={result.auditId}  />}
            {result.tokenId   && <Row label="Token ID"   val={result.tokenId}  />}
            {result.intentId  && <Row label="Intent ID"  val={result.intentId} />}
            {result.hcsSeqNum && <Row label="HCS Seq#"   val={result.hcsSeqNum}/>}
            {result.score     !== undefined && <Row label="Audit Score" val={`${result.score}/100`} />}
            {result.trustScore!== undefined && <Row label="Trust Score" val={`${result.trustScore}/100`} />}
            {result.reportCID && <Row label="Report CID" val={result.reportCID.slice(0,20)+"…"} mono />}

            <div style={{ marginTop:16 }}>
              {result.explorerUrl && <Link href={result.explorerUrl} label="View on HashScan" />}
              {result.hashscanUrl && <Link href={result.hashscanUrl} label="View HCS Trail"   />}
            </div>
          </div>
        )}

        {/* Error */}
        {phase === "error" && (
          <div className="fade-in">
            <div style={{
              background:"var(--red-dim)", border:"1px solid var(--red)",
              borderRadius:8, padding:14, marginBottom:16,
            }}>
              <div style={{ color:"var(--red)", fontWeight:600, marginBottom:4 }}>Error</div>
              <p style={{ color:"var(--muted)", fontSize:12 }}>{errorMsg}</p>
            </div>
            <button
              className="btn btn-outline"
              style={{ width:"100%", justifyContent:"center" }}
              onClick={isHITL ? prepareStep : autoRun}
            >Retry</button>
          </div>
        )}

      </div>
    </div>
  )
}
