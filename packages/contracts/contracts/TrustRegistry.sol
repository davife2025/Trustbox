// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./interfaces/IERC8004.sol";

contract TrustRegistry is ERC721URIStorage, Ownable, ReentrancyGuard, IERC8004 {

    uint256 private _tokenIdCounter;
    mapping(uint256 => AgentCredential) private _credentials;
    mapping(string  => uint256)          private _agentIdToToken;
    mapping(address => uint256[])        private _ownerTokens;
    mapping(address => bool)             public  governors;

    constructor() ERC721("TrustBox Agent Credential", "TBAC") {
        governors[msg.sender] = true;
    }

    modifier onlyGovernor() {
        require(governors[msg.sender] || msg.sender == owner(), "TrustRegistry: not a governor");
        _;
    }

    function mintCredential(
        string  calldata agentId,
        bytes32          modelHash,
        address          owner_,
        bytes32          capHash,
        string  calldata metadataURI
    ) external override nonReentrant returns (uint256 tokenId) {
        require(bytes(agentId).length > 0,    "TrustRegistry: empty agentId");
        require(owner_ != address(0),          "TrustRegistry: zero owner");
        require(_agentIdToToken[agentId] == 0, "TrustRegistry: agentId already registered");

        _tokenIdCounter++;
        tokenId = _tokenIdCounter;

        _safeMint(owner_, tokenId);
        _setTokenURI(tokenId, metadataURI);

        _credentials[tokenId] = AgentCredential({
            agentId:     agentId,
            modelHash:   modelHash,
            capHash:     capHash,
            metadataURI: metadataURI,
            trustScore:  85,
            mintedAt:    block.timestamp,
            revoked:     false
        });

        _agentIdToToken[agentId] = tokenId;
        _ownerTokens[owner_].push(tokenId);

        emit CredentialMinted(tokenId, agentId, owner_, modelHash, capHash, metadataURI, block.timestamp);
    }

    function getCredential(uint256 tokenId) external view override returns (AgentCredential memory) {
        require(_exists(tokenId), "TrustRegistry: nonexistent token");
        return _credentials[tokenId];
    }

    function agentIdToToken(string calldata agentId) external view override returns (uint256) { return _agentIdToToken[agentId]; }
    function getOwnerTokens(address owner_)          external view returns (uint256[] memory)  { return _ownerTokens[owner_]; }
    function totalMinted()                           external view returns (uint256)            { return _tokenIdCounter; }

    function updateTrustScore(uint256 tokenId, uint256 newScore) external override onlyGovernor {
        require(_exists(tokenId),               "TrustRegistry: nonexistent token");
        require(newScore <= 100,                 "TrustRegistry: score > 100");
        require(!_credentials[tokenId].revoked, "TrustRegistry: revoked");
        uint256 old = _credentials[tokenId].trustScore;
        _credentials[tokenId].trustScore = newScore;
        emit TrustScoreUpdated(tokenId, old, newScore, msg.sender);
    }

    function revokeCredential(uint256 tokenId, string calldata reason) external override onlyGovernor {
        require(_exists(tokenId),               "TrustRegistry: nonexistent token");
        require(!_credentials[tokenId].revoked, "TrustRegistry: already revoked");
        _credentials[tokenId].revoked = true;
        emit CredentialRevoked(tokenId, _credentials[tokenId].agentId, msg.sender, reason);
    }

    function addGovernor(address gov)    external onlyOwner { require(gov != address(0), "zero"); governors[gov] = true; }
    function removeGovernor(address gov) external onlyOwner { governors[gov] = false; }

    // OZ v4 hook — blocks transfers (soulbound)
    function _beforeTokenTransfer(address from, address to, uint256 tokenId, uint256 batchSize)
        internal override {
        require(from == address(0), "TrustRegistry: credential is soulbound");
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }
}
