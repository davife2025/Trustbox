/* deploy.js — pure Node.js, no TypeScript, no Hardhat
   Run: node scripts/deploy/deploy.js
*/

const { ethers } = require("ethers")
const fs   = require("fs")
const path = require("path")

require("dotenv").config({ path: path.resolve(__dirname, "../../../../.env") })

const RPC      = "https://testnet.hashio.io/api"
const CHAIN_ID = 296

const OVERRIDES = {
  gasPrice: BigInt("650000000000"),  // 650 Gwei
  gasLimit: BigInt("2000000"),
}

function artifact(name) {
  const p = path.join(__dirname, `../../artifacts/contracts/${name}.sol/${name}.json`)
  if (!fs.existsSync(p)) {
    throw new Error(`Artifact missing: ${p}\nRun first: npx hardhat compile`)
  }
  return JSON.parse(fs.readFileSync(p, "utf8"))
}

async function main() {
  const key = (process.env.DEPLOYER_PRIVATE_KEY ?? "").trim()
  if (!key || key.includes("...") || key.length < 66) {
    throw new Error("DEPLOYER_PRIVATE_KEY not set correctly in .env")
  }

  const provider = new ethers.JsonRpcProvider(RPC, { chainId: CHAIN_ID, name: "hedera-testnet" })
  const wallet   = new ethers.Wallet(key, provider)
  const balance  = await provider.getBalance(wallet.address)

  console.log("\n╔══════════════════════════════════════════════╗")
  console.log("║  TrustBoxHedera AI — Deploy (Node.js)       ║")
  console.log("╚══════════════════════════════════════════════╝")
  console.log(`  Deployer: ${wallet.address}`)
  console.log(`  Balance:  ${ethers.formatEther(balance)} HBAR\n`)

  if (balance < ethers.parseEther("5")) {
    throw new Error("Need 5+ HBAR — get free HBAR at https://faucet.hedera.com")
  }

  async function deploy(name) {
    console.log(`Deploying ${name}...`)
    const { abi, bytecode } = artifact(name)
    const factory  = new ethers.ContractFactory(abi, bytecode, wallet)
    const contract = await factory.deploy(OVERRIDES)
    console.log(`  tx:  ${contract.deploymentTransaction().hash}`)
    await contract.waitForDeployment()
    const addr = await contract.getAddress()
    console.log(`  ✅   ${addr}`)
    return addr
  }

  const TrustRegistry    = await deploy("TrustRegistry")
  const AuditRegistry    = await deploy("AuditRegistry")
  const AgentMarketplace = await deploy("AgentMarketplace")
  const IntentVault      = await deploy("IntentVault")

  const result = {
    network: "hederaTestnet", chainId: 296,
    deployedAt: new Date().toISOString(),
    deployer: wallet.address,
    TrustRegistry, AuditRegistry, AgentMarketplace, IntentVault,
  }

  const dir = path.join(__dirname, "../../deployments")
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, "hederaTestnet.json"), JSON.stringify(result, null, 2))

  console.log("\n── Add to .env ──────────────────────────────────")
  console.log(`TRUST_REGISTRY_ADDR=${TrustRegistry}`)
  console.log(`AUDIT_REGISTRY_ADDR=${AuditRegistry}`)
  console.log(`AGENT_MARKETPLACE_ADDR=${AgentMarketplace}`)
  console.log(`INTENT_VAULT_ADDR=${IntentVault}`)
  console.log("\n── HashScan ──────────────────────────────────────")
  const b = "https://hashscan.io/testnet/contract"
  console.log(`TrustRegistry:    ${b}/${TrustRegistry}`)
  console.log(`AuditRegistry:    ${b}/${AuditRegistry}`)
  console.log(`AgentMarketplace: ${b}/${AgentMarketplace}`)
  console.log(`IntentVault:      ${b}/${IntentVault}`)
  console.log("\n✅ Done.\n")
}

main().catch(e => { console.error("\n❌", e.message); process.exit(1) })