/* services/ethers.ts — TrustBoxHedera AI
   All HSCS contract interactions via Hashio RPC.
   ─────────────────────────────────────────────── */

import { ethers, Contract, JsonRpcProvider, Wallet } from "ethers"
import { env } from "../config/env"

// ABI loaders — populated after npm run compile + exportAbis
function loadAbi(name: string): any[] {
  try {
    return require(`../../node_modules/@trustboxhedera/shared/src/abis/${name}.json`).abi
  } catch {
    try {
      // fallback: look relative to contracts package artifacts
      return require(`../../../contracts/artifacts/contracts/${name}.sol/${name}.json`).abi
    } catch {
      console.warn(`⚠  ABI not found for ${name} — deploy contracts first`)
      return []
    }
  }
}

// ── Provider + Signer ─────────────────────────────────────────────────────────

export const provider = new JsonRpcProvider(
  env.HEDERA_RPC_URL,
  { chainId: Number(env.HEDERA_CHAIN_ID), name: `hedera-${env.HEDERA_NETWORK}` }
)

export const signer = new Wallet(env.DEPLOYER_PRIVATE_KEY, provider)

// ── Gas config ────────────────────────────────────────────────────────────────

export async function getGasConfig() {
  try {
    const feeData = await provider.getFeeData()
    return {
      maxFeePerGas:         feeData.maxFeePerGas         ?? ethers.parseUnits("100", "gwei"),
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ?? ethers.parseUnits("2",   "gwei"),
      gasLimit:             500_000n,
    }
  } catch {
    return {
      gasPrice: ethers.parseUnits("100", "gwei"),
      gasLimit: 500_000n,
    }
  }
}

// ── Contract factory ──────────────────────────────────────────────────────────

function contract(name: string, address: string | null | undefined): Contract {
  if (!address) {
    console.warn(`⚠  ${name} address not set — set ${name.toUpperCase().replace(/([A-Z])/g, '_$1').slice(1)}_ADDR in .env`)
    // Return stub contract — calls will fail gracefully
    return new Contract(
      ethers.ZeroAddress,
      loadAbi(name),
      signer
    )
  }
  return new Contract(address, loadAbi(name), signer)
}

export function getTrustRegistry()     { return contract("TrustRegistry",    env.TRUST_REGISTRY_ADDR)    }
export function getAuditRegistry()     { return contract("AuditRegistry",    env.AUDIT_REGISTRY_ADDR)    }
export function getAgentMarketplace()  { return contract("AgentMarketplace", env.AGENT_MARKETPLACE_ADDR) }
export function getIntentVault()       { return contract("IntentVault",      env.INTENT_VAULT_ADDR)      }

// ── Wait for tx ───────────────────────────────────────────────────────────────

export async function waitForTx(
  tx: ethers.ContractTransactionResponse,
  confirmations = 1
): Promise<ethers.ContractTransactionReceipt> {
  const receipt = await tx.wait(confirmations)
  if (!receipt) throw new Error("Transaction receipt is null")
  if (receipt.status === 0) throw new Error(`Transaction reverted: ${tx.hash}`)
  return receipt
}

// ── Event listener with timeout ───────────────────────────────────────────────

export async function waitForEvent<T>(
  contract: Contract,
  eventName: string,
  timeoutMs = 60_000
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timeout waiting for ${eventName} event after ${timeoutMs}ms`))
    }, timeoutMs)

    contract.once(eventName, (...args) => {
      clearTimeout(timeout)
      resolve(args as T)
    })
  })
}

// ── HashScan explorer helpers ─────────────────────────────────────────────────

export function explorerTx(hash: string): string {
  return `https://hashscan.io/${env.HEDERA_NETWORK}/transaction/${hash}`
}

export function explorerContract(address: string): string {
  return `https://hashscan.io/${env.HEDERA_NETWORK}/contract/${address}`
}
