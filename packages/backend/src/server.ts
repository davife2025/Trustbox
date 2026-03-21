/* server.ts — TrustBoxHedera AI
   Entry point. Starts Express server + Hedera Mirror Node intent subscriber.
   ─────────────────────────────────────────────────────────────────────────── */

import "dotenv/config"
import app from "./app"
import { env } from "./config/env"
import { startIntentSubscriber } from "./services/hedera"
import { startHCS10Listener, registerTrustBoxAgent } from "./agent/hcs10"
import { routeMessage } from "./agent/router"
import { getIntentVault, waitForTx, getGasConfig } from "./services/ethers"
import { ethers } from "ethers"

const PORT = Number(env.PORT) || 4000

// ── Mirror Node subscriber callback ──────────────────────────────────────────
// Called when an INTENT_SUBMITTED message is detected on HCS_INTENT_TOPIC.
// Simulates what Chainlink Automation did in the old project.

async function onIntentApproved(intentId: string, specHash: string): Promise<void> {
  try {
    console.log(`[subscriber] Executing intent ${intentId}`)
    const vault         = getIntentVault()
    const gasConfig     = await getGasConfig()
    const executionHash = ethers.id(`${specHash}:${intentId}:${Date.now()}`)
    const tx            = await vault.executeIntent(intentId, executionHash, { ...gasConfig })
    await waitForTx(tx)
    console.log(`[subscriber] Intent ${intentId} executed — hash: ${executionHash}`)
  } catch (err: any) {
    console.warn(`[subscriber] Intent execution failed for ${intentId}: ${err.message}`)
  }
}

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, async () => {
  console.log("\n╔══════════════════════════════════════════════════╗")
  console.log("║  TrustBoxHedera AI — Backend                     ║")
  console.log("╚══════════════════════════════════════════════════╝")
  console.log(`  Port:    ${PORT}`)
  console.log(`  Network: Hedera ${env.HEDERA_NETWORK}`)
  console.log(`  RPC:     ${env.HEDERA_RPC_URL}`)
  console.log(`  Env:     ${env.NODE_ENV}\n`)

  // ── HOL Registry + HCS-10 agent ─────────────────────────────────────────
  try {
    await registerTrustBoxAgent()
    await startHCS10Listener(async (sender, message) => {
      return routeMessage(sender, message)
    })
    console.log("[hcs10] Agent online — accepting HCS-10 messages")
  } catch (err: any) {
    console.warn(`[hcs10] Agent init skipped: ${err.message}`)
  }

  // Start Mirror Node subscriber (replaces Chainlink Automation)
  await startIntentSubscriber(onIntentApproved, 5000)
})

process.on("SIGTERM", () => {
  console.log("[server] SIGTERM received — shutting down")
  process.exit(0)
})
