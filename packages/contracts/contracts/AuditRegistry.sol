// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract AuditRegistry is Ownable, ReentrancyGuard {

    struct AuditRecord {
        address contractAddress;
        bytes32 reportHash;
        bytes32 merkleRoot;
        string  reportCID;
        address auditor;
        bytes   auditorSig;
        uint256 submittedAt;
        bool    revoked;
    }

    uint256 private _auditIdCounter;
    mapping(uint256 => AuditRecord)   private _audits;
    mapping(address => uint256[])     private _contractAudits;
    mapping(address => uint256[])     private _auditorAudits;

    event AuditSubmitted(uint256 indexed auditId, address indexed contractAddress, address indexed auditor, bytes32 reportHash, bytes32 merkleRoot, string reportCID, uint256 timestamp);
    event AuditRevoked(uint256 indexed auditId, address revokedBy, string reason);

    constructor() {}

    function submitAudit(
        address contractAddress,
        bytes32 reportHash,
        bytes32 merkleRoot,
        string  calldata reportCID,
        bytes   calldata auditorSig
    ) external nonReentrant returns (uint256 auditId) {
        require(contractAddress != address(0), "AuditRegistry: zero address");
        require(reportHash  != bytes32(0),     "AuditRegistry: empty reportHash");
        require(merkleRoot  != bytes32(0),     "AuditRegistry: empty merkleRoot");
        require(bytes(reportCID).length > 0,   "AuditRegistry: empty CID");

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

        emit AuditSubmitted(auditId, contractAddress, msg.sender, reportHash, merkleRoot, reportCID, block.timestamp);
    }

    function getAudit(uint256 auditId) external view returns (AuditRecord memory) {
        require(auditId > 0 && auditId <= _auditIdCounter, "AuditRegistry: invalid auditId");
        return _audits[auditId];
    }

    function getAuditsByContract(address contractAddress) external view returns (uint256[] memory) { return _contractAudits[contractAddress]; }
    function getAuditsByAuditor(address auditor)          external view returns (uint256[] memory) { return _auditorAudits[auditor]; }
    function totalAudits()                                external view returns (uint256)           { return _auditIdCounter; }

    function verifyFinding(uint256 auditId, bytes32 leaf, bytes32[] calldata proof) external view returns (bool) {
        bytes32 hash = leaf;
        for (uint256 i = 0; i < proof.length; i++) {
            bytes32 p = proof[i];
            hash = hash <= p ? keccak256(abi.encodePacked(hash, p)) : keccak256(abi.encodePacked(p, hash));
        }
        return hash == _audits[auditId].merkleRoot;
    }

    function revokeAudit(uint256 auditId, string calldata reason) external onlyOwner {
        require(auditId > 0 && auditId <= _auditIdCounter, "AuditRegistry: invalid auditId");
        _audits[auditId].revoked = true;
        emit AuditRevoked(auditId, msg.sender, reason);
    }
}
