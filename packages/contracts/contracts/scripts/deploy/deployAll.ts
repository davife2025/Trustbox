/* scripts/deploy/deployAll.ts
   Deploys all 4 contracts to Hedera HSCS using raw ethers.js.
   Bypasses hardhat-ethers gas estimation (which fails on Hedera).
   Run: npx hardhat run scripts/deploy/deployAll.ts --network hederaTestnet
*/

import { ethers, network } from "hardhat"
import { JsonRpcProvider, Wallet, ContractFactory } from "ethers"
import * as fs   from "fs"
import * as path from "path"
import * as dotenv from "dotenv"

dotenv.config({ path: path.resolve(__dirname, "../../../../.env") })

// ── Hedera-specific tx overrides ─────────────────────────────────────────────
// Hedera HSCS needs explicit gasPrice — must NOT use estimateGas.
// 750 Gwei is well above testnet minimum and avoids INSUFFICIENT_TX_FEE.
const OVERRIDES = {
  gasPrice: ethers.parseUnits("750", "gwei"),
  gasLimit: 1_500_000n,
}

async function deployContract(
  wallet:    Wallet,
  name:      string,
  artifacts: any
): Promise<string> {
  console.log(`\nDeploying ${name}...`)

  const factory = new ContractFactory(
    artifacts.abi,
    artifacts.bytecode,
    wallet
  )

  const contract = await factory.deploy(OVERRIDES)
  console.log(`  tx: ${contract.deploymentTransaction()?.hash}`)
  console.log(`  waiting for confirmation...`)
  await contract.waitForDeployment()
  const address = await contract.getAddress()
  console.log(`  ✅ ${name}: ${address}`)
  return address
}

async function main() {
  // ── Use raw ethers provider + wallet (bypasses hardhat gas estimation) ────
  const RPC_URL    = "https://testnet.hashio.io/api"
  const PRIV_KEY   = process.env.DEPLOYER_PRIVATE_KEY ?? ""

  if (!PRIV_KEY || PRIV_KEY === "0x..." || PRIV_KEY.length < 64) {
    throw new Error("DEPLOYER_PRIVATE_KEY not set correctly in .env")
  }

  const provider = new JsonRpcProvider(RPC_URL, {
    chainId: 296,
    name:    "hedera-testnet",
  })
  const wallet  = new Wallet(PRIV_KEY, provider)
  const balance = await provider.getBalance(wallet.address)

  console.log("\n╔══════════════════════════════════════════════════╗")
  console.log("║  TrustBoxHedera AI — Contract Deploy             ║")
  console.log("╚══════════════════════════════════════════════════╝")
  console.log(`  Network:  hederaTestnet (chainId: 296)`)
  console.log(`  Deployer: ${wallet.address}`)
  console.log(`  Balance:  ${ethers.formatEther(balance)} HBAR`)

  if (balance < ethers.parseEther("5")) {
    throw new Error(`Balance too low. Need 5+ HBAR. Get free HBAR at https://faucet.hedera.com`)
  }

  // ── Load compiled artifacts ───────────────────────────────────────────────
  const artifactsDir = path.join(__dirname, "../../artifacts/contracts")

  function loadArtifact(contractName: string) {
    const p = path.join(artifactsDir, `${contractName}.sol`, `${contractName}.json`)
    if (!fs.existsSync(p)) {
      throw new Error(`Artifact not found: ${p}\nRun: npx hardhat compile`)
    }
    return JSON.parse(fs.readFileSync(p, "utf8"))
  }

  const TrustRegistryArtifact    = loadArtifact("TrustRegistry")
  const AuditRegistryArtifact    = loadArtifact("AuditRegistry")
  const AgentMarketplaceArtifact = loadArtifact("AgentMarketplace")
  const IntentVaultArtifact      = loadArtifact("IntentVault")

  // ── Deploy ────────────────────────────────────────────────────────────────
  const trustRegistryAddr    = await deployContract(wallet, "TrustRegistry",    TrustRegistryArtifact)
  const auditRegistryAddr    = await deployContract(wallet, "AuditRegistry",    AuditRegistryArtifact)
  const agentMarketplaceAddr = await deployContract(wallet, "AgentMarketplace", AgentMarketplaceArtifact)
  const intentVaultAddr      = await deployContract(wallet, "IntentVault",      IntentVaultArtifact)

  // ── Save addresses ────────────────────────────────────────────────────────
  const deployed = {
    network:          "hederaTestnet",
    chainId:          296,
    deployedAt:       new Date().toISOString(),
    deployer:         wallet.address,
    TrustRegistry:    trustRegistryAddr,
    AuditRegistry:    auditRegistryAddr,
    AgentMarketplace: agentMarketplaceAddr,
    IntentVault:      intentVaultAddr,
  }

  const outDir  = path.join(__dirname, "../../deployments")
  const outFile = path.join(outDir, "hederaTestnet.json")
  fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(outFile, JSON.stringify(deployed, null, 2))
  console.log(`\n  📄 Addresses saved → ${outFile}`)

  // ── Print .env block ──────────────────────────────────────────────────────
  console.log("\n  ── Add to .env ──────────────────────────────────────")
  console.log(`  TRUST_REGISTRY_ADDR=${trustRegistryAddr}`)
  console.log(`  AUDIT_REGISTRY_ADDR=${auditRegistryAddr}`)
  console.log(`  AGENT_MARKETPLACE_ADDR=${agentMarketplaceAddr}`)
  console.log(`  INTENT_VAULT_ADDR=${intentVaultAddr}`)

  console.log("\n  ── HashScan ─────────────────────────────────────────")
  const base = "https://hashscan.io/testnet/contract"
  console.log(`  TrustRegistry:    ${base}/${trustRegistryAddr}`)
  console.log(`  AuditRegistry:    ${base}/${auditRegistryAddr}`)
  console.log(`  AgentMarketplace: ${base}/${agentMarketplaceAddr}`)
  console.log(`  IntentVault:      ${base}/${intentVaultAddr}`)
  console.log("\n✅ All contracts deployed.\n")
}

main().catch(err => {
  console.error("\n❌", err.message)
  process.exit(1)
})
