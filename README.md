# TrustBoxHedera AI

> Verifiable trust infrastructure for AI agents — built natively on Hedera.

[![Hedera](https://img.shields.io/badge/Hedera-Testnet-00A5E0?style=for-the-badge)](https://hashscan.io/testnet)
[![HCS](https://img.shields.io/badge/HCS-Consensus_Service-00e5c0?style=for-the-badge)](https://docs.hedera.com/hedera/sdks-and-apis/sdks/consensus-service)
[![Groq](https://img.shields.io/badge/Groq-Llama_3.1_70B-f55036?style=for-the-badge)](https://groq.com)
[![Phala](https://img.shields.io/badge/Phala-TEE_Network-8259EF?style=for-the-badge)](https://phala.network)

**Live app:** https://trustbox-omega.vercel.app  
**Backend:** https://trustbox-backend.onrender.com  
**HashScan:** https://hashscan.io/testnet

---

## What is TrustBoxHedera AI?

TrustBoxHedera AI is the second generation of TrustBox — rebuilt entirely on Hedera with no Chainlink dependency. Every workflow produces a Hedera Consensus Service (HCS) trail with an absolute consensus timestamp, and every state change is anchored on Hedera Smart Contract Service (HSCS).

The key difference from TrustBox v1: instead of Chainlink Functions for AI calls and Chainlink Automation for execution triggers, TrustBoxHedera uses Groq directly and a Mirror Node subscriber to detect and execute approved intents.

---

## Monorepo Structure

```
trustboxhedera-ai/
├── packages/
│   ├── shared/          # Shared types, Hedera config, ABI exports
│   ├── contracts/       # Solidity contracts — deploy to HSCS
│   ├── backend/         # Express API — Render
│   └── frontend/        # React 18 + Vite — Vercel
├── package.json         # npm workspaces root
├── render.yaml          # Render deploy config
├── vercel.json          # Vercel deploy config
└── .env.example         # All environment variables documented
```

---

## HSCS Contract Addresses (Hedera Testnet — chainId: 296)

| Contract | Address | HashScan |
|---|---|---|
| TrustRegistry | `0x...` | [view](https://hashscan.io/testnet/contract/0x...) |
| AuditRegistry | `0x...` | [view](https://hashscan.io/testnet/contract/0x...) |
| AgentMarketplace | `0x...` | [view](https://hashscan.io/testnet/contract/0x...) |
| IntentVault | `0x...` | [view](https://hashscan.io/testnet/contract/0x...) |

> Update these after running `npm run deploy:contracts`

---

## HCS Topic IDs

| Topic | Purpose | HashScan |
|---|---|---|
| `HCS_AUDIT_TOPIC_ID` | Smart contract audit trails | [view](https://hashscan.io/testnet/topic/0.0.XXX) |
| `HCS_INTENT_TOPIC_ID` | Intent lifecycle events | [view](https://hashscan.io/testnet/topic/0.0.XXX) |
| `HCS_AGENT_TOPIC_ID` | Agent registrations + scans | [view](https://hashscan.io/testnet/topic/0.0.XXX) |
| `HCS_BLINDAUDIT_TOPIC_ID` | TEE attestation hashes | [view](https://hashscan.io/testnet/topic/0.0.XXX) |

> Create topics by running `ts-node packages/contracts/scripts/createTopics.ts`

---

## The Five Workflows

### 1. Smart Contract Audit (HITL)
Human-in-the-loop audit. Groq Llama 3.1 70B analyses the contract and returns structured findings. The user reviews findings and signs the `reportHash` to approve. The signed report is anchored on `AuditRegistry.sol` and an HCS trail is written to `HCS_AUDIT_TOPIC_ID`.

**Files:** [`packages/backend/src/api/audit.ts`](packages/backend/src/api/audit.ts) · [`packages/backend/src/services/groq.ts`](packages/backend/src/services/groq.ts)

### 2. Verify AI Agent (ERC-8004)
Mints a soulbound ERC-8004 credential NFT on `TrustRegistry.sol`. The user reviews the agent metadata and signs the `metadataURI`. Token is non-transferable. HCS trail written to `HCS_AGENT_TOPIC_ID`.

**Files:** [`packages/backend/src/api/verify.ts`](packages/backend/src/api/verify.ts) · [`packages/contracts/contracts/TrustRegistry.sol`](packages/contracts/contracts/TrustRegistry.sol)

### 3. Execute Intent
Natural language → Groq parses to structured JSON spec → user reviews and signs `specHash` (not raw text) → submitted to `IntentVault.sol` on HSCS. The Mirror Node subscriber detects the approved intent and calls `executeIntent()`. Full lifecycle written to `HCS_INTENT_TOPIC_ID`.

**Files:** [`packages/backend/src/api/execute.ts`](packages/backend/src/api/execute.ts) · [`packages/backend/src/services/hedera.ts`](packages/backend/src/services/hedera.ts) (subscriber) · [`packages/contracts/contracts/IntentVault.sol`](packages/contracts/contracts/IntentVault.sol)

### 4. Security Agent Scan
Behavioural scan of an AI agent's TEE configuration. Agent is registered on `AgentMarketplace.sol` with an HBAR stake. Scan results and stake transaction anchored on HCS.

**Files:** [`packages/backend/src/api/scan.ts`](packages/backend/src/api/scan.ts) · [`packages/contracts/contracts/AgentMarketplace.sol`](packages/contracts/contracts/AgentMarketplace.sol)

### 5. Blind TEE Audit
Source code encrypted and dispatched to a Phala SGX enclave. Code never leaves the TEE. The findings hash and SGX attestation quote are pinned to IPFS and the attestation CID is anchored on `HCS_BLINDAUDIT_TOPIC_ID`.

**Files:** [`packages/backend/src/api/blindaudit.ts`](packages/backend/src/api/blindaudit.ts) · [`packages/backend/src/services/phala.ts`](packages/backend/src/services/phala.ts)

---

## Why Hedera Instead of Avalanche

| | TrustBox v1 (Avalanche) | TrustBoxHedera (Hedera) |
|---|---|---|
| Finality | Probabilistic (reorgs possible) | Absolute (aBFT consensus) |
| Fees | Variable gas (can spike) | Fixed USD-denominated |
| Audit trails | Snowtrace events | HCS — queryable via Mirror Node |
| AI execution | Chainlink Functions DON | Groq direct + HCS verifiability |
| Automation | Chainlink Automation | Mirror Node subscriber |
| History API | Custom DB | Mirror Node REST API |
| NFTs | ERC-721 on Fuji | Soulbound ERC-8004 on HSCS |

---

## Wallet Options

### Option A — MetaMask + Hashio RPC (fastest)
Add Hedera Testnet to MetaMask manually:

| Field | Value |
|---|---|
| Network name | Hedera Testnet |
| RPC URL | `https://testnet.hashio.io/api` |
| Chain ID | `296` |
| Symbol | `HBAR` |
| Explorer | `https://hashscan.io/testnet` |

Get test HBAR from https://portal.hedera.com

### Option B — HashPack + HashConnect (native Hedera)
Install HashPack from https://hashpack.app then click **Connect HashPack** on the landing page.

---

## Local Setup

### Prerequisites
- Node.js 18+
- npm 8+
- MetaMask or HashPack
- Hedera Testnet account (https://portal.hedera.com)

### Install

```bash
git clone https://github.com/YOUR_ORG/trustboxhedera-ai
cd trustboxhedera-ai
npm install
```

### Configure

```bash
cp .env.example .env
# Fill in:
# HEDERA_OPERATOR_ID, HEDERA_OPERATOR_KEY
# DEPLOYER_PRIVATE_KEY
# JWT_SECRET
# GROQ_API_KEY (optional — fallback analyser works without it)
# PINATA_JWT (optional — stub CIDs used without it)
```

### Deploy contracts + create HCS topics

```bash
# Compile contracts
npm run build:contracts

# Create HCS topics (run once)
ts-node packages/contracts/scripts/createTopics.ts
# → Copy topic IDs to .env

# Deploy to Hedera Testnet
npm run deploy:contracts
# → Copy contract addresses to .env

# Export ABIs to shared package
npm run export:abis --workspace=packages/contracts
```

### Start development

```bash
# Terminal 1 — backend
npm run dev:backend

# Terminal 2 — frontend
npm run dev:frontend
# Opens http://localhost:5173
```

---

## Environment Variables

See [`.env.example`](.env.example) for the full list. Key vars:

```env
HEDERA_OPERATOR_ID=0.0.XXXXXX
HEDERA_OPERATOR_KEY=302e...
DEPLOYER_PRIVATE_KEY=0x...
TRUST_REGISTRY_ADDR=0x...
AUDIT_REGISTRY_ADDR=0x...
AGENT_MARKETPLACE_ADDR=0x...
INTENT_VAULT_ADDR=0x...
HCS_AUDIT_TOPIC_ID=0.0.XXXXXX
HCS_INTENT_TOPIC_ID=0.0.XXXXXX
HCS_AGENT_TOPIC_ID=0.0.XXXXXX
HCS_BLINDAUDIT_TOPIC_ID=0.0.XXXXXX
GROQ_API_KEY=gsk_...
PINATA_JWT=eyJ...
```

---

## Deploy

### Backend → Render
```bash
# Push to GitHub, then:
# 1. New Web Service on render.com
# 2. Connect repo
# 3. render.yaml is picked up automatically
# 4. Add sensitive env vars in Render dashboard
```

### Frontend → Vercel
```bash
# Push to GitHub, then:
# 1. Import project on vercel.com
# 2. vercel.json is picked up automatically
# 3. Add VITE_BACKEND_URL + contract addresses in Vercel env vars
```

---

## Architecture

```
User (MetaMask / HashPack)
        │
        ▼
React Frontend (Vercel)
        │  REST API
        ▼
Express Backend (Render)
   ├── services/groq.ts      → Groq Llama 3.1 70B (AI)
   ├── services/hedera.ts    → HCS submit + Mirror Node subscriber
   ├── services/ethers.ts    → HSCS contract calls via Hashio RPC
   ├── services/ipfs.ts      → Pinata IPFS
   └── services/phala.ts     → Phala TEE dispatch
        │
        ├── Hedera HSCS ─────────────────── TrustRegistry
        │   (chainId: 296)                  AuditRegistry
        │                                   AgentMarketplace
        │                                   IntentVault
        │
        ├── Hedera HCS ──────────────────── Audit trails
        │   (Mirror Node subscriber)        Intent lifecycle
        │                                   Agent events
        │                                   TEE attestations
        │
        └── IPFS (Pinata) ───────────────── Reports, metadata, receipts
```

---

*TrustBoxHedera AI — Making AI agents trustworthy on Hedera.*  
*Built on HSCS | Secured by HCS | Powered by Groq | Attested by Phala*
