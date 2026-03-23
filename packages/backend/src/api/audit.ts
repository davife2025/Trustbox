/* api/audit.ts — TrustBoxHedera AI
   POST /api/audit/prepare — Phase 1: Groq analysis → findings (no chain write)
   POST /api/audit         — Phase 2: auditor sig → AuditRegistry + HCS trail
   ─────────────────────────────────────────────────────────────────────────── */

import { Router, Request, Response } from "express"
import { ethers }              from "ethers"
import { MerkleTree }          from "merkletreejs"
import { requireJWT }          from "../middleware/auth"
import { walletRateLimit }     from "../middleware/rateLimit"
import { validate, AuditSchema } from "../middleware/validate"
import { getAuditRegistry, waitForTx, getGasConfig, signer, explorerTx, explorerContract } from "../services/ethers"
import { pinAuditReport }      from "../services/ipfs"
import { analyseContract }     from "../services/groq"
import { submitAuditTrail }    from "../services/hedera"
import { saveAudit }           from "../services/supabase"
import { env }                 from "../config/env"

export const auditRouter = Router()

// ── POST /api/audit/prepare ──────────────────────────────────────────────────
// Phase 1 — Groq analysis, no chain write, no wallet sig required.
// Returns findings + reportHash for HITL review.

auditRouter.post("/prepare",
  walletRateLimit,
  async (req: Request, res: Response) => {
    try {
      const { contractAddress, contractName, chain, walletAddress } = req.body
      if (!contractAddress) {
        return res.status(400).json({ error: "contractAddress required" })
      }

      const name      = contractName ?? contractAddress.slice(0, 10)
      const chainName = chain ?? "hedera-testnet"
      const auditedAt = new Date().toISOString()

      const { findings, score, analysedBy } = await analyseContract(
        contractAddress, name, chainName
      )

      // Compute Merkle root
      const findingHashes = findings.map(f =>
        Buffer.from(ethers.id(JSON.stringify(f)).slice(2), "hex")
      )
      const tree       = new MerkleTree(findingHashes, ethers.keccak256, { sort: true })
      const merkleRoot = tree.getHexRoot()

      // reportHash — what the auditor will sign
      const reportPayload = { contractAddress, contractName: name, chain: chainName, findings, score, merkleRoot, auditedAt }
      const reportHash    = ethers.id(JSON.stringify(reportPayload))

      res.json({
        success:      true,
        phase:        "prepare",
        contractAddress,
        contractName: name,
        chain:        chainName,
        findings,
        score,
        merkleRoot,
        reportHash,
        auditedAt,
        analysedBy,
        note: "Review findings. Sign reportHash in MetaMask or HashConnect to anchor on Hedera.",
      })
    } catch (err: any) {
      console.error("[audit/prepare]", err.message)
      res.status(500).json({ error: err.message })
    }
  }
)

// ── POST /api/audit ──────────────────────────────────────────────────────────
// Phase 2 — auditor reviewed + signed. Anchor on HSCS + HCS trail.

auditRouter.post("/",
  walletRateLimit,
  validate(AuditSchema),
  requireJWT,
  async (req: Request, res: Response) => {
    try {
      const {
        walletAddress, contractName, contractAddress,
        chain, deployer, findings, score,
        merkleRoot, reportHash, auditorSig, auditedAt: bodyAuditedAt,
      } = req.body

      const auditedAt = bodyAuditedAt ?? new Date().toISOString()
      const name      = contractName  ?? contractAddress?.slice(0, 10) ?? "Unknown"
      const chainName = chain         ?? "hedera-testnet"

      // Re-derive if not provided (single-phase fallback)
      let finalFindings = findings
      let finalScore    = score    ?? 85
      let finalMerkle   = merkleRoot
      let finalHash     = reportHash

      if (!finalFindings || !finalMerkle) {
        const analysis   = await analyseContract(contractAddress, name, chainName)
        finalFindings    = analysis.findings
        finalScore       = analysis.score
        const hashes     = finalFindings.map((f: any) =>
          Buffer.from(ethers.id(JSON.stringify(f)).slice(2), "hex")
        )
        const tree       = new MerkleTree(hashes, ethers.keccak256, { sort: true })
        finalMerkle      = tree.getHexRoot()
        const payload    = { contractAddress, contractName: name, chain: chainName, findings: finalFindings, score: finalScore, merkleRoot: finalMerkle, auditedAt }
        finalHash        = ethers.id(JSON.stringify(payload))
      }

      // Pin report to IPFS
      const report = {
        contractAddress, contractName: name, chain: chainName,
        deployer: deployer ?? "Unknown",
        findings: finalFindings, score: finalScore, merkleRoot: finalMerkle,
        methodology: "TrustBoxHedera AI Audit v1.0 — Groq Llama 3.1 70B",
        auditor: walletAddress, auditedAt,
      }
      const { cid, url } = await pinAuditReport(report)

      // Use auditor sig or sign server-side
      const sig = auditorSig ?? await signer.signMessage(finalHash)

      // Submit to AuditRegistry on HSCS
      const registry  = getAuditRegistry()
      const gasConfig = await getGasConfig()

      const tx = await registry.submitAudit(
        contractAddress,
        finalHash,
        finalMerkle,
        cid,
        sig,
        { ...gasConfig }
      )
      const receipt = await waitForTx(tx)
      console.log(`[audit] Anchored on HSCS — tx: ${receipt.hash}`)

      // Extract auditId from event
      let auditId = ""
      for (const log of receipt.logs) {
        try {
          const parsed = registry.interface.parseLog(log)
          if (parsed?.name === "AuditSubmitted") {
            auditId = parsed.args.auditId?.toString() ?? ""
          }
        } catch { /* skip */ }
      }

      // Write HCS trail
      const hcs = await submitAuditTrail({
        auditId, contractAddress, contractName: name,
        reportHash: finalHash, merkleRoot: finalMerkle,
        reportCID: cid, auditor: walletAddress,
        txHash: receipt.hash, timestamp: auditedAt,
      })

      // Save to Supabase
      saveAudit({
        id: auditId || `audit_${Date.now()}`,
        wallet: walletAddress, contract: contractAddress,
        score: finalScore, reportCid: cid,
        txHash: receipt.hash, hcsSeq: hcs.sequenceNumber,
      }).catch((e: any) => console.warn("[supabase] audit save:", e.message))

      const registryAddr = await registry.getAddress()

      res.json({
        success:      true,
        action:       "audit",
        chain:        "hedera-testnet",
        auditId,
        txHash:       receipt.hash,
        blockNumber:  receipt.blockNumber.toString(),
        gasUsed:      receipt.gasUsed.toString(),
        contractAddress,
        contractName: name,
        reportCID:    cid,
        reportURL:    url,
        reportHash:   finalHash,
        merkleRoot:   finalMerkle,
        score:        finalScore,
        findings:     finalFindings,
        hcsTopicId:   env.HCS_AUDIT_TOPIC_ID,
        hcsSeqNum:    hcs.sequenceNumber,
        auditedAt,
        explorerUrl:  explorerTx(receipt.hash),
        hashscanUrl:  `https://hashscan.io/testnet/topic/${env.HCS_AUDIT_TOPIC_ID}`,
        registryUrl:  explorerContract(registryAddr),
      })
    } catch (err: any) {
      console.error("[audit]", err.message)
      res.status(500).json({ error: err.message })
    }
  }
)
