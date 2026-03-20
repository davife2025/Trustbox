// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title AuditRegistry
 * @notice Anchors smart contract audit reports on Hedera Smart Contract Service.
 * @dev Stores Merkle root + IPFS CID for each audit. Full report lives on IPFS.
 *      HCS trail (topic: HCS_AUDIT_TOPIC_ID) written by backend for every submission.
 *
 * Deployed on: Hedera Testnet (chainId: 296)
 */
contract AuditRegistry is Ownable, ReentrancyGuard {

    // ── Structs ───────────────────────────────────────────────────────────────

    struct AuditRecord {
        address contractAddress;   // audited contract
        bytes32 reportHash;        // keccak256 of full report JSON
        bytes32 merkleRoot;        // Merkle root of individual findings
        string  reportCID;         // IPFS CID for full report
        address auditor;           // wallet that submitted
        bytes   auditorSig;        // auditor's signature over reportHash
        uint256 submittedAt;       // block timestamp
        bool    revoked;
    }

    // ── State ─────────────────────────────────────────────────────────────────

    uint256 private _auditIdCounter;

    /// auditId → record
    mapping(uint256 => AuditRecord) private _audits;

    /// contractAddress → list of auditIds
    mapping(address => uint256[]) private _contractAudits;

    /// auditor address → list of auditIds
    mapping(address => uint256[]) private _auditorAudits;

    // ── Events ────────────────────────────────────────────────────────────────

    event AuditSubmitted(
        uint256 indexed auditId,
        address indexed contractAddress,
        address indexed auditor,
        bytes32         reportHash,
        bytes32         merkleRoot,
        string          reportCID,
        uint256         timestamp
    );

    event AuditRevoked(
        uint256 indexed auditId,
        address         revokedBy,
        string          reason
    );

    // ── Constructor ───────────────────────────────────────────────────────────

    constructor() Ownable(msg.sender) {}

    // ── Write ─────────────────────────────────────────────────────────────────

    /**
     * @notice Submit an audit report. Anchors Merkle root + IPFS CID on-chain.
     * @param contractAddress  The contract that was audited
     * @param reportHash       keccak256 of the full report JSON
     * @param merkleRoot       Merkle root of sorted finding hashes
     * @param reportCID        IPFS CID of the full report
     * @param auditorSig       Auditor signature over reportHash (from MetaMask/HashConnect)
     * @return auditId         The unique audit record ID
     */
    function submitAudit(
        address contractAddress,
        bytes32 reportHash,
        bytes32 merkleRoot,
        string  calldata reportCID,
        bytes   calldata auditorSig
    ) external nonReentrant returns (uint256 auditId) {
        require(contractAddress != address(0), "AuditRegistry: zero contract address");
        require(reportHash != bytes32(0),       "AuditRegistry: empty reportHash");
        require(merkleRoot != bytes32(0),       "AuditRegistry: empty merkleRoot");
        require(bytes(reportCID).length > 0,    "AuditRegistry: empty CID");

        _auditIdCounter++;
        auditId = _auditIdCounter;

        _audits[auditId] = AuditRecord({
            contractAddress: contractAddress,
            reportHash:      reportHash,
            merkleRoot:      merkleRoot,
            reportCID:       reportCID,
            auditor:         msg.sender,
            auditorSig:      auditorSig,
            submittedAt:     block.timestamp,
            revoked:         false
        });

        _contractAudits[contractAddress].push(auditId);
        _auditorAudits[msg.sender].push(auditId);

        emit AuditSubmitted(
            auditId,
            contractAddress,
            msg.sender,
            reportHash,
            merkleRoot,
            reportCID,
            block.timestamp
        );
    }

    // ── Read ──────────────────────────────────────────────────────────────────

    function getAudit(uint256 auditId)
        external view returns (AuditRecord memory)
    {
        require(auditId > 0 && auditId <= _auditIdCounter, "AuditRegistry: invalid auditId");
        return _audits[auditId];
    }

    function getAuditsByContract(address contractAddress)
        external view returns (uint256[] memory)
    {
        return _contractAudits[contractAddress];
    }

    function getAuditsByAuditor(address auditor)
        external view returns (uint256[] memory)
    {
        return _auditorAudits[auditor];
    }

    function totalAudits() external view returns (uint256) {
        return _auditIdCounter;
    }

    /**
     * @notice Verify a finding is in the Merkle tree
     * @param auditId   The audit record to check against
     * @param leaf      keccak256 of the finding JSON
     * @param proof     Merkle proof path
     */
    function verifyFinding(
        uint256 auditId,
        bytes32 leaf,
        bytes32[] calldata proof
    ) external view returns (bool) {
        bytes32 root = _audits[auditId].merkleRoot;
        bytes32 computedHash = leaf;
        for (uint256 i = 0; i < proof.length; i++) {
            bytes32 proofElement = proof[i];
            if (computedHash <= proofElement) {
                computedHash = keccak256(abi.encodePacked(computedHash, proofElement));
            } else {
                computedHash = keccak256(abi.encodePacked(proofElement, computedHash));
            }
        }
        return computedHash == root;
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    function revokeAudit(uint256 auditId, string calldata reason) external onlyOwner {
        require(auditId > 0 && auditId <= _auditIdCounter, "AuditRegistry: invalid auditId");
        _audits[auditId].revoked = true;
        emit AuditRevoked(auditId, msg.sender, reason);
    }
}
