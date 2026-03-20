import { Request, Response, NextFunction } from "express"
import { z, ZodSchema } from "zod"

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({
        error:  "Validation failed",
        issues: result.error.flatten().fieldErrors,
      })
    }
    req.body = result.data
    next()
  }
}

// ── Schemas ───────────────────────────────────────────────────────────────────

export const AuditSchema = z.object({
  walletAddress:   z.string().min(1),
  contractAddress: z.string().min(1),
  contractName:    z.string().optional(),
  chain:           z.string().optional(),
  deployer:        z.string().optional(),
  findings:        z.array(z.any()).optional(),
  score:           z.number().optional(),
  merkleRoot:      z.string().optional(),
  reportHash:      z.string().optional(),
  auditorSig:      z.string().optional(),
  auditedAt:       z.string().optional(),
  signature:       z.string().optional(),
})

export const VerifySchema = z.object({
  walletAddress: z.string().min(1),
  agentName:     z.string().min(1),
  model:         z.string().min(1),
  operator:      z.string().optional(),
  capabilities:  z.string().optional(),
  environment:   z.string().optional(),
  agentId:       z.string().optional(),
  modelHash:     z.string().optional(),
  metadataCID:   z.string().optional(),
  metadataURI:   z.string().optional(),
  signature:     z.string().optional(),
})

export const IntentParseSchema = z.object({
  walletAddress: z.string().min(1),
  nlText:        z.string().min(3),
  category:      z.string().min(1),
  hederaAccount: z.string().optional(),
  signature:     z.string().optional(),
})

export const IntentSubmitSchema = z.object({
  walletAddress: z.string().min(1),
  hederaAccount: z.string().optional(),
  nlHash:        z.string().min(1),
  specHash:      z.string().min(1),
  specJson:      z.any(),
  category:      z.string().min(1),
  signature:     z.string().min(1),
})

export const ScanSchema = z.object({
  walletAddress: z.string().min(1),
  agentId:       z.string().min(1),
  agentName:     z.string().min(1),
  teeEndpoint:   z.string().url(),
  stakeAmount:   z.string().optional(),
  signature:     z.string().optional(),
})

export const BlindAuditSchema = z.object({
  walletAddress:  z.string().min(1),
  contractAddr:   z.string().min(1),
  agentId:        z.string().min(1),
  agentOperator:  z.string().optional(),
  auditScope:     z.array(z.string()).optional(),
  projectName:    z.string().optional(),
  signature:      z.string().optional(),
})
