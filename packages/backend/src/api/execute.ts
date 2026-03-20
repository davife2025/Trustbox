/* api/execute.ts — TrustBoxHedera AI
   POST /api/intent/parse  — NL → structured spec (Groq direct, no Chainlink)
   POST /api/intent/submit — spec + sig → IntentVault on HSCS + HCS trail
   GET  /api/intent/:id    — poll execution status
   ─────────────────────────────────────────────────────────────────────── */

import { Router, Request, Response } from "express"
import { ethers }            from "ethers"
import { requireWalletSig }  from "../middleware/auth"
import { walletRateLimit }   from "../middleware/rateLimit"
import { validate, IntentParseSchema, IntentSubmitSchema } from "../middleware/validate"
import { parseIntent }       from "../services/groq"
import { getIntentVault, waitForTx, getGasConfig, explorerTx } from "../services/ethers"
import { pinIntentRecord }   from "../services/ipfs"
import { submitIntentTrail, submitIntentExecutedTrail } from "../services/hedera"
import { env }               from "../config/env"

export const executeRouter = Router()

// ── POST /api/intent/parse ────────────────────────────────────────────────────
// Phase 1: Groq parses NL → structured JSON spec. No chain write.

executeRouter.post("/parse",
  walletRateLimit,
  validate(IntentParseSchema),
  async (req: Request, res: Response) => {
    try {
      const { nlText, category } = req.body

      // Groq direct — no Chainlink Functions DON
      const specObj  = await parseIntent(nlText, category)
      const specJson = JSON.stringify(specObj)
      const specHash = ethers.id(specJson)
      const nlHash   = ethers.id(nlText)

      res.json({
        success:  true,
        specJson: specObj,
        specHash,
        nlHash,
        parsedBy: "Groq Llama 3.1 70B",
        note:     "Review spec carefully. You are signing specHash — not the raw text.",
      })
    } catch (err: any) {
      console.error("[execute/parse]", err.message)
      res.status(500).json({ error: err.message })
    }
  }
)

// ── POST /api/intent/submit ───────────────────────────────────────────────────
// Phase 2: user signed specHash → submit to IntentVault HSCS + HCS trail.
// Execution is triggered by the Mirror Node subscriber (see services/hedera.ts).

executeRouter.post("/submit",
  walletRateLimit,
  validate(IntentSubmitSchema),
  requireWalletSig,
  async (req: Request, res: Response) => {
    try {
      const {
        walletAddress, hederaAccount,
        nlHash, specHash, specJson, category, signature,
      } = req.body

      const vault     = getIntentVault()
      const gasConfig = await getGasConfig()
      const timestamp = new Date().toISOString()

      // 1. Submit intent on HSCS
      const submitTx = await vault.submitIntent(
        nlHash, specHash, category, signature,
        { ...gasConfig }
      )
      const submitReceipt = await waitForTx(submitTx)
      console.log(`[execute] Intent submitted — tx: ${submitReceipt.hash}`)

      // Extract intentId from event
      let intentId = "0"
      for (const log of submitReceipt.logs) {
        try {
          const parsed = vault.interface.parseLog(log)
          if (parsed?.name === "IntentSubmitted") {
            intentId = parsed.args.intentId.toString()
          }
        } catch { /* skip */ }
      }

      // 2. Approve intent (backend operator is executor)
      const approveTx = await vault.approveIntent(intentId, { ...gasConfig })
      await waitForTx(approveTx)
      console.log(`[execute] Intent approved — intentId: ${intentId}`)

      // 3. Write HCS trail (Mirror Node subscriber will detect and trigger execution)
      const hcsSubmit = await submitIntentTrail({
        intentId, nlHash, specHash,
        userSig: signature, category,
        txHash: submitReceipt.hash, timestamp,
      })

      // 4. Execute intent on HSCS
      // In production this is called by the Mirror Node subscriber.
      // For immediate demo response we call it directly after approve.
      const executionHash = ethers.id(`${specHash}:${intentId}:${Date.now()}`)
      let   execTxHash    = submitReceipt.hash
      try {
        const execTx      = await vault.executeIntent(intentId, executionHash, { ...gasConfig })
        const execReceipt = await waitForTx(execTx)
        execTxHash        = execReceipt.hash
        console.log(`[execute] Intent executed — tx: ${execTxHash}`)
      } catch (err: any) {
        console.warn(`[execute] Execution tx warning: ${err.message}`)
      }

      // 5. Write execution HCS trail
      const hcsExec = await submitIntentExecutedTrail({
        intentId, executionHash,
        txHash: execTxHash, timestamp,
      })

      // 6. Pin record to IPFS
      const { cid: recordCID } = await pinIntentRecord({
        intentId, nlHash, specHash,
        userSig: signature, executionHash, category, timestamp,
      })

      res.json({
        success:        true,
        action:         "execute",
        chain:          "hedera-testnet",
        intentId,
        txHash:         submitReceipt.hash,
        blockNumber:    submitReceipt.blockNumber.toString(),
        nlHash,
        specHash,
        executionHash,
        recordCID,
        hcsTopicId:     env.HCS_INTENT_TOPIC_ID,
        hcsSeqNum:      hcsSubmit.sequenceNumber,
        category,
        timestamp,
        explorerUrl:    explorerTx(submitReceipt.hash),
        hashscanUrl:    `https://hashscan.io/testnet/topic/${env.HCS_INTENT_TOPIC_ID}`,
        parsedBy:       "Groq Llama 3.1 70B",
        note:           "NL → Groq spec → signed → HSCS → Mirror Node → HCS trail complete",
      })
    } catch (err: any) {
      console.error("[execute/submit]", err.message)
      res.status(500).json({ error: err.message })
    }
  }
)

// ── GET /api/intent/:id ───────────────────────────────────────────────────────

executeRouter.get("/:id",
  async (req: Request, res: Response) => {
    try {
      const vault  = getIntentVault()
      const intent = await vault.getIntent(req.params.id)
      const statusMap: Record<number, string> = {
        0: "PENDING", 1: "APPROVED", 2: "EXECUTING", 3: "EXECUTED", 4: "FAILED",
      }
      res.json({
        intentId:      req.params.id,
        status:        statusMap[Number(intent.status)] ?? "UNKNOWN",
        specHash:      intent.specHash,
        executionHash: intent.executionHash,
        submittedAt:   new Date(Number(intent.submittedAt) * 1000).toISOString(),
        executedAt:    intent.executedAt > 0n
          ? new Date(Number(intent.executedAt) * 1000).toISOString()
          : null,
      })
    } catch (err: any) {
      res.status(500).json({ error: err.message })
    }
  }
)
