// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC8004 {

    event CredentialMinted(
        uint256 indexed tokenId,
        string  indexed agentId,
        address indexed owner,
        bytes32         modelHash,
        bytes32         capHash,
        string          metadataURI,
        uint256         timestamp
    );

    event TrustScoreUpdated(
        uint256 indexed tokenId,
        uint256         oldScore,
        uint256         newScore,
        address         updatedBy
    );

    event CredentialRevoked(
        uint256 indexed tokenId,
        string  indexed agentId,
        address         revokedBy,
        string          reason
    );

    struct AgentCredential {
        string  agentId;
        bytes32 modelHash;
        bytes32 capHash;
        string  metadataURI;
        uint256 trustScore;
        uint256 mintedAt;
        bool    revoked;
    }

    function mintCredential(
        string  calldata agentId,
        bytes32          modelHash,
        address          owner,
        bytes32          capHash,
        string  calldata metadataURI
    ) external returns (uint256 tokenId);

    function getCredential(uint256 tokenId) external view returns (AgentCredential memory);
    function agentIdToToken(string calldata agentId) external view returns (uint256 tokenId);
    function updateTrustScore(uint256 tokenId, uint256 newScore) external;
    function revokeCredential(uint256 tokenId, string calldata reason) external;
}
