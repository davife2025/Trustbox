/* services/ethers.ts — TrustBoxHedera AI
   ABIs inlined — no filesystem dependency on Render.
*/

import { ethers, Contract, JsonRpcProvider, Wallet } from "ethers"
import { env } from "../config/env"

// ── Inlined ABIs ──────────────────────────────────────────────────────────────

const TRUST_REGISTRY_ABI = [
  "function mintCredential(string agentId, bytes32 modelHash, address owner, bytes32 capHash, string metadataURI) returns (uint256)",
  "function getCredential(uint256 tokenId) view returns (tuple(string agentId, bytes32 modelHash, bytes32 capHash, string metadataURI, uint256 trustScore, uint256 mintedAt, bool revoked))",
  "function agentIdToToken(string agentId) view returns (uint256)",
  "function totalMinted() view returns (uint256)",
  "function updateTrustScore(uint256 tokenId, uint256 newScore)",
  "function revokeCredential(uint256 tokenId, string reason)",
  "event CredentialMinted(uint256 indexed tokenId, string indexed agentId, address indexed owner, bytes32 modelHash, bytes32 capHash, string metadataURI, uint256 timestamp)",
]

const AUDIT_REGISTRY_ABI = [
  "function submitAudit(address contractAddress, bytes32 reportHash, bytes32 merkleRoot, string reportCID, bytes auditorSig) returns (uint256)",
  "function getAudit(uint256 auditId) view returns (tuple(address contractAddress, bytes32 reportHash, bytes32 merkleRoot, string reportCID, address auditor, bytes auditorSig, uint256 submittedAt, bool revoked))",
  "function getAuditsByContract(address contractAddress) view returns (uint256[])",
  "function totalAudits() view returns (uint256)",
  "function verifyFinding(uint256 auditId, bytes32 leaf, bytes32[] proof) view returns (bool)",
  "event AuditSubmitted(uint256 indexed auditId, address indexed contractAddress, address indexed auditor, bytes32 reportHash, bytes32 merkleRoot, string reportCID, uint256 timestamp)",
]

const AGENT_MARKETPLACE_ABI = [
  "function registerAgent(bytes32 agentIdHash, string teeEndpoint, string metadataURI) payable returns (uint256)",
  "function deregisterAgent(uint256 tokenId)",
  "function createJob(bytes32 agentIdHash, address agentOperator, bytes encryptedPayload, bytes32 payloadHash) returns (uint256)",
  "function completeJob(uint256 jobId, bytes32 findingsHash, string resultCID, bytes teeSignature)",
  "function failJob(uint256 jobId, string reason)",
  "function getAgent(uint256 tokenId) view returns (tuple(bytes32 agentIdHash, address operator, string teeEndpoint, string metadataURI, uint256 stakeAmount, uint256 registeredAt, bool active, uint256 jobsCompleted, uint256 trustScore))",
  "function getJob(uint256 jobId) view returns (tuple(uint256 agentTokenId, address requester, bytes encryptedPayload, bytes32 payloadHash, bytes32 findingsHash, string resultCID, bytes teeSignature, uint256 createdAt, uint256 completedAt, uint8 status))",
  "function totalAgents() view returns (uint256)",
  "function totalJobs() view returns (uint256)",
  "function MIN_STAKE() view returns (uint256)",
  "event AgentRegistered(uint256 indexed tokenId, bytes32 indexed agentIdHash, address indexed operator, string teeEndpoint, uint256 stakeAmount, uint256 timestamp)",
  "event JobCreated(uint256 indexed jobId, uint256 indexed agentTokenId, address indexed requester, bytes32 payloadHash, uint256 timestamp)",
  "event JobCompleted(uint256 indexed jobId, uint256 indexed agentTokenId, bytes32 findingsHash, string resultCID, uint256 timestamp)",
]

const INTENT_VAULT_ABI = [
  "function submitIntent(bytes32 nlHash, bytes32 specHash, string category, bytes userSig) returns (uint256)",
  "function approveIntent(uint256 intentId)",
  "function executeIntent(uint256 intentId, bytes32 executionHash)",
  "function failIntent(uint256 intentId, string reason)",
  "function getIntent(uint256 intentId) view returns (tuple(bytes32 nlHash, bytes32 specHash, string category, address submitter, bytes userSig, uint8 status, bytes32 executionHash, uint256 submittedAt, uint256 executedAt))",
  "function getUserIntents(address user) view returns (uint256[])",
  "function totalIntents() view returns (uint256)",
  "function addExecutor(address exec)",
  "function executors(address) view returns (bool)",
  "event IntentSubmitted(uint256 indexed intentId, address indexed submitter, bytes32 nlHash, bytes32 specHash, string category, uint256 timestamp)",
  "event IntentApproved(uint256 indexed intentId, address approvedBy)",
  "event IntentExecuted(uint256 indexed intentId, bytes32 executionHash, uint256 timestamp)",
]

// ── Provider + Signer ─────────────────────────────────────────────────────────

export const provider = new JsonRpcProvider(
  env.HEDERA_RPC_URL,
  { chainId: Number(env.HEDERA_CHAIN_ID), name: `hedera-${env.HEDERA_NETWORK}` }
)

export const signer = new Wallet(env.DEPLOYER_PRIVATE_KEY, provider)

// ── Gas config ────────────────────────────────────────────────────────────────

export async function getGasConfig() {
  return {
    gasPrice: ethers.parseUnits("750", "gwei"),
    gasLimit: 1_500_000n,
  }
}

export async function waitForTx(tx: any) {
  const receipt = await tx.wait(1)
  return receipt
}

// ── Contract accessors ────────────────────────────────────────────────────────

export function getTrustRegistry()    { return new Contract(env.TRUST_REGISTRY_ADDR    ?? ethers.ZeroAddress, TRUST_REGISTRY_ABI,    signer) }
export function getAuditRegistry()    { return new Contract(env.AUDIT_REGISTRY_ADDR    ?? ethers.ZeroAddress, AUDIT_REGISTRY_ABI,    signer) }
export function getAgentMarketplace() { return new Contract(env.AGENT_MARKETPLACE_ADDR ?? ethers.ZeroAddress, AGENT_MARKETPLACE_ABI, signer) }
export function getIntentVault()      { return new Contract(env.INTENT_VAULT_ADDR      ?? ethers.ZeroAddress, INTENT_VAULT_ABI,      signer) }

// ── Helpers ───────────────────────────────────────────────────────────────────

export function explorerTx(hash: string) {
  return `https://hashscan.io/${env.HEDERA_NETWORK}/transaction/${hash}`
}

export function explorerContract(addr: string) {
  return `https://hashscan.io/${env.HEDERA_NETWORK}/contract/${addr}`
}
