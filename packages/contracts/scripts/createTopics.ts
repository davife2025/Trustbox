/* scripts/createTopics.ts
   Creates all 4 HCS topics on Hedera testnet using the Hedera JS SDK.
   Run from packages/contracts/:
     npx ts-node scripts/createTopics.ts
   Requires: HEDERA_OPERATOR_ID + HEDERA_OPERATOR_KEY in root .env
   ─────────────────────────────────────────────────────────────────── */

import {
  Client,
  TopicCreateTransaction,
  PrivateKey,
  AccountId,
} from "@hashgraph/sdk"
import * as dotenv from "dotenv"
import * as path   from "path"
import * as fs     from "fs"

// Load .env from monorepo root (works regardless of cwd)
dotenv.config({ path: path.resolve(__dirname, "../../../.env") })

const TOPICS = [
  { name: "HCS_AUDIT_TOPIC_ID",      memo: "TrustBoxHedera: Smart Contract Audit Trails"  },
  { name: "HCS_INTENT_TOPIC_ID",     memo: "TrustBoxHedera: Intent Execution Lifecycle"   },
  { name: "HCS_AGENT_TOPIC_ID",      memo: "TrustBoxHedera: Agent Registration + Trust"   },
  { name: "HCS_BLINDAUDIT_TOPIC_ID", memo: "TrustBoxHedera: TEE Blind Audit Attestations" },
]

async function main() {
  const operatorId  = process.env.HEDERA_OPERATOR_ID
  const operatorKey = process.env.HEDERA_OPERATOR_KEY

  if (!operatorId || !operatorKey) {
    throw new Error(
      "HEDERA_OPERATOR_ID and HEDERA_OPERATOR_KEY must be set in .env\n" +
      "Get a testnet account at https://portal.hedera.com"
    )
  }

  const client = Client.forTestnet()
  client.setOperator(
    AccountId.fromString(operatorId),
    PrivateKey.fromString(operatorKey)
  )

  console.log("\n╔══════════════════════════════════════════════════╗")
  console.log("║  TrustBoxHedera AI — Create HCS Topics           ║")
  console.log("╚══════════════════════════════════════════════════╝")
  console.log(`  Operator: ${operatorId}\n`)

  const results: Record<string, string> = {}

  for (const topic of TOPICS) {
    console.log(`  Creating ${topic.name}…`)
    const tx = await new TopicCreateTransaction()
      .setTopicMemo(topic.memo)
      .setAdminKey(PrivateKey.fromString(operatorKey).publicKey)
      .setSubmitKey(PrivateKey.fromString(operatorKey).publicKey)
      .execute(client)

    const receipt = await tx.getReceipt(client)
    const topicId = receipt.topicId!.toString()
    results[topic.name] = topicId

    console.log(`  ✅ ${topic.name}=${topicId}`)
    console.log(`     HashScan: https://hashscan.io/testnet/topic/${topicId}\n`)
  }

  // ── Auto-update root .env ────────────────────────────────────────────────
  const envPath = path.resolve(__dirname, "../../../.env")
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, "utf8")
    for (const [key, val] of Object.entries(results)) {
      const regex = new RegExp(`^${key}=.*$`, "m")
      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, `${key}=${val}`)
      } else {
        envContent += `\n${key}=${val}`
      }
    }
    fs.writeFileSync(envPath, envContent)
    console.log("  ✅ .env updated automatically\n")
  }

  // ── Save topics.json ─────────────────────────────────────────────────────
  const outPath = path.resolve(__dirname, "../../../topics.json")
  fs.writeFileSync(outPath, JSON.stringify({ ...results, createdAt: new Date().toISOString() }, null, 2))

  // ── Print .env block ─────────────────────────────────────────────────────
  console.log("  ── Copy to .env if not auto-updated ─────────────────")
  for (const [key, val] of Object.entries(results)) {
    console.log(`  ${key}=${val}`)
  }
  console.log(`\n  📄 Saved → topics.json`)

  client.close()
  console.log("\n✅ All HCS topics created.\n")
}

main().catch(err => {
  console.error("\n❌ Error:", err.message)
  process.exit(1)
})
