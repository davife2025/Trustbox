/* packages/shared/src/types/index.ts
   Single source of truth for all types used across
   backend, frontend, and contracts packages.
   ─────────────────────────────────────────────── */

// ── Hedera ───────────────────────────────────────────────────────────────────

export interface HederaConfig {
  network:      "testnet" | "mainnet"
  operatorId:   string
  operatorKey:  string
  rpcUrl:       string
  chainId:      number
  mirrorNode:   string
  explorer:     string
  hashscan:     string
}

export interface HCSTopics {
  credit:    string   // 0.0.XXXXXX
  audit:     string
  intent:    string
  agent:     string
  blindAudit:string
}

export interface HCSMessage {
  topicId:         string
  sequenceNumber:  string
  consensusTimestamp: string
  message:         Record<string, unknown>
}

// ── Score ────────────────────────────────────────────────────────────────────

export type ScoreBandNum = 1 | 2 | 3 | 4

export interface ScoreBand {
  label: string
  range: string
  color: string
  bg:    string
}

export interface ScoreResult {
  success:       boolean
  action:        "score"
  scoreBand:     ScoreBandNum
  bandLabel:     string
  scoreHash:     string
  proof:         object
  publicSignals: string[]
  receiptCID:    string
  hcsTopicId:    string
  hcsSeqNum:     string
  txHash:        string
  explorerUrl:   string
  hashscanUrl:   string
  timestamp:     string
  walletAddress: string
  hederaAccount: string
}

// ── Audit ────────────────────────────────────────────────────────────────────

export type FindingSeverity = "critical" | "high" | "medium" | "low" | "info"

export interface AuditFinding {
  id:           string
  severity:     FindingSeverity
  title:        string
  detail:       string
  line:         number
  category:     string
  remediation:  string
}

export interface AuditPrepareResult {
  success:         boolean
  phase:           "prepare"
  contractAddress: string
  contractName:    string
  chain:           string
  findings:        AuditFinding[]
  score:           number
  merkleRoot:      string
  reportHash:      string
  auditedAt:       string
  analysedBy:      string
  note:            string
}

export interface AuditSubmitResult {
  success:         boolean
  action:          "audit"
  auditId:         string
  txHash:          string
  blockNumber:     string
  contractAddress: string
  contractName:    string
  reportCID:       string
  reportHash:      string
  merkleRoot:      string
  score:           number
  findings:        AuditFinding[]
  hcsSeqNum:       string
  hcsTopicId:      string
  explorerUrl:     string
  hashscanUrl:     string
  auditedAt:       string
}

// ── Verify (ERC-8004) ────────────────────────────────────────────────────────

export interface VerifyPrepareResult {
  success:     boolean
  agentId:     string
  modelHash:   string
  capHash:     string
  metadataCID: string
  metadataURL: string
  metadataURI: string
  trustScore:  number
  mintedAt:    string
  note:        string
}

export interface VerifyMintResult {
  success:      boolean
  action:       "verify"
  tokenId:      string
  agentId:      string
  modelHash:    string
  metadataCID:  string
  txHash:       string
  blockNumber:  string
  hcsSeqNum:    string
  hcsTopicId:   string
  explorerUrl:  string
  hashscanUrl:  string
  mintedAt:     string
  agentScore:   number
}

// ── Intent ────────────────────────────────────────────────────────────────────

export interface IntentSpec {
  action:    string
  params:    Record<string, unknown>
  category:  string
  parsedAt:  string
}

export interface IntentParseResult {
  success:   boolean
  specJson:  IntentSpec
  specHash:  string
  nlHash:    string
  note:      string
}

export interface IntentSubmitResult {
  success:        boolean
  action:         "execute"
  intentId:       string
  specHash:       string
  nlHash:         string
  executionHash:  string
  txHash:         string
  blockNumber:    string
  recordCID:      string
  hcsTopicId:     string
  hcsSeqNum:      string
  explorerUrl:    string
  hashscanUrl:    string
  timestamp:      string
}

export type IntentStatus = "PENDING" | "APPROVED" | "EXECUTING" | "EXECUTED" | "FAILED"

// ── Scan (Security Agent) ────────────────────────────────────────────────────

export interface ScanFinding {
  category:    string
  status:      "pass" | "warn" | "fail"
  detail:      string
}

export interface ScanResult {
  success:      boolean
  action:       "scan"
  agentId:      string
  agentName:    string
  trustScore:   number
  findings:     ScanFinding[]
  txHash:       string
  tokenId:      string
  hcsSeqNum:    string
  explorerUrl:  string
  hashscanUrl:  string
  stakeAmount:  string
  timestamp:    string
}

// ── Blind Audit (Phala TEE) ──────────────────────────────────────────────────

export interface BlindAuditResult {
  ok:              boolean
  jobId:           string
  resultCID:       string
  findingsHash:    string
  attestationCID:  string
  attestationQuote:string
  teeProvider:     string
  valid:           boolean
  hcsSeqNum:       string
  hcsTopicId:      string
  hashscanUrl:     string
  timestamp:       string
}

// ── History ───────────────────────────────────────────────────────────────────

export type HistoryItemType = "score" | "audit" | "intent" | "agent" | "blindaudit"

export interface HistoryItem {
  id:         string
  type:       HistoryItemType
  label:      string
  timestamp:  string
  status?:    string
  txHash?:    string
  hcsSeqNum?: string
  link?:      string
}

export interface DashboardStats {
  latestScoreBand:  ScoreBandNum | null
  latestScoreLabel: string | null
  totalAudits:      number
  totalIntents:     number
  totalAgents:      number
  unreadNotifs:     number
  recentActivity:   HistoryItem[]
}

// ── Agent ─────────────────────────────────────────────────────────────────────

export interface Agent {
  id:           string
  name:         string
  operator:     string
  version:      string
  status:       "online" | "offline" | "degraded" | "busy"
  trustScore:   number
  capabilities: string[]
  teeEnabled:   boolean
  stakeAmount:  string
  tokenId:      string
  hcsSeqNum:    string
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id:              string
  wallet_address:  string
  hedera_account?: string
  ens_name?:       string
  created_at:      string
}

export interface AuthResponse {
  token:     string
  expiresAt: number
  user:      AuthUser
}
