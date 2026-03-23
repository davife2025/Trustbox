/* services/ethers.ts — TrustBoxHedera AI
   ABIs fully inlined. No filesystem required on Render.
   Nonce manager prevents collisions on concurrent requests.
*/

import { ethers, Contract, JsonRpcProvider, Wallet, Interface } from "ethers"
import { env } from "../config/env"

// ── Inlined ABIs ──────────────────────────────────────────────────────────────

const TRUST_REGISTRY_ABI = [
  "function mintCredential(string agentId, bytes32 modelHash, address owner, bytes32 capHash, string metadataURI) external returns (uint256 tokenId)",
  "function getCredential(uint256 tokenId) external view returns (tuple(string agentId, bytes32 modelHash, bytes32 capHash, string metadataURI, uint256 trustScore, uint256 mintedAt, bool revoked))",
  "function agentIdToToken(string agentId) external view returns (uint256)",
  "function totalMinted() external view returns (uint256)",
  "function updateTrustScore(uint256 tokenId, uint256 newScore) external",
  "function revokeCredential(uint256 tokenId, string reason) external",
  "event CredentialMinted(uint256 indexed tokenId, string indexed agentId, address indexed owner, bytes32 modelHash, bytes32 capHash, string metadataURI, uint256 timestamp)",
]

const AUDIT_REGISTRY_ABI = [
  "function submitAudit(address contractAddress, bytes32 reportHash, bytes32 merkleRoot, string reportCID, bytes auditorSig) external returns (uint256 auditId)",
  "function getAudit(uint256 auditId) external view returns (tuple(address contractAddress, bytes32 reportHash, bytes32 merkleRoot, string reportCID, address auditor, bytes auditorSig, uint256 submittedAt, bool revoked))",
  "function getAuditsByContract(address contractAddress) external view returns (uint256[])",
  "function totalAudits() external view returns (uint256)",
  "function verifyFinding(uint256 auditId, bytes32 leaf, bytes32[] proof) external view returns (bool)",
  "event AuditSubmitted(uint256 indexed auditId, address indexed contractAddress, address indexed auditor, bytes32 reportHash, bytes32 merkleRoot, string reportCID, uint256 timestamp)",
]

const AGENT_MARKETPLACE_ABI = [
  "function registerAgent(bytes32 agentIdHash, string teeEndpoint, string metadataURI) external payable returns (uint256 tokenId)",
  "function deregisterAgent(uint256 tokenId) external",
  "function createJob(bytes32 agentIdHash, address agentOperator, bytes encryptedPayload, bytes32 payloadHash) external returns (uint256 jobId)",
  "function completeJob(uint256 jobId, bytes32 findingsHash, string resultCID, bytes teeSignature) external",
  "function failJob(uint256 jobId, string reason) external",
  "function getAgent(uint256 tokenId) external view returns (tuple(bytes32 agentIdHash, address operator, string teeEndpoint, string metadataURI, uint256 stakeAmount, uint256 registeredAt, bool active, uint256 jobsCompleted, uint256 trustScore))",
  "function getJob(uint256 jobId) external view returns (tuple(uint256 agentTokenId, address requester, bytes encryptedPayload, bytes32 payloadHash, bytes32 findingsHash, string resultCID, bytes teeSignature, uint256 createdAt, uint256 completedAt, uint8 status))",
  "function totalAgents() external view returns (uint256)",
  "function totalJobs() external view returns (uint256)",
  "function MIN_STAKE() external view returns (uint256)",
  "event AgentRegistered(uint256 indexed tokenId, bytes32 indexed agentIdHash, address indexed operator, string teeEndpoint, uint256 stakeAmount, uint256 timestamp)",
  "event JobCreated(uint256 indexed jobId, uint256 indexed agentTokenId, address indexed requester, bytes32 payloadHash, uint256 timestamp)",
  "event JobCompleted(uint256 indexed jobId, uint256 indexed agentTokenId, bytes32 findingsHash, string resultCID, uint256 timestamp)",
]

