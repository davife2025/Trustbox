/* packages/shared/src/config/hedera.ts
   Single source of truth for all Hedera network config.
   Imported by both backend and frontend.
   ─────────────────────────────────────────────────── */

import type { HederaConfig, HCSTopics, ScoreBand, ScoreBandNum } from "../types"

// ── Network ──────────────────────────────────────────────────────────────────

export const HEDERA_TESTNET: HederaConfig = {
  network:    "testnet",
  operatorId: "",                                           // from env
  operatorKey:"",                                           // from env
  rpcUrl:     "https://testnet.hashio.io/api",
  chainId:    296,
  mirrorNode: "https://testnet.mirrornode.hedera.com",
  explorer:   "https://hashscan.io/testnet",
  hashscan:   "https://hashscan.io/testnet",
}

export const HEDERA_MAINNET: HederaConfig = {
  network:    "mainnet",
  operatorId: "",
  operatorKey:"",
  rpcUrl:     "https://mainnet.hashio.io/api",
  chainId:    295,
  mirrorNode: "https://mainnet.mirrornode.hedera.com",
  explorer:   "https://hashscan.io/mainnet",
  hashscan:   "https://hashscan.io/mainnet",
}

// ── MetaMask chain params ─────────────────────────────────────────────────────

export const HEDERA_TESTNET_METAMASK = {
  chainId:           "0x128",            // 296 in hex
  chainName:         "Hedera Testnet",
  nativeCurrency:    { name: "HBAR", symbol: "HBAR", decimals: 18 },
  rpcUrls:           ["https://testnet.hashio.io/api"],
  blockExplorerUrls: ["https://hashscan.io/testnet"],
}

export const HEDERA_MAINNET_METAMASK = {
  chainId:           "0x127",            // 295 in hex
  chainName:         "Hedera Mainnet",
  nativeCurrency:    { name: "HBAR", symbol: "HBAR", decimals: 18 },
  rpcUrls:           ["https://mainnet.hashio.io/api"],
  blockExplorerUrls: ["https://hashscan.io/mainnet"],
}

// ── HCS Topics (filled after scripts/createTopics.ts) ────────────────────────
// These are placeholder defaults — override with env vars

export const HCS_TOPICS: HCSTopics = {
  credit:     process.env.HCS_CREDIT_TOPIC_ID     ?? "0.0.0",
  audit:      process.env.HCS_AUDIT_TOPIC_ID      ?? "0.0.0",
  intent:     process.env.HCS_INTENT_TOPIC_ID     ?? "0.0.0",
  agent:      process.env.HCS_AGENT_TOPIC_ID      ?? "0.0.0",
  blindAudit: process.env.HCS_BLINDAUDIT_TOPIC_ID ?? "0.0.0",
}

// ── HSCS Contract Addresses (filled after deploy) ────────────────────────────

export const CONTRACTS = {
  TRUST_REGISTRY:    process.env.TRUST_REGISTRY_ADDR     ?? "",
  AUDIT_REGISTRY:    process.env.AUDIT_REGISTRY_ADDR     ?? "",
  AGENT_MARKETPLACE: process.env.AGENT_MARKETPLACE_ADDR  ?? "",
  INTENT_VAULT:      process.env.INTENT_VAULT_ADDR        ?? "",
} as const

// ── Pyth Price Feeds ──────────────────────────────────────────────────────────
// https://pyth.network/developers/price-feed-ids

export const PYTH = {
  contractAddress: process.env.PYTH_CONTRACT_ADDRESS ?? "",
  feedIds: {
    hbarUsd: process.env.PYTH_HBAR_USD_FEED ?? "0x3728e591097635310e6341af53db8b7ee42da9b3a8d918f9463ce9cca886dfbd",
    ethUsd:  process.env.PYTH_ETH_USD_FEED  ?? "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
    btcUsd:  process.env.PYTH_BTC_USD_FEED  ?? "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
  },
  staleAfterSeconds: 60,
}

// ── Score Bands ───────────────────────────────────────────────────────────────

export const SCORE_BANDS: Record<ScoreBandNum, ScoreBand> = {
  1: { label: "Poor",      range: "300–579", color: "#ff4d6a", bg: "rgba(255,77,106,.07)"  },
  2: { label: "Fair",      range: "580–669", color: "#ffb347", bg: "rgba(255,179,71,.07)"  },
  3: { label: "Good",      range: "670–739", color: "#52b6ff", bg: "rgba(82,182,255,.07)"  },
  4: { label: "Excellent", range: "740–850", color: "#00e5c0", bg: "rgba(0,229,192,.07)"   },
}

export function scoreBandLabel(band: number): string {
  return SCORE_BANDS[band as ScoreBandNum]?.label ?? "Unknown"
}

// ── Explorer helpers ──────────────────────────────────────────────────────────

export function hashscanTx(txHash: string, network: "testnet" | "mainnet" = "testnet"): string {
  return `https://hashscan.io/${network}/transaction/${txHash}`
}

export function hashscanTopic(topicId: string, network: "testnet" | "mainnet" = "testnet"): string {
  return `https://hashscan.io/${network}/topic/${topicId}`
}

export function hashscanToken(tokenId: string, network: "testnet" | "mainnet" = "testnet"): string {
  return `https://hashscan.io/${network}/token/${tokenId}`
}

export function hashscanContract(address: string, network: "testnet" | "mainnet" = "testnet"): string {
  return `https://hashscan.io/${network}/contract/${address}`
}

// ── Mirror Node helpers ───────────────────────────────────────────────────────

export const MIRROR_NODE = {
  testnet: "https://testnet.mirrornode.hedera.com/api/v1",
  mainnet: "https://mainnet.mirrornode.hedera.com/api/v1",
}

export function mirrorNodeUrl(network: "testnet" | "mainnet" = "testnet"): string {
  return MIRROR_NODE[network]
}
