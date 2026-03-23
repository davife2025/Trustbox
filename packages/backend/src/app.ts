/* app.ts — TrustBoxHedera AI Backend */

import express        from "express"
import cors           from "cors"
import { apiLimiter } from "./middleware/rateLimit"
import { errorHandler } from "./middleware/errorhandler"
import { authRouter }   from "./api/auth"
import { historyRouter } from "./api/history"
import { verifyRouter }  from "./api/verify"
import { auditRouter }   from "./api/audit"
import { scanRouter }    from "./api/scan"
import { blindAuditRouter } from "./api/blindaudit"
import { executeRouter } from "./api/execute"
import { agentsRouter }  from "./api/agents"
import { holRouter }     from "./api/hol"
import { healthRouter }  from "./api/healthCheck"

const app = express()
app.set("trust proxy", 1)  // Render + Vercel sit behind proxies

// ── CORS ──────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:3000",
  process.env.FRONTEND_URL ?? "",
].filter(Boolean)

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true)
    cb(new Error(`CORS: origin ${origin} not allowed`))
  },
  credentials: true,
}))

app.use(express.json({ limit: "2mb" }))
app.use("/api", apiLimiter)

// ── Health ────────────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => res.json({
  status:  "ok",
  service: "TrustBoxHedera AI Backend",
  chain:   "Hedera Smart Contract Service",
  network: process.env.HEDERA_NETWORK ?? "testnet",
  time:    new Date().toISOString(),
}))

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/auth",       authRouter)
app.use("/api/history",    historyRouter)
app.use("/api/verify",     verifyRouter)
app.use("/api/audit",      auditRouter)
app.use("/api/scan",       scanRouter)
app.use("/api/blindaudit", blindAuditRouter)
app.use("/api/intent",     executeRouter)
app.use("/api/agents",     agentsRouter)
app.use("/api/hol",        holRouter)
app.use("/health",         healthRouter)

// ── 404 ───────────────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({
    status:     "ok",
    chain:      "Hedera Smart Contract Service",
    network:    process.env.HEDERA_NETWORK ?? "testnet",
    jwtSet:     !!process.env.JWT_SECRET,
    groqSet:    !!process.env.GROQ_API_KEY,
    contracts: {
      trustRegistry:    !!process.env.TRUST_REGISTRY_ADDR,
      auditRegistry:    !!process.env.AUDIT_REGISTRY_ADDR,
      agentMarketplace: !!process.env.AGENT_MARKETPLACE_ADDR,
      intentVault:      !!process.env.INTENT_VAULT_ADDR,
    },
  })
})

app.use((_req, res) => res.status(404).json({ error: "Route not found" }))

// ── Error handler ─────────────────────────────────────────────────────────────
app.use(errorHandler)

export default app
