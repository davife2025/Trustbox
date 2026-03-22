/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_HEDERA_NETWORK:         string
  readonly VITE_HEDERA_CHAIN_ID:        string
  readonly VITE_BACKEND_URL:            string
  readonly VITE_TRUST_REGISTRY_ADDR:    string
  readonly VITE_AUDIT_REGISTRY_ADDR:    string
  readonly VITE_AGENT_MARKETPLACE_ADDR: string
  readonly VITE_INTENT_VAULT_ADDR:      string
  readonly VITE_HASHCONNECT_PROJECT_ID: string
  readonly VITE_APP_NAME:               string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
