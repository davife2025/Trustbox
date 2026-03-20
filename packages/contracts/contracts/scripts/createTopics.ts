/* scripts/createTopics.ts
   Creates all 5 HCS topics on Hedera testnet using the Hedera JS SDK.
   Run: ts-node scripts/createTopics.ts
   Requires: HEDERA_OPERATOR_ID + HEDERA_OPERATOR_KEY in .env
   ─────────────────────────────────────────────────────────────────── */

import {
  Client,
  TopicCreateTransaction,
  PrivateKey,
  AccountId,
} from "@hashgraph/sdk"
import * as dotenv from "dotenv"
import * as path   from "fs"
import * as fs     from "fs"

dotenv.config({ path: "../../.env" })

const TOPICS = [
  { name: "HCS_AUDIT_TOPIC_ID",      memo: "TrustBoxHedera: Smart Contract Audit Trails"   },
  { name: "HCS_INTENT_TOPIC_ID",     memo: "TrustBoxHedera: Intent Execution Lifecycle"    },
  { name: "HCS_AGENT_TOPIC_ID",      memo: "TrustBoxHedera: Agent Registration + Trust"    },
  { name: "HCS_BLINDAUDIT_TOPIC_ID", memo: "TrustBoxHedera: TEE Blind Audit Attestations"  },
]

async function main() {
  const operatorId  = process.env.HEDERA_OPERATOR_ID
  const operatorKey = process.env.HEDERA_OPERATOR_KEY

  if (!operatorId || !operatorKey) {
    throw new Error("HEDERA_OPERATOR_ID and HEDERA_OPERATOR_KEY must be set in .env")
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
    const tx = await new TopicCreateTransaction()
      .setTopicMemo(topic.memo)
      .setAdminKey(PrivateKey.fromString(operatorKey).publicKey)
      .setSubmitKey(PrivateKey.fromString(operatorKey).publicKey)
      .execute(client)

    const receipt  = await tx.getReceipt(client)
    const topicId  = receipt.topicId!.toString()
    results[topic.name] = topicId

    console.log(`  ✅ ${topic.name}=${topicId}`)
    console.log(`     Memo: ${topic.memo}`)
    console.log(`     HashScan: https://hashscan.io/testnet/topic/${topicId}\n`)
  }

  // Write .env block
  console.log("  ── Add to .env ──────────────────────────────────────")
  for (const [key, val] of Object.entries(results)) {
    console.log(`  ${key}=${val}`)
  }

  // Save to topics.json
  const outPath = "../../topics.json"
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2))
  console.log(`\n  📄 Saved → topics.json`)

  client.close()
  console.log("\n✅ All HCS topics created.\n")
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
