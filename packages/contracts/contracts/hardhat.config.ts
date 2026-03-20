import { HardhatUserConfig } from "hardhat/config"
import "@nomicfoundation/hardhat-toolbox"
import * as dotenv from "dotenv"
import * as path from "path"

// Load .env from monorepo root
dotenv.config({ path: path.resolve(__dirname, "../../.env") })

const DEPLOYER_KEY  = process.env.DEPLOYER_PRIVATE_KEY  ?? "0x0000000000000000000000000000000000000000000000000000000000000001"

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: false,
    },
  },

  networks: {
    // ── Hedera Testnet (HSCS) ───────────────────────────────────
    hederaTestnet: {
      url:     "https://testnet.hashio.io/api",
      chainId: 296,
      accounts: [DEPLOYER_KEY],
    },

    // ── Hedera Mainnet (HSCS) ───────────────────────────────────
    hederaMainnet: {
      url:     "https://mainnet.hashio.io/api",
      chainId: 295,
      accounts: [DEPLOYER_KEY],
    },

    // ── Local Hardhat node ──────────────────────────────────────
    localhost: {
      url:     "http://127.0.0.1:8545",
      chainId: 31337,
    },

    // ── Hardhat in-process (default) ────────────────────────────
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
