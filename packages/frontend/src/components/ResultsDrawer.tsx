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

  const [phase,    setPhase]    = useState<Phase>("idle")
  const [prepData, setPrepData] = useState<any>(null)
  const [result,   setResult]   = useState<any>(null)
  const [errorMsg, setErrorMsg] = useState<string>("")

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

      if (!endpoint) { setPhase("error"); setErrorMsg("Unknown action"); return }

      // Render free tier has cold starts — retry once after 3s if connection dropped
      let res: Response
      try {
        res = await authFetch(endpoint, {
          method: "POST",
          body:   JSON.stringify({ ...fields, walletAddress: address }),
        })
      } catch (connErr: any) {
        // Cold start — wait and retry once
        setErrorMsg("Backend waking up… retrying in 5s")
        await new Promise(r => setTimeout(r, 5000))
        res = await authFetch(endpoint, {
          method: "POST",
          body:   JSON.stringify({ ...fields, walletAddress: address }),
        })
      }

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
      // What the user signs depends on the workflow
      const toSign =
        action === "verify"  ? (prepData?.metadataURI ?? address!) :
        action === "audit"   ? prepData?.reportHash                 :
        action === "execute" ? prepData?.specHash                   : address!

      const signature = await signMessage(toSign)
      setPhase("submitting")

      const endpoint =
        action === "verify"  ? `${API_URL}/api/verify/mint`   :
        action === "audit"   ? `${API_URL}/api/audit`          :
        action === "execute" ? `${API_URL}/api/intent/submit`  : ""

      // Build body — for execute, spread prepData fields individually to avoid conflicts
      let body: Record<string, any>
      if (action === "execute") {
        body = {
          ...fields,
          walletAddress: address,
          nlHash:        prepData?.nlHash,
          specHash:      prepData?.specHash,
          specJson:      prepData?.specJson,  // already parsed object
          category:      fields.category ?? prepData?.specJson?.category ?? "general",
          signature,
        }
      } else {
        body = { ...fields, walletAddress: address, ...prepData, signature }
      }

      const res  = await authFetch(endpoint, {
        method: "POST",
        body:   JSON.stringify(body),
      })
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
      // Sign wallet address as proof of ownership
      const signature = await signMessage(address!)
      setPhase("submitting")

      const endpoint =
        action === "scan"       ? `${API_URL}/api/scan`       :
        action === "blindaudit" ? `${API_URL}/api/blindaudit` : ""

      if (!endpoint) { setPhase("error"); setErrorMsg("Unknown action"); return }

      const res  = await authFetch(endpoint, {
        method: "POST",
        body:   JSON.stringify({ ...fields, walletAddress: address, signature }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? data.message ?? "Request failed")

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
    <div style={{
      display:"flex", justifyContent:"space-between", alignItems:"center",
      padding:"8px 0", borderBottom:"1px solid var(--border)",
    }}>
      <span style={{ color:"var(--muted)", fontSize:12, flexShrink:0, marginRight:12 }}>{label}</span>
      <span style={{
        fontSize:12, fontFamily: mono ? "monospace" : undefined,
        color:"var(--text)", maxWidth:240,
        overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
        textAlign:"right",
      }}>{val}</span>
    </div>
  )

  const Link = ({ href, label }: { href: string; label: string }) =>
    href ? (
      <a href={href} target="_blank" rel="noreferrer" style={{
        color:"var(--hbar)", fontSize:12, display:"block", marginTop:6,
      }}>{label} ↗</a>
    ) : null

  const severityColor = (s: string) =>
    s === "critical" ? "var(--red)"   :
    s === "high"     ? "#ff6400"      :
    s === "medium"   ? "var(--hbar)"  :
    s === "low"      ? "var(--amber)" : "var(--muted)"

  const actionLabel: Record<string, string> = {
    audit:"Contract Audit", verify:"Agent Credential",
    execute:"Intent Execution", scan:"Security Scan", blindaudit:"Blind TEE Audit",
  }

  return (
    <div style={{
      position:"fixed", top:0, right:0, height:"100vh", width:440,
      background:"var(--surface)", borderLeft:"1px solid var(--border)",
      display:"flex", flexDirection:"column", zIndex:200,
    }}>
      {/* Header */}
      <div style={{
        display:"flex", justifyContent:"space-between", alignItems:"center",
        padding:"16px 20px", borderBottom:"1px solid var(--border)",
        position:"sticky", top:0, background:"var(--surface)", zIndex:1,
      }}>
        <span style={{ fontWeight:600, fontSize:15 }}>{actionLabel[action]}</span>
        <button onClick={onClose} style={{
          background:"none", border:"none", color:"var(--muted)",
          cursor:"pointer", fontSize:20, lineHeight:1,
        }}>✕</button>
      </div>

      <div style={{ padding:"20px", flex:1, overflowY:"auto" }}>

        {/* Loading / Signing / Submitting */}
        {(phase === "loading" || phase === "signing" || phase === "submitting") && (
          <div style={{ textAlign:"center", padding:"60px 0" }}>
            <div className="spinner" style={{ margin:"0 auto 16px" }} />
            <p style={{ color:"var(--muted)", fontSize:13 }}>
              {phase === "loading"    ? "Analysing with Groq AI…"       :
               phase === "signing"   ? "Waiting for wallet signature…"  :
               "Anchoring on Hedera HSCS…"}
            </p>
            {phase === "submitting" && (
              <p style={{ color:"var(--muted)", fontSize:11, marginTop:8 }}>
                This may take 5–15 seconds on Hedera Testnet
              </p>
            )}
          </div>
        )}

        {/* HITL Review */}
        {phase === "review" && prepData && (
          <div className="fade-in">
            <div style={{
              background:"var(--hbar-dim)", border:"1px solid var(--hbar)",
              borderRadius:8, padding:"12px 14px", marginBottom:16, fontSize:12,
              color:"var(--hbar)", lineHeight:1.6,
            }}>
              ⚠ Review carefully before signing. Your signature is a
              cryptographic commitment that will be anchored on Hedera.
            </div>

            {/* Audit findings */}
            {action === "audit" && (
              <>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:12 }}>
                  <span style={{ fontSize:13, fontWeight:600 }}>
                    {prepData.findings?.length} Finding{prepData.findings?.length !== 1 ? "s" : ""}
                  </span>
                  <span style={{ fontSize:12 }}>
                    Score: <span style={{ color:"var(--teal)", fontWeight:600 }}>
                      {prepData.score}/100
                    </span>
                  </span>
                </div>
                {prepData.findings?.map((f: any) => (
                  <div key={f.id} className="card" style={{ marginBottom:8, padding:"12px 14px" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4, gap:8 }}>
                      <span style={{ fontSize:12, fontWeight:600, flex:1 }}>{f.title}</span>
                      <span style={{
                        fontSize:10, padding:"2px 8px", borderRadius:10, flexShrink:0,
                        background: severityColor(f.severity) + "18",
                        color: severityColor(f.severity),
                        border: `1px solid ${severityColor(f.severity)}44`,
                      }}>{f.severity}</span>
                    </div>
                    <p style={{ color:"var(--muted)", fontSize:11, lineHeight:1.5 }}>{f.detail}</p>
                    {f.remediation && (
                      <p style={{ color:"var(--teal)", fontSize:11, marginTop:4 }}>
                        Fix: {f.remediation}
                      </p>
                    )}
                  </div>
                ))}
                <Row label="Analysed by" val={prepData.analysedBy ?? "Groq"} />
                <Row label="Report hash" val={prepData.reportHash?.slice(0, 22) + "…"} mono />
              </>
            )}

            {/* Intent spec */}
            {action === "execute" && prepData.specJson && (
              <>
                <div style={{ marginBottom:10, fontSize:12, color:"var(--muted)" }}>
                  Parsed by: <span style={{ color:"var(--text)" }}>{prepData.parsedBy ?? "Groq"}</span>
                </div>
                <pre style={{
                  background:"var(--surface2)", borderRadius:8, padding:14,
                  fontSize:11, overflow:"auto", marginBottom:12,
                  border:"1px solid var(--border)", lineHeight:1.6,
                }}>{JSON.stringify(prepData.specJson, null, 2)}</pre>
                <Row label="Spec hash" val={prepData.specHash?.slice(0, 22) + "…"} mono />
              </>
            )}

            {/* Agent metadata */}
            {action === "verify" && (
              <>
                <Row label="Agent ID"     val={prepData.agentId}                              />
                <Row label="Model hash"   val={prepData.modelHash?.slice(0, 22) + "…"}  mono />
                <Row label="Metadata CID" val={prepData.metadataCID?.slice(0, 22) + "…"} mono />
                <Row label="Trust score"  val={`${prepData.trustScore}/100`}               />
              </>
            )}

            <button
              className="btn btn-primary"
              style={{ width:"100%", marginTop:20, justifyContent:"center", fontSize:14 }}
              onClick={submitStep}
            >
              Sign & Anchor on Hedera →
            </button>
          </div>
        )}

        {/* Done */}
        {phase === "done" && result && (
          <div className="fade-in">
            <div style={{
              textAlign:"center", padding:"24px 0",
              borderBottom:"1px solid var(--border)", marginBottom:20,
            }}>
              <div style={{ fontSize:36, marginBottom:8 }}>✅</div>
              <div style={{ fontWeight:600, color:"var(--teal)", fontSize:16 }}>
                Anchored on Hedera
              </div>
              <div style={{ color:"var(--muted)", fontSize:12, marginTop:4 }}>
                Consensus timestamp recorded on HCS
              </div>
            </div>

            {result.txHash     && <Row label="Tx Hash"      val={result.txHash.slice(0, 22) + "…"}    mono />}
            {result.auditId    && <Row label="Audit ID"     val={result.auditId}                           />}
            {result.tokenId    && <Row label="Token ID"     val={result.tokenId}                           />}
            {result.intentId   && <Row label="Intent ID"    val={result.intentId}                          />}
            {result.jobId      && <Row label="Job ID"       val={result.jobId}                             />}
            {result.hcsSeqNum  && <Row label="HCS Seq #"    val={result.hcsSeqNum}                         />}
            {result.score      !== undefined && <Row label="Audit Score"  val={`${result.score}/100`}   />}
            {result.trustScore !== undefined && <Row label="Trust Score"  val={`${result.trustScore}/100`} />}
            {result.stakeAmount && <Row label="HBAR Staked" val={result.stakeAmount}                       />}
            {result.reportCID  && <Row label="Report CID"  val={result.reportCID.slice(0, 22) + "…"} mono />}
            {result.resultCID  && <Row label="Result CID"  val={result.resultCID.slice(0, 22) + "…"} mono />}

            <div style={{ marginTop:16, paddingTop:16, borderTop:"1px solid var(--border)" }}>
              <Link href={result.explorerUrl} label="View transaction on HashScan" />
              <Link href={result.hashscanUrl} label="View HCS trail on HashScan"   />
              {result.marketplaceUrl && <Link href={result.marketplaceUrl} label="View AgentMarketplace" />}
            </div>

            {/* Findings summary in done state */}
            {result.findings?.length > 0 && (
              <div style={{ marginTop:16 }}>
                <div style={{ fontSize:12, color:"var(--muted)", marginBottom:8 }}>
                  {result.findings.length} findings anchored via Merkle root
                </div>
                {result.findings.slice(0, 3).map((f: any) => (
                  <div key={f.id} style={{
                    display:"flex", gap:8, alignItems:"center",
                    padding:"4px 0", fontSize:11,
                  }}>
                    <span style={{ color: severityColor(f.severity) }}>●</span>
                    <span style={{ color:"var(--muted)" }}>{f.title}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {phase === "error" && (
          <div className="fade-in">
            <div style={{
              background:"var(--red-dim)", border:"1px solid var(--red)",
              borderRadius:8, padding:"14px 16px", marginBottom:16,
            }}>
              <div style={{ color:"var(--red)", fontWeight:600, marginBottom:6, fontSize:13 }}>
                Something went wrong
              </div>
              <p style={{ color:"var(--muted)", fontSize:12, lineHeight:1.6 }}>{errorMsg}</p>
            </div>
            <button
              className="btn btn-outline"
              style={{ width:"100%", justifyContent:"center" }}
              onClick={isHITL ? prepareStep : autoRun}
            >↩ Retry</button>
          </div>
        )}

      </div>
    </div>
  )
}
