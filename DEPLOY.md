# TrustBoxHedera AI — Deploy Guide

Run these commands from the **monorepo root** (`trustboxhedera-ai/`) unless stated otherwise.

---

## Prerequisites

1. Node.js 18+ installed
2. A Hedera Testnet account — create free at https://portal.hedera.com
3. Your account needs test HBAR — portal gives you some on creation
4. MetaMask or HashPack installed in browser

---

## Step 1 — Install dependencies

```bash
npm install
```

---

## Step 2 — Configure .env

```bash
cp .env.example .env
```

Open `.env` and fill in these fields (minimum required to proceed):

```env
HEDERA_OPERATOR_ID=0.0.YOUR_ACCOUNT_ID
HEDERA_OPERATOR_KEY=302e...YOUR_PRIVATE_KEY
HEDERA_NETWORK=testnet

DEPLOYER_PRIVATE_KEY=0x...YOUR_EVM_PRIVATE_KEY

JWT_SECRET=any_long_random_string_32_chars_minimum
```

**How to get your keys from Hedera Portal:**
1. Go to https://portal.hedera.com
2. Create account → copy Account ID (format: `0.0.XXXXXX`)
3. Copy DER-encoded private key (starts with `302e...`)
4. For `DEPLOYER_PRIVATE_KEY`: export the same key in EVM hex format from the portal (starts with `0x`)

---

## Step 3 — Create HCS Topics

```bash
cd packages/contracts
npx ts-node scripts/createTopics.ts
```

Expected output:
```
✅ HCS_AUDIT_TOPIC_ID=0.0.XXXXXX
✅ HCS_INTENT_TOPIC_ID=0.0.XXXXXX
✅ HCS_AGENT_TOPIC_ID=0.0.XXXXXX
✅ HCS_BLINDAUDIT_TOPIC_ID=0.0.XXXXXX
✅ .env updated automatically
```

Your `.env` is updated automatically. Verify at https://hashscan.io/testnet/topic/0.0.XXXXXX

---

## Step 4 — Compile contracts

```bash
# Still in packages/contracts/
npx hardhat compile
```

Expected: `Compiled 8 Solidity files successfully`

---

## Step 5 — Deploy contracts to Hedera Testnet

```bash
npx hardhat run scripts/deploy/deployAll.ts --network hederaTestnet
```

Expected output:
```
✅ TrustRegistry:    0x...
✅ AuditRegistry:    0x...
✅ AgentMarketplace: 0x...
✅ IntentVault:      0x...
📄 Addresses saved → deployments/hederaTestnet.json
```

---

## Step 6 — Update .env with contract addresses

```bash
npx ts-node scripts/updateEnv.ts
```

This reads `deployments/hederaTestnet.json` and patches your `.env` automatically.

---

## Step 7 — Export ABIs to shared package

```bash
npx ts-node scripts/exportAbis.ts
```

This copies the compiled ABIs into `packages/shared/src/abis/` so both backend and frontend can import them.

---

## Step 8 — Build shared package

```bash
cd ../../   # back to monorepo root
npm run build:shared
```

---

## Step 9 — Start backend

```bash
npm run dev:backend
```

Expected:
```
TrustBoxHedera AI — Backend
Port:    4000
Network: Hedera testnet
RPC:     https://testnet.hashio.io/api
[hedera] Intent subscriber started — polling topic 0.0.XXXXXX every 5000ms
```

Test health:
```bash
curl http://localhost:4000/health
```

---

## Step 10 — Start frontend

```bash
npm run dev:frontend
# Opens http://localhost:5173
```

---

## Step 11 — Add Hedera Testnet to MetaMask

| Field | Value |
|---|---|
| Network name | Hedera Testnet |
| RPC URL | `https://testnet.hashio.io/api` |
| Chain ID | `296` |
| Symbol | `HBAR` |
| Explorer | `https://hashscan.io/testnet` |

---

## Verify Everything Works

Open http://localhost:5173 and:

1. Connect MetaMask → switch to Hedera Testnet
2. Sign in
3. Run **Smart Contract Audit** → enter any contract address → approve findings → check HashScan
4. Run **Verify AI Agent** → mint ERC-8004 → check HashScan
5. Run **Execute Intent** → type natural language → review spec → sign → check HCS trail
6. Run **Security Agent Scan** → register with HBAR stake → check HashScan
7. Run **Blind TEE Audit** → check attestation on HCS

Each workflow should show a HashScan transaction link and an HCS topic trail link.

---

## Common Errors

**"INSUFFICIENT_PAYER_BALANCE"**
→ Your Hedera account needs more HBAR. Top up at https://portal.hedera.com

**"INVALID_SIGNATURE"**
→ Your `HEDERA_OPERATOR_KEY` format is wrong. Use the DER-encoded key from portal (starts with `302e`), not the hex format.

**"Cannot find module '../../../.env'"**
→ Make sure you have a `.env` file at the monorepo root. Copy from `.env.example`.

**"ABI not found for TrustRegistry"**
→ Run `npx hardhat compile` then `npx ts-node scripts/exportAbis.ts` again.

**Contract calls returning 500**
→ Check that `TRUST_REGISTRY_ADDR`, `AUDIT_REGISTRY_ADDR` etc. are set in `.env` and that the backend was restarted after updating `.env`.
