// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IERC8004
 * @notice Interface for ERC-8004: AI Agent Credential Standard
 * @dev Extends ERC-721 with agent-specific verifiability fields
 *
 * An ERC-8004 credential NFT represents a verified AI agent identity.
 * Each token stores:
 *   - agentId:    off-chain agent identifier string
 *   - modelHash:  keccak256(model + capabilities) — immutable model fingerprint
 *   - capHash:    keccak256(capabilities) — capability commitment
 *   - metadataURI: ipfs:// link to full agent metadata JSON
 *   - trustScore: governance-updated trust score (0–100)
 *   - mintedAt:   block timestamp of initial mint
 */
interface IERC8004 {

    // ── Events ────────────────────────────────────────────────────────────────

    /// @notice Emitted when a new agent credential is minted
    event CredentialMinted(
        uint256 indexed tokenId,
        string  indexed agentId,
        address indexed owner,
        bytes32         modelHash,
        bytes32         capHash,
        string          metadataURI,
        uint256         timestamp
    );

    /// @notice Emitted when an agent's trust score is updated
    event TrustScoreUpdated(
        uint256 indexed tokenId,
        uint256         oldScore,
        uint256         newScore,
        address         updatedBy
    );

    /// @notice Emitted when a credential is revoked
    event CredentialRevoked(
        uint256 indexed tokenId,
        string  indexed agentId,
        address         revokedBy,
        string          reason
    );

    // ── Structs ───────────────────────────────────────────────────────────────

    struct AgentCredential {
        string  agentId;
        bytes32 modelHash;
        bytes32 capHash;
        string  metadataURI;
        uint256 trustScore;
        uint256 mintedAt;
        bool    revoked;
    }

    // ── Core functions ────────────────────────────────────────────────────────

    /**
     * @notice Mint a new ERC-8004 agent credential
     * @param agentId    Off-chain agent identifier (e.g. "agt_abc123")
     * @param modelHash  keccak256 of model name + capabilities string
     * @param owner      Address that will own this credential NFT
     * @param capHash    keccak256 of capabilities list
     * @param metadataURI IPFS URI pointing to full agent metadata JSON
     * @return tokenId   The minted token ID
     */
    function mintCredential(
        string  calldata agentId,
        bytes32          modelHash,
        address          owner,
        bytes32          capHash,
        string  calldata metadataURI
    ) external returns (uint256 tokenId);

    /**
     * @notice Retrieve the full credential for a given token
     */
    function getCredential(uint256 tokenId) external view returns (AgentCredential memory);

    /**
     * @notice Look up a token ID by agent ID string
     */
    function agentIdToToken(string calldata agentId) external view returns (uint256 tokenId);

    /**
     * @notice Update trust score — restricted to governance/owner
     */
    function updateTrustScore(uint256 tokenId, uint256 newScore) external;

    /**
     * @notice Revoke a credential — restricted to owner or governance
     */
    function revokeCredential(uint256 tokenId, string calldata reason) external;
}
