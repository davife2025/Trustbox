import { HardhatUserConfig } from "hardhat/config"
import "@nomicfoundation/hardhat-toolbox"
import * as dotenv from "dotenv"
import * as path   from "path"

// Load .env from monorepo root
dotenv.config({ path: path.resolve(__dirname, "../../.env") })

// ── Validate deployer key ─────────────────────────────────────────────────────
// A valid EVM private key is exactly 32 bytes = 64 hex chars (optional 0x prefix).
// If missing or malformed, fall back to Hardhat's public default so compile/test work.
// Deploy will still fail with the dummy key (no funds) — which is intentional.

const RAW_KEY = (process.env.DEPLOYER_PRIVATE_KEY ?? "").trim()

function isValidKey(key: string): boolean {
  const hex = key.startsWith("0x") ? key.slice(2) : key
  return /^[0-9a-fA-F]{64}$/.test(hex)
}

// Hardhat's well-known default account #0 — public, safe to ship
const FALLBACK = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"

const DEPLOYER_KEY = isValidKey(RAW_KEY)
  ? (RAW_KEY.startsWith("0x") ? RAW_KEY : `0x${RAW_KEY}`)
  : FALLBACK

if (RAW_KEY && !isValidKey(RAW_KEY)) {
  console.warn(
    "\n⚠  DEPLOYER_PRIVATE_KEY is set but invalid (must be 64 hex chars)." +
    "\n   npx hardhat compile and npx hardhat test will work." +
    "\n   Set a valid key to deploy to Hedera Testnet.\n"
  )
}

// ── Hardhat config ────────────────────────────────────────────────────────────

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: false,
    },
  },

  networks: {
    hederaTestnet: {
      url:     "https://testnet.hashio.io/api",
      chainId: 296,
      accounts: [DEPLOYER_KEY],
    },
    hederaMainnet: {
      url:     "https://mainnet.hashio.io/api",
      chainId: 295,
      accounts: [DEPLOYER_KEY],
    },
    localhost: {
      url:     "http://127.0.0.1:8545",
      chainId: 31337,
    },
    hardhat: {
      chainId: 31337,
    },
  },

  paths: {
    sources:   "./contracts",
    tests:     "./test",
    cache:     "./cache",
    artifacts: "./artifacts",
  },

  typechain: {
    outDir: "./typechain-types",
    target: "ethers-v6",
  },
}

export default config
