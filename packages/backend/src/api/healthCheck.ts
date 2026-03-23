/* api/healthCheck.ts — tests ABI loading and contract connectivity */
import { Router } from "express"
import { getTrustRegistry, getAuditRegistry, getAgentMarketplace, getIntentVault } from "../services/ethers"
import { env } from "../config/env"

export const healthRouter = Router()

healthRouter.get("/", (_req, res) => {
  const contracts = {
    TrustRegistry:    { addr: env.TRUST_REGISTRY_ADDR,    fnCount: 0, ok: false },
    AuditRegistry:    { addr: env.AUDIT_REGISTRY_ADDR,    fnCount: 0, ok: false },
    AgentMarketplace: { addr: env.AGENT_MARKETPLACE_ADDR, fnCount: 0, ok: false },
    IntentVault:      { addr: env.INTENT_VAULT_ADDR,      fnCount: 0, ok: false },
  }

  try { const c = getAuditRegistry();    contracts.AuditRegistry.fnCount    = c.interface.fragments.length; contracts.AuditRegistry.ok    = c.interface.fragments.length > 0 } catch(e: any) { contracts.AuditRegistry.ok = false }
  try { const c = getTrustRegistry();   contracts.TrustRegistry.fnCount   = c.interface.fragments.length; contracts.TrustRegistry.ok   = c.interface.fragments.length > 0 } catch(e: any) { contracts.TrustRegistry.ok = false }
  try { const c = getAgentMarketplace();contracts.AgentMarketplace.fnCount = c.interface.fragments.length; contracts.AgentMarketplace.ok = c.interface.fragments.length > 0 } catch(e: any) { contracts.AgentMarketplace.ok = false }
  try { const c = getIntentVault();     contracts.IntentVault.fnCount     = c.interface.fragments.length; contracts.IntentVault.ok     = c.interface.fragments.length > 0 } catch(e: any) { contracts.IntentVault.ok = false }

  res.json({
    status:    "ok",
    network:   env.HEDERA_NETWORK,
    jwtSet:    !!env.JWT_SECRET,
    groqSet:   !!env.GROQ_API_KEY,
    pinataSet: !!env.PINATA_JWT,
    contracts,
  })
})
