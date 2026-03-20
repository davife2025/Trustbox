/* scripts/exportAbis.ts
   After `npm run compile`, copies all 4 ABIs into packages/shared/src/abis/
   so backend + frontend can import them from @trustboxhedera/shared.
   Run: ts-node scripts/exportAbis.ts
   ──────────────────────────────────────────────────────────────────────── */

import * as fs   from "fs"
import * as path from "path"

const CONTRACTS = ["TrustRegistry", "AuditRegistry", "AgentMarketplace", "IntentVault"]

const ARTIFACTS_DIR = path.join(__dirname, "../artifacts/contracts")
const OUT_DIR       = path.join(__dirname, "../../shared/src/abis")

fs.mkdirSync(OUT_DIR, { recursive: true })

let exported = 0

for (const name of CONTRACTS) {
  const artifactPath = path.join(ARTIFACTS_DIR, `${name}.sol`, `${name}.json`)

  if (!fs.existsSync(artifactPath)) {
    console.warn(`⚠  Artifact not found for ${name} — run: npm run compile`)
    continue
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"))
  const abiOnly  = { contractName: artifact.contractName, abi: artifact.abi }

  const outPath = path.join(OUT_DIR, `${name}.json`)
  fs.writeFileSync(outPath, JSON.stringify(abiOnly, null, 2))
  console.log(`✅ Exported ${name}.json → shared/src/abis/`)
  exported++
}

// Write barrel index for typed imports
const indexPath = path.join(OUT_DIR, "index.ts")
const lines = CONTRACTS.map(n => `export { default as ${n}Abi } from "./${n}.json"`)
fs.writeFileSync(indexPath, lines.join("\n") + "\n")
console.log(`✅ ABI index written → shared/src/abis/index.ts`)
console.log(`\nExported ${exported}/${CONTRACTS.length} ABIs.`)
