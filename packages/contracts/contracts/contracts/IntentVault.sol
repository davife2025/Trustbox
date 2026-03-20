// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title IntentVault
 * @notice Stores and executes cryptographically-signed user intents on HSCS.
 * @dev No Chainlink Automation. Execution is triggered by the backend which
 *      subscribes to the HCS intent topic via Mirror Node streaming API.
 *      When an APPROVED intent is detected, the backend calls executeIntent().
 *
 *      Flow:
 *        1. Backend parses NL → structured spec (Groq)
 *        2. User signs specHash (MetaMask / HashConnect)
 *        3. Backend calls submitIntent() — stores on HSCS + HCS trail
 *        4. Mirror Node subscriber detects APPROVED status
 *        5. Backend calls executeIntent() — writes executionHash + HCS trail
 *
 * Deployed on: Hedera Testnet (chainId: 296)
 */
contract IntentVault is Ownable, ReentrancyGuard {

    // ── Enums + Structs ───────────────────────────────────────────────────────

    enum IntentStatus { PENDING, APPROVED, EXECUTING, EXECUTED, FAILED }

    struct Intent {
        bytes32       nlHash;         // keccak256 of original NL text
        bytes32       specHash;       // keccak256 of parsed spec JSON
        string        category;       // e.g. "travel", "defi", "compute"
        address       submitter;
        bytes         userSig;        // MetaMask / HashConnect sig over specHash
        IntentStatus  status;
        bytes32       executionHash;
        uint256       submittedAt;
        uint256       executedAt;
    }

    // ── State ─────────────────────────────────────────────────────────────────

    uint256 private _intentCounter;

    mapping(uint256 => Intent) public intents;
    mapping(address => uint256[]) private _userIntents;

    /// Addresses authorised to approve + execute (backend operator wallet)
    mapping(address => bool) public executors;

    // ── Events ────────────────────────────────────────────────────────────────

    event IntentSubmitted(
        uint256 indexed intentId,
        address indexed submitter,
        bytes32         nlHash,
        bytes32         specHash,
        string          category,
        uint256         timestamp
    );

    event IntentApproved(
        uint256 indexed intentId,
        address         approvedBy
    );

    event IntentExecuted(
        uint256 indexed intentId,
        bytes32         executionHash,
        uint256         timestamp
    );

    event IntentFailed(
        uint256 indexed intentId,
        string          reason
    );

    // ── Constructor ───────────────────────────────────────────────────────────

    constructor() Ownable(msg.sender) {
        executors[msg.sender] = true;
    }

    // ── Modifiers ─────────────────────────────────────────────────────────────

    modifier onlyExecutor() {
        require(executors[msg.sender] || msg.sender == owner(),
            "IntentVault: not an executor");
        _;
    }

    // ── Submit ────────────────────────────────────────────────────────────────

    /**
     * @notice Submit a signed intent for execution
     * @param nlHash    keccak256 of the original natural language text
     * @param specHash  keccak256 of the parsed JSON spec (what the user signed)
     * @param category  Intent category string
     * @param userSig   User's EIP-191 signature over specHash
     * @return intentId The unique intent ID
     */
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

        emit IntentSubmitted(
            intentId, msg.sender, nlHash, specHash, category, block.timestamp
        );
    }

    // ── Approve + Execute (called by backend executor) ────────────────────────

    function approveIntent(uint256 intentId) external onlyExecutor {
        require(intents[intentId].status == IntentStatus.PENDING,
            "IntentVault: not pending");
        intents[intentId].status = IntentStatus.APPROVED;
        emit IntentApproved(intentId, msg.sender);
    }

    /**
     * @notice Mark an intent as executed. Called by the Mirror Node subscriber
     *         backend after detecting an APPROVED intent and completing execution.
     */
    function executeIntent(
        uint256 intentId,
        bytes32 executionHash
    ) external onlyExecutor {
        Intent storage intent = intents[intentId];
        require(
            intent.status == IntentStatus.APPROVED ||
            intent.status == IntentStatus.EXECUTING,
            "IntentVault: not approved"
        );

        intent.status        = IntentStatus.EXECUTED;
        intent.executionHash = executionHash;
        intent.executedAt    = block.timestamp;

        emit IntentExecuted(intentId, executionHash, block.timestamp);
    }

    function failIntent(uint256 intentId, string calldata reason) external onlyExecutor {
        intents[intentId].status = IntentStatus.FAILED;
        emit IntentFailed(intentId, reason);
    }

    // ── Read ──────────────────────────────────────────────────────────────────

    function getIntent(uint256 intentId) external view returns (Intent memory) {
        return intents[intentId];
    }

    function getUserIntents(address user) external view returns (uint256[] memory) {
        return _userIntents[user];
    }

    function totalIntents() external view returns (uint256) {
        return _intentCounter;
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    function addExecutor(address exec) external onlyOwner {
        require(exec != address(0), "IntentVault: zero address");
        executors[exec] = true;
    }

    function removeExecutor(address exec) external onlyOwner {
        executors[exec] = false;
    }
}
