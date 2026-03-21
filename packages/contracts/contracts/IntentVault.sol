// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract IntentVault is Ownable, ReentrancyGuard {

    enum IntentStatus { PENDING, APPROVED, EXECUTING, EXECUTED, FAILED }

    struct Intent {
        bytes32      nlHash;
        bytes32      specHash;
        string       category;
        address      submitter;
        bytes        userSig;
        IntentStatus status;
        bytes32      executionHash;
        uint256      submittedAt;
        uint256      executedAt;
    }

    uint256 private _intentCounter;
    mapping(uint256 => Intent)    public  intents;
    mapping(address => uint256[]) private _userIntents;
    mapping(address => bool)      public  executors;

    event IntentSubmitted(uint256 indexed intentId, address indexed submitter, bytes32 nlHash, bytes32 specHash, string category, uint256 timestamp);
    event IntentApproved(uint256 indexed intentId, address approvedBy);
    event IntentExecuted(uint256 indexed intentId, bytes32 executionHash, uint256 timestamp);
    event IntentFailed(uint256 indexed intentId, string reason);

    constructor() { executors[msg.sender] = true; }

    modifier onlyExecutor() {
        require(executors[msg.sender] || msg.sender == owner(), "IntentVault: not an executor");
        _;
    }

    function submitIntent(
        bytes32 nlHash,
        bytes32 specHash,
        string  calldata category,
        bytes   calldata userSig
    ) external nonReentrant returns (uint256 intentId) {
        require(nlHash   != bytes32(0), "IntentVault: empty nlHash");
        require(specHash != bytes32(0), "IntentVault: empty specHash");
        require(userSig.length > 0,     "IntentVault: empty signature");

        _intentCounter++;
        intentId = _intentCounter;

        intents[intentId] = Intent({
            nlHash:        nlHash,
            specHash:      specHash,
            category:      category,
            submitter:     msg.sender,
            userSig:       userSig,
            status:        IntentStatus.PENDING,
            executionHash: bytes32(0),
            submittedAt:   block.timestamp,
            executedAt:    0
        });

        _userIntents[msg.sender].push(intentId);
        emit IntentSubmitted(intentId, msg.sender, nlHash, specHash, category, block.timestamp);
    }

    function approveIntent(uint256 intentId) external onlyExecutor {
        require(intents[intentId].status == IntentStatus.PENDING, "IntentVault: not pending");
        intents[intentId].status = IntentStatus.APPROVED;
        emit IntentApproved(intentId, msg.sender);
    }

    function executeIntent(uint256 intentId, bytes32 executionHash) external onlyExecutor {
        Intent storage i = intents[intentId];
        require(i.status == IntentStatus.APPROVED || i.status == IntentStatus.EXECUTING, "IntentVault: not approved");
        i.status        = IntentStatus.EXECUTED;
        i.executionHash = executionHash;
        i.executedAt    = block.timestamp;
        emit IntentExecuted(intentId, executionHash, block.timestamp);
    }

    function failIntent(uint256 intentId, string calldata reason) external onlyExecutor {
        intents[intentId].status = IntentStatus.FAILED;
        emit IntentFailed(intentId, reason);
    }

    function getIntent(uint256 intentId)         external view returns (Intent memory)    { return intents[intentId]; }
    function getUserIntents(address user)         external view returns (uint256[] memory) { return _userIntents[user]; }
    function totalIntents()                       external view returns (uint256)           { return _intentCounter; }
    function addExecutor(address exec)            external onlyOwner { require(exec != address(0), "zero"); executors[exec] = true; }
    function removeExecutor(address exec)         external onlyOwner { executors[exec] = false; }
}
