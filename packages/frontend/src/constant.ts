/* constant.ts — TrustBoxHedera AI Frontend
   Single source of truth. Imports from @trustboxhedera/shared.
   No Chainlink. No Avalanche. Hedera-only.
   ─────────────────────────────────────────────────────────── */

// ── API URL ───────────────────────────────────────────────────────────────────

export const API_URL =
  typeof window !== "undefined" && window.location.hostname !== "localhost"
    ? (import.meta.env.VITE_BACKEND_URL ?? "https://trustboxhedera-backend.onrender.com")
    : "http://localhost:4000"

// ── Hedera chain config (MetaMask Option A) ───────────────────────────────────

export const HEDERA_TESTNET_PARAMS = {
  chainId:           "0x128",           // 296
  chainName:         "Hedera Testnet",
  nativeCurrency:    { name: "HBAR", symbol: "HBAR", decimals: 18 },
  rpcUrls:           ["https://testnet.hashio.io/api"],
  blockExplorerUrls: ["https://hashscan.io/testnet"],
}

export const HEDERA_MAINNET_PARAMS = {
  chainId:           "0x127",           // 295
  chainName:         "Hedera Mainnet",
  nativeCurrency:    { name: "HBAR", symbol: "HBAR", decimals: 18 },
  rpcUrls:           ["https://mainnet.hashio.io/api"],
  blockExplorerUrls: ["https://hashscan.io/mainnet"],
}

export const HEDERA_CHAIN_ID  = 296
export const HEDERA_CHAIN_HEX = "0x128"

// ── Explorers ─────────────────────────────────────────────────────────────────

export const HASHSCAN   = "https://hashscan.io/testnet"
export const MIRROR_API = "https://testnet.mirrornode.hedera.com/api/v1"

export function hashscanTx(hash: string)      { return `${HASHSCAN}/transaction/${hash}` }
export function hashscanTopic(topicId: string) { return `${HASHSCAN}/topic/${topicId}` }
export function hashscanToken(tokenId: string) { return `${HASHSCAN}/token/${tokenId}` }
export function hashscanContract(addr: string) { return `${HASHSCAN}/contract/${addr}` }

// ── Contract addresses (set after deploy) ────────────────────────────────────

export const CONTRACTS = {
  TRUST_REGISTRY:    import.meta.env.VITE_TRUST_REGISTRY_ADDR    ?? "",
  AUDIT_REGISTRY:    import.meta.env.VITE_AUDIT_REGISTRY_ADDR    ?? "",
  AGENT_MARKETPLACE: import.meta.env.VITE_AGENT_MARKETPLACE_ADDR ?? "",
  INTENT_VAULT:      import.meta.env.VITE_INTENT_VAULT_ADDR      ?? "",
}

// ── Workflow entity types ─────────────────────────────────────────────────────

export interface EntityType {
  id:          string
  label:       string
  icon:        string
  action:      "audit" | "verify" | "execute" | "scan" | "blindaudit"
  desc:        string
  badge:       string
  badgeColor:  string
  chains:      Array<{ icon: string; label: string; color: string }>
  fields:      Array<{ key: string; label: string; placeholder: string; type?: string; required?: boolean }>
  isHITL:      boolean
}

