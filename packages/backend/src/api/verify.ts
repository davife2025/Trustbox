/* api/verify.ts — TrustBoxHedera AI
   POST /api/verify/prepare — compute hashes + pin metadata (no chain write)
   POST /api/verify/mint    — mint ERC-8004 NFT on HSCS + HCS trail
   ─────────────────────────────────────────────────────────────────────── */

import { Router, Request, Response } from "express"
import { ethers }           from "ethers"
import { requireWalletSig } from "../middleware/auth"
import { walletRateLimit }  from "../middleware/rateLimit"
import { validate, VerifySchema } from "../middleware/validate"
import { getTrustRegistry, waitForTx, getGasConfig, explorerTx } from "../services/ethers"
import { pinAgentMetadata } from "../services/ipfs"
import { submitAgentTrail } from "../services/hedera"
import { env }              from "../config/env"

export const verifyRouter = Router()

// ── POST /api/verify/prepare ─────────────────────────────────────────────────

verifyRouter.post("/prepare",
  walletRateLimit,
  async (req: Request, res: Response) => {
    try {
      const { walletAddress, agentName, model, operator, capabilities, environment } = req.body
      if (!agentName || !model || !walletAddress) {
        return res.status(400).json({ error: "agentName, model, walletAddress required" })
      }

      const capsArray  = (capabilities ?? "").split(",").map((c: string) => c.trim()).filter(Boolean)
      const agentId    = `agt_${ethers.id(agentName + (operator ?? walletAddress) + Date.now()).slice(2, 14)}`
      const modelHash  = ethers.id(`${model}:${capsArray.join(",")}`)
      const capHash    = ethers.id(capsArray.join(","))
      const mintedAt   = new Date().toISOString()
      const trustScore = 85

      const { cid, url } = await pinAgentMetadata({
        agentId, name: agentName, model,
        operator:     operator ?? walletAddress,
        capabilities: capsArray,
        environment:  environment ?? "cloud",
        modelHash, trustScore, mintedAt,
      })

      res.json({
        success:     true,
        agentId,
        modelHash,
        capHash,
        metadataCID: cid,
        metadataURL: url,
        metadataURI: `ipfs://${cid}`,
        trustScore,
        mintedAt,
        note: "Review agent details. Sign in MetaMask or HashConnect to authorise ERC-8004 mint on Hedera.",
      })
    } catch (err: any) {
      console.error("[verify/prepare]", err.message)
      res.status(500).json({ error: err.message })
    }
  }
)

// ── POST /api/verify/mint ────────────────────────────────────────────────────

verifyRouter.post("/mint",
  walletRateLimit,
  validate(VerifySchema),
  requireWalletSig,
  async (req: Request, res: Response) => {
    try {
      const {
        walletAddress, agentName, model, operator,
        capabilities, environment,
        agentId: bodyAgentId, modelHash: bodyModelHash,
        metadataCID: bodyMetadataCID, metadataURI: bodyMetadataURI,
      } = req.body

      const capsArray = (capabilities ?? "").split(",").map((c: string) => c.trim()).filter(Boolean)

      const agentId   = bodyAgentId    ?? `agt_${ethers.id(agentName + (operator ?? walletAddress) + Date.now()).slice(2, 14)}`
      const modelHash = bodyModelHash  ?? ethers.id(`${model}:${capsArray.join(",")}`)
      const capHash   = ethers.id(capsArray.join(","))
      const mintedAt  = new Date().toISOString()

      let metadataCID = bodyMetadataCID
      let metadataURI = bodyMetadataURI ?? `ipfs://${bodyMetadataCID}`
      let metadataURL = metadataCID ? `https://ipfs.io/ipfs/${metadataCID}` : ""

      if (!metadataCID) {
        const pinned = await pinAgentMetadata({
          agentId, name: agentName, model,
          operator:     operator ?? walletAddress,
          capabilities: capsArray,
          environment:  environment ?? "cloud",
          modelHash, trustScore: 85, mintedAt,
        })
        metadataCID = pinned.cid
        metadataURL = pinned.url
        metadataURI = `ipfs://${metadataCID}`
      }

      // Mint ERC-8004 on HSCS
      const registry  = getTrustRegistry()
      const gasConfig = await getGasConfig()

      const tx = await registry.mintCredential(
        agentId, modelHash, walletAddress, capHash, metadataURI,
        { ...gasConfig }
      )
      const receipt = await waitForTx(tx)
      console.log(`[verify/mint] ERC-8004 minted — tx: ${receipt.hash}`)

      let tokenId = "0"
      for (const log of receipt.logs) {
        try {
          const parsed = registry.interface.parseLog(log)
          if (parsed?.name === "CredentialMinted") {
            tokenId = parsed.args.tokenId?.toString() ?? "0"
          }
        } catch { /* skip */ }
      }

      // Write HCS trail
      const hcs = await submitAgentTrail({
        agentId, tokenId, operator: walletAddress,
        modelHash, txHash: receipt.hash, timestamp: mintedAt,
      })

      res.json({
        success:      true,
        action:       "verify",
        chain:        "hedera-testnet",
        tokenId,
        agentId,
        modelHash,
        capHash,
        metadataCID,
        metadataURL,
        metadataURI,
        txHash:       receipt.hash,
        blockNumber:  receipt.blockNumber.toString(),
        gasUsed:      receipt.gasUsed.toString(),
        mintedAt,
        explorerUrl:  explorerTx(receipt.hash),
        hcsTopicId:   env.HCS_AGENT_TOPIC_ID,
        hcsSeqNum:    hcs.sequenceNumber,
        hashscanUrl:  `https://hashscan.io/testnet/topic/${env.HCS_AGENT_TOPIC_ID}`,
        agentScore:   85,
        issuer:       "TrustBoxHedera TrustRegistry v1.0",
      })
    } catch (err: any) {
      console.error("[verify/mint]", err.message)
      res.status(500).json({ error: err.message })
    }
  }
)
