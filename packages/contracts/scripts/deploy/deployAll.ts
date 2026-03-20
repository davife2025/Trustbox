/* scripts/deploy/deployAll.ts
   Deploys all 4 TrustBoxHedera contracts to Hedera Smart Contract Service.
   Run: npx hardhat run scripts/deploy/deployAll.ts --network hederaTestnet
   ─────────────────────────────────────────────────────────────────────── */

import { ethers, network } from "hardhat"
import * as fs from "fs"
import * as path from "path"

interface DeployedAddresses {
  network:          string
  chainId:          number
  deployedAt:       string
  deployer:         string
  TrustRegistry:    string
  AuditRegistry:    string
  AgentMarketplace: string
  IntentVault:      string
}

async function main() {
  const [deployer] = await ethers.getSigners()
  const chainId    = (await ethers.provider.getNetwork()).chainId

  console.log("\n╔══════════════════════════════════════════════════╗")
  console.log("║  TrustBoxHedera AI — Contract Deploy             ║")
  console.log("╚══════════════════════════════════════════════════╝")
  console.log(`  Network:  ${network.name} (chainId: ${chainId})`)
  console.log(`  Deployer: ${deployer.address}`)

  const balance = await ethers.provider.getBalance(deployer.address)
  console.log(`  Balance:  ${ethers.formatEther(balance)} HBAR\n`)

  if (balance === 0n) {
    throw new Error("Deployer has zero balance — fund via https://portal.hedera.com")
  }

  // ── 1. TrustRegistry ──────────────────────────────────────────────────────
  console.log("Deploying TrustRegistry...")
  const TrustRegistry = await ethers.getContractFactory("TrustRegistry")
  const trustRegistry = await TrustRegistry.deploy()
  await trustRegistry.waitForDeployment()
  const trustRegistryAddr = await trustRegistry.getAddress()
  console.log(`  ✅ TrustRegistry:    ${trustRegistryAddr}`)

  // ── 2. AuditRegistry ──────────────────────────────────────────────────────
  console.log("Deploying AuditRegistry...")
  const AuditRegistry = await ethers.getContractFactory("AuditRegistry")
  const auditRegistry = await AuditRegistry.deploy()
  await auditRegistry.waitForDeployment()
  const auditRegistryAddr = await auditRegistry.getAddress()
  console.log(`  ✅ AuditRegistry:    ${auditRegistryAddr}`)

  // ── 3. AgentMarketplace ───────────────────────────────────────────────────
  console.log("Deploying AgentMarketplace...")
  const AgentMarketplace = await ethers.getContractFactory("AgentMarketplace")
  const agentMarketplace = await AgentMarketplace.deploy()
  await agentMarketplace.waitForDeployment()
  const agentMarketplaceAddr = await agentMarketplace.getAddress()
  console.log(`  ✅ AgentMarketplace: ${agentMarketplaceAddr}`)

  // ── 4. IntentVault ────────────────────────────────────────────────────────
  console.log("Deploying IntentVault...")
  const IntentVault = await ethers.getContractFactory("IntentVault")
  const intentVault = await IntentVault.deploy()
  await intentVault.waitForDeployment()
  const intentVaultAddr = await intentVault.getAddress()
  console.log(`  ✅ IntentVault:      ${intentVaultAddr}`)

  // ── Save addresses ────────────────────────────────────────────────────────
  const deployed: DeployedAddresses = {
    network:          network.name,
    chainId:          Number(chainId),
    deployedAt:       new Date().toISOString(),
    deployer:         deployer.address,
    TrustRegistry:    trustRegistryAddr,
    AuditRegistry:    auditRegistryAddr,
    AgentMarketplace: agentMarketplaceAddr,
    IntentVault:      intentVaultAddr,
  }

  const outDir  = path.join(__dirname, "../../deployments")
  const outFile = path.join(outDir, `${network.name}.json`)
  fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(outFile, JSON.stringify(deployed, null, 2))
  console.log(`\n  📄 Addresses saved → ${outFile}`)

  // ── Print .env block ──────────────────────────────────────────────────────
  console.log("\n  ── Add to .env ──────────────────────────────────────")
  console.log(`  TRUST_REGISTRY_ADDR=${trustRegistryAddr}`)
  console.log(`  AUDIT_REGISTRY_ADDR=${auditRegistryAddr}`)
  console.log(`  AGENT_MARKETPLACE_ADDR=${agentMarketplaceAddr}`)
  console.log(`  INTENT_VAULT_ADDR=${intentVaultAddr}`)

  // ── Print HashScan links ──────────────────────────────────────────────────
  const explorer = chainId === 296n
    ? "https://hashscan.io/testnet/contract"
    : "https://hashscan.io/mainnet/contract"
  console.log("\n  ── HashScan ─────────────────────────────────────────")
  console.log(`  TrustRegistry:    ${explorer}/${trustRegistryAddr}`)
  console.log(`  AuditRegistry:    ${explorer}/${auditRegistryAddr}`)
  console.log(`  AgentMarketplace: ${explorer}/${agentMarketplaceAddr}`)
  console.log(`  IntentVault:      ${explorer}/${intentVaultAddr}`)
  console.log("\n✅ All contracts deployed.\n")
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
