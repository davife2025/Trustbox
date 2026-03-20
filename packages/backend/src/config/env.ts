/* config/env.ts — TrustBoxHedera AI Backend
   All environment variables validated at startup.
   No Chainlink vars. Hedera-only.
   ─────────────────────────────────────────── */

import { z } from "zod"
import * as dotenv from "dotenv"
import * as path from "path"

dotenv.config({ path: path.resolve(__dirname, "../../../.env") })

const envSchema = z.object({
  // ── Server ──────────────────────────────────────────────────────────────
  PORT:         z.string().default("4000"),
  NODE_ENV:     z.enum(["development", "production", "test"]).default("development"),
  JWT_SECRET:   z.string().min(16, "JWT_SECRET must be at least 16 chars"),

  // ── Hedera Operator ──────────────────────────────────────────────────────
  HEDERA_OPERATOR_ID:  z.string().min(1),
  HEDERA_OPERATOR_KEY: z.string().min(1),
  HEDERA_NETWORK:      z.enum(["testnet", "mainnet"]).default("testnet"),

  // ── Hashio RPC (HSCS) ────────────────────────────────────────────────────
  HEDERA_RPC_URL:  z.string().url().default("https://testnet.hashio.io/api"),
  HEDERA_CHAIN_ID: z.string().default("296"),

  // ── Deployer (HSCS contract calls) ──────────────────────────────────────
  DEPLOYER_PRIVATE_KEY: z.string().min(1),

  // ── HSCS Contract Addresses ──────────────────────────────────────────────
  TRUST_REGISTRY_ADDR:    z.string().default(""),
  AUDIT_REGISTRY_ADDR:    z.string().default(""),
  AGENT_MARKETPLACE_ADDR: z.string().default(""),
  INTENT_VAULT_ADDR:      z.string().default(""),

  // ── HCS Topic IDs ────────────────────────────────────────────────────────
  HCS_AUDIT_TOPIC_ID:      z.string().default(""),
  HCS_INTENT_TOPIC_ID:     z.string().default(""),
  HCS_AGENT_TOPIC_ID:      z.string().default(""),
  HCS_BLINDAUDIT_TOPIC_ID: z.string().default(""),

  // ── Groq AI ──────────────────────────────────────────────────────────────
  GROQ_API_KEY: z.string().optional(),

  // ── Pinata IPFS ──────────────────────────────────────────────────────────
  PINATA_JWT:     z.string().optional(),
  PINATA_GATEWAY: z.string().default("https://gateway.pinata.cloud"),

  // ── Pyth Price Feeds ─────────────────────────────────────────────────────
  PYTH_CONTRACT_ADDRESS: z.string().default(""),
  PYTH_ETH_USD_FEED:     z.string().default(""),
  PYTH_BTC_USD_FEED:     z.string().default(""),

  // ── Phala TEE ────────────────────────────────────────────────────────────
  PHALA_ENDPOINT:       z.string().default("https://api.phala.network/api/contract/dispatch"),
  PHALA_AGENT_CONTRACT: z.string().default(""),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error("❌ Invalid environment variables:")
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = parsed.data
export type Env  = typeof env
