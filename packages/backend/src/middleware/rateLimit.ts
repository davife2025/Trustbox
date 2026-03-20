import rateLimit from "express-rate-limit"

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests — try again in 15 minutes" },
})

export const walletRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.body?.walletAddress ?? req.ip ?? "unknown",
  message: { error: "Rate limit exceeded — 10 requests per minute per wallet" },
})