const INTENT_VAULT_ABI = [
  "function submitIntent(bytes32 nlHash, bytes32 specHash, string category, bytes userSig) external returns (uint256 intentId)",
  "function approveIntent(uint256 intentId) external",
  "function executeIntent(uint256 intentId, bytes32 executionHash) external",
  "function failIntent(uint256 intentId, string reason) external",
  "function getIntent(uint256 intentId) external view returns (tuple(bytes32 nlHash, bytes32 specHash, string category, address submitter, bytes userSig, uint8 status, bytes32 executionHash, uint256 submittedAt, uint256 executedAt))",
  "function getUserIntents(address user) external view returns (uint256[])",
  "function totalIntents() external view returns (uint256)",
  "function addExecutor(address exec) external",
  "function executors(address) external view returns (bool)",
  "event IntentSubmitted(uint256 indexed intentId, address indexed submitter, bytes32 nlHash, bytes32 specHash, string category, uint256 timestamp)",
  "event IntentExecuted(uint256 indexed intentId, bytes32 executionHash, uint256 timestamp)",
]

// ── Provider + Signer ─────────────────────────────────────────────────────────

export const provider = new JsonRpcProvider(
  env.HEDERA_RPC_URL,
  { chainId: Number(env.HEDERA_CHAIN_ID), name: `hedera-${env.HEDERA_NETWORK}` }
)

export const signer = new Wallet(env.DEPLOYER_PRIVATE_KEY, provider)

// ── Nonce manager — prevents collisions on concurrent requests ────────────────

let _nonce: number | null = null
let _nonceLock = false
const _nonceQueue: Array<(n: number) => void> = []

async function getNextNonce(): Promise<number> {
  // Serialize nonce access
  while (_nonceLock) {
    await new Promise<void>(r => {
      const check = setInterval(() => { if (!_nonceLock) { clearInterval(check); r() } }, 10)
    })
  }
  _nonceLock = true
  try {
    if (_nonce === null) {
      _nonce = await provider.getTransactionCount(signer.address, "latest")
    }
    return _nonce++
  } finally {
    _nonceLock = false
  }
}

export function resetNonce() { _nonce = null }

// ── Gas config ────────────────────────────────────────────────────────────────

export async function getGasConfig() {
  return {
    gasPrice: ethers.parseUnits("950", "gwei"),
    gasLimit: 1_500_000n,
  }
}

export async function waitForTx(tx: any) {
  const receipt = await tx.wait(1)
  // Reset nonce on revert so next tx uses fresh on-chain nonce
  if (receipt?.status === 0) resetNonce()
  return receipt
}

// ── Contract accessors — always return contracts with populated ABIs ──────────

function makeContract(address: string | undefined, abi: string[]): Contract {
  const addr = address && address !== "" ? address : ethers.ZeroAddress
  if (!address || address === "") {
    console.warn(`[ethers] Contract address not set — check env vars`)
  }
  // Verify ABI parses correctly
  const iface = new Interface(abi)
  const fnCount = Object.keys(iface.functions).length
  console.log(`[ethers] Contract ${addr.slice(0,10)}… loaded with ${fnCount} functions`)
  return new Contract(addr, abi, signer)
}

export function getTrustRegistry()    { return makeContract(env.TRUST_REGISTRY_ADDR,    TRUST_REGISTRY_ABI)    }
export function getAuditRegistry()    { return makeContract(env.AUDIT_REGISTRY_ADDR,    AUDIT_REGISTRY_ABI)    }
export function getAgentMarketplace() { return makeContract(env.AGENT_MARKETPLACE_ADDR, AGENT_MARKETPLACE_ABI) }
export function getIntentVault()      { return makeContract(env.INTENT_VAULT_ADDR,      INTENT_VAULT_ABI)      }

// ── Tx helper with nonce management ──────────────────────────────────────────

export async function sendTx(contract: Contract, method: string, args: any[], value?: bigint) {
  const gasConfig = await getGasConfig()
  const nonce     = await getNextNonce()
  const opts: any = { ...gasConfig, nonce }
  if (value) opts.value = value

  console.log(`[ethers] ${method}(${args.map(a => typeof a === 'string' ? a.slice(0,12) : a).join(', ')}) nonce=${nonce}`)

  try {
    const tx      = await contract[method](...args, opts)
    const receipt = await tx.wait(1)
    if (receipt?.status === 0) {
      resetNonce()
      throw new Error(`${method} reverted on-chain — check contract state and args`)
    }
    return { tx, receipt }
  } catch (err: any) {
    // Nonce too low — reset and let caller retry
    if (err.code === "NONCE_EXPIRED" || err.message?.includes("nonce")) {
      resetNonce()
    }
    throw err
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function explorerTx(hash: string) {
  return `https://hashscan.io/${env.HEDERA_NETWORK}/transaction/${hash}`
}

export function explorerContract(addr: string) {
  return `https://hashscan.io/${env.HEDERA_NETWORK}/contract/${addr}`
}