export const ENTITY_TYPES: EntityType[] = [
  {
    id: "audit", label: "Smart Contract", icon: "📋",
    action: "audit", badge: "HITL Audit", badgeColor: "#00A5E0",
    desc: "AI-powered contract audit with human-in-the-loop approval. Findings anchored on Hedera via HCS.",
    chains: [
      { icon: "ℏ", label: "Hedera HSCS", color: "#00A5E0" },
      { icon: "⬡", label: "HCS Trail",   color: "#00e5c0" },
    ],
    fields: [
      { key: "contractAddress", label: "Contract Address", placeholder: "0x...", required: true },
      { key: "contractName",    label: "Contract Name",    placeholder: "MyContract" },
      { key: "chain",           label: "Deployed Chain",   placeholder: "hedera-testnet" },
      { key: "deployer",        label: "Deployer Address", placeholder: "0x..." },
    ],
    isHITL: true,
  },
  {
    id: "verify", label: "AI Agent", icon: "🤖",
    action: "verify", badge: "ERC-8004 NFT", badgeColor: "#8259EF",
    desc: "Mint a verifiable ERC-8004 credential NFT on Hedera. Soulbound — tied to the agent's model hash.",
    chains: [
      { icon: "ℏ", label: "Hedera HSCS", color: "#00A5E0" },
      { icon: "⬡", label: "HCS Trail",   color: "#00e5c0" },
    ],
    fields: [
      { key: "agentName",    label: "Agent Name",    placeholder: "SecureAudit Pro",  required: true },
      { key: "model",        label: "AI Model",      placeholder: "llama-3.1-70b",    required: true },
      { key: "capabilities", label: "Capabilities",  placeholder: "Audit, ZK Proof, Risk Analysis" },
      { key: "operator",     label: "Operator",      placeholder: "Organisation name" },
      { key: "environment",  label: "Environment",   placeholder: "cloud / tee / local" },
    ],
    isHITL: true,
  },
  {
    id: "execute", label: "Intent Command", icon: "⚡",
    action: "execute", badge: "Groq + HSCS", badgeColor: "#00e5c0",
    desc: "Natural language → cryptographically signed intent → on-chain execution. Groq parses, you sign specHash.",
    chains: [
      { icon: "ℏ", label: "Hedera HSCS", color: "#00A5E0" },
      { icon: "🧠", label: "Groq AI",    color: "#f55036" },
      { icon: "⬡", label: "HCS Trail",  color: "#00e5c0" },
    ],
    fields: [
      { key: "nlText",       label: "Your Intent",   placeholder: "Book a hotel in Lagos for 3 nights, budget $200/night", required: true, type: "textarea" },
      { key: "category",     label: "Category",      placeholder: "travel / defi / compute / data" },
      { key: "hederaAccount",label: "Hedera Account",placeholder: "0.0.XXXXXX" },
    ],
    isHITL: true,
  },
  {
    id: "scan", label: "Security Agent", icon: "🛡️",
    action: "scan", badge: "HBAR Stake", badgeColor: "#ffb347",
    desc: "Register a security agent on AgentMarketplace with HBAR stake. Behavioural scan anchored on HCS.",
    chains: [
      { icon: "ℏ", label: "Hedera HSCS",    color: "#00A5E0" },
      { icon: "🔒", label: "Phala TEE",     color: "#8259EF" },
      { icon: "⬡", label: "HCS Trail",     color: "#00e5c0" },
    ],
    fields: [
      { key: "agentId",     label: "Agent ID",       placeholder: "agt_demo_001",                           required: true },
      { key: "agentName",   label: "Agent Name",     placeholder: "TrustGuard Scanner",                    required: true },
      { key: "teeEndpoint", label: "TEE Endpoint",   placeholder: "https://your-agent.phala.network/api",  required: true, type: "url" },
      { key: "stakeAmount", label: "Stake (HBAR)",   placeholder: "0.1" },
    ],
    isHITL: false,
  },
  {
    id: "blindaudit", label: "Code Bundle", icon: "🔐",
    action: "blindaudit", badge: "Blind TEE", badgeColor: "#ff4d6a",
    desc: "Source code audited inside a Phala SGX enclave. Code never leaves TEE. Attestation hash on HCS.",
    chains: [
      { icon: "🔒", label: "Phala TEE",     color: "#8259EF" },
      { icon: "ℏ", label: "Hedera HSCS",    color: "#00A5E0" },
      { icon: "⬡", label: "HCS Trail",     color: "#00e5c0" },
    ],
    fields: [
      { key: "contractAddr", label: "Contract Address", placeholder: "0x...",            required: true },
      { key: "agentId",      label: "TEE Agent ID",     placeholder: "agt_tee_001",      required: true },
      { key: "projectName",  label: "Project Name",     placeholder: "TrustBox Protocol" },
      { key: "auditScope",   label: "Audit Scope",      placeholder: "static-analysis, reentrancy, access-control" },
    ],
    isHITL: false,
  },
]

// ── Action metadata ───────────────────────────────────────────────────────────

export const ACTION_META: Record<string, { color: string; label: string }> = {
  audit:      { color: "#00A5E0", label: "Audit"       },
  verify:     { color: "#8259EF", label: "Verify"      },
  execute:    { color: "#00e5c0", label: "Execute"      },
  scan:       { color: "#ffb347", label: "Scan"         },
  blindaudit: { color: "#ff4d6a", label: "Blind Audit"  },
}
