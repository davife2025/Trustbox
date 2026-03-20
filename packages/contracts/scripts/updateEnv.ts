/* scripts/updateEnv.ts
   Reads packages/contracts/deployments/hederaTestnet.json
   and patches the root .env file with all 4 contract addresses.
   Run: npx ts-node scripts/updateEnv.ts
   ──────────────────────────────────────────────────────────── */

import * as path from "path"
import * as fs   from "fs"

const DEPLOY_FILE = path.resolve(__dirname, "../deployments/hederaTestnet.json")
const ENV_FILE    = path.resolve(__dirname, "../../../.env")

if (!fs.existsSync(DEPLOY_FILE)) {
  console.error("❌ deployments/hederaTestnet.json not found — run deploy first")
  process.exit(1)
}

if (!fs.existsSync(ENV_FILE)) {
  console.error("❌ .env not found at monorepo root")
  process.exit(1)
}

const deployed = JSON.parse(fs.readFileSync(DEPLOY_FILE, "utf8"))

const mapping: Record<string, string> = {
  TRUST_REGISTRY_ADDR:    deployed.TrustRegistry,
  AUDIT_REGISTRY_ADDR:    deployed.AuditRegistry,
  AGENT_MARKETPLACE_ADDR: deployed.AgentMarketplace,
  INTENT_VAULT_ADDR:      deployed.IntentVault,
}

let envContent = fs.readFileSync(ENV_FILE, "utf8")

for (const [key, val] of Object.entries(mapping)) {
  const regex = new RegExp(`^${key}=.*$`, "m")
  if (regex.test(envContent)) {
    envContent = envContent.replace(regex, `${key}=${val}`)
  } else {
    envContent += `\n${key}=${val}`
  }
}

fs.writeFileSync(ENV_FILE, envContent)

console.log("\n╔══════════════════════════════════════════════════╗")
console.log("║  TrustBoxHedera AI — .env Updated                ║")
console.log("╚══════════════════════════════════════════════════╝")
console.log(`  Network:    ${deployed.network} (chainId: ${deployed.chainId})`)
console.log(`  Deployer:   ${deployed.deployer}`)
console.log(`  DeployedAt: ${deployed.deployedAt}\n`)

for (const [key, val] of Object.entries(mapping)) {
  console.log(`  ${key}=${val}`)
}

console.log("\n  HashScan links:")
const base = "https://hashscan.io/testnet/contract"
console.log(`  TrustRegistry:    ${base}/${deployed.TrustRegistry}`)
console.log(`  AuditRegistry:    ${base}/${deployed.AuditRegistry}`)
console.log(`  AgentMarketplace: ${base}/${deployed.AgentMarketplace}`)
console.log(`  IntentVault:      ${base}/${deployed.IntentVault}`)
console.log("\n✅ .env patched. Restart your backend.\n")
