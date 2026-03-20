// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title AgentMarketplace
 * @notice Agent registration + stake + TEE job lifecycle on Hedera Smart Contract Service.
 * @dev Agents register with an HBAR stake. Jobs are dispatched to Phala TEE and
 *      completed with an attestation hash. HCS trail written by backend for every event.
 *
 * Deployed on: Hedera Testnet (chainId: 296)
 */
contract AgentMarketplace is Ownable, ReentrancyGuard {

    // ── Structs ───────────────────────────────────────────────────────────────

    struct Agent {
        bytes32 agentIdHash;     // keccak256(agentId string)
        address operator;
        string  teeEndpoint;
        string  metadataURI;
        uint256 stakeAmount;     // HBAR in tinybars (18 dec on HSCS)
        uint256 registeredAt;
        bool    active;
        uint256 jobsCompleted;
        uint256 trustScore;
    }

    struct Job {
        uint256 agentTokenId;
        address requester;
        bytes   encryptedPayload;
        bytes32 payloadHash;
        bytes32 findingsHash;
        string  resultCID;
        bytes   teeSignature;
        uint256 createdAt;
        uint256 completedAt;
        JobStatus status;
    }

    enum JobStatus { PENDING, DISPATCHED, COMPLETED, FAILED }

    // ── Constants ─────────────────────────────────────────────────────────────

    uint256 public constant MIN_STAKE = 0.01 ether;   // ~0.01 HBAR on HSCS (tinybars)
    uint256 private _agentCounter;
    uint256 private _jobCounter;

    // ── State ─────────────────────────────────────────────────────────────────

    mapping(uint256 => Agent) private _agents;
    mapping(bytes32 => uint256) private _agentIdHashToToken;
    mapping(uint256 => Job)    private _jobs;
    mapping(address => uint256[]) private _operatorAgents;
    mapping(uint256 => uint256[]) private _agentJobs;

    // ── Events ────────────────────────────────────────────────────────────────

    event AgentRegistered(
        uint256 indexed tokenId,
        bytes32 indexed agentIdHash,
        address indexed operator,
        string  teeEndpoint,
        uint256 stakeAmount,
        uint256 timestamp
    );

    event AgentDeregistered(
        uint256 indexed tokenId,
        address         operator,
        uint256         stakeReturned
    );

    event JobCreated(
        uint256 indexed jobId,
        uint256 indexed agentTokenId,
        address indexed requester,
        bytes32         payloadHash,
        uint256         timestamp
    );

    event JobCompleted(
        uint256 indexed jobId,
        uint256 indexed agentTokenId,
        bytes32         findingsHash,
        string          resultCID,
        uint256         timestamp
    );

    event JobFailed(
        uint256 indexed jobId,
        string          reason
    );

    // ── Constructor ───────────────────────────────────────────────────────────

    constructor() Ownable(msg.sender) {}

    // ── Agent Registration ────────────────────────────────────────────────────

    /**
     * @notice Register an agent with an HBAR stake
     * @param agentIdHash    keccak256 of the off-chain agentId string
     * @param teeEndpoint    HTTPS URL of the agent's Phala TEE endpoint
     * @param metadataURI    ipfs:// URI for agent metadata JSON
     */
    function registerAgent(
        bytes32 agentIdHash,
        string  calldata teeEndpoint,
        string  calldata metadataURI
    ) external payable nonReentrant returns (uint256 tokenId) {
        require(msg.value >= MIN_STAKE,                    "AgentMarketplace: insufficient stake");
        require(agentIdHash != bytes32(0),                 "AgentMarketplace: empty agentIdHash");
        require(_agentIdHashToToken[agentIdHash] == 0,     "AgentMarketplace: already registered");
        require(bytes(teeEndpoint).length > 0,             "AgentMarketplace: empty teeEndpoint");

        _agentCounter++;
        tokenId = _agentCounter;

        _agents[tokenId] = Agent({
            agentIdHash:   agentIdHash,
            operator:      msg.sender,
            teeEndpoint:   teeEndpoint,
            metadataURI:   metadataURI,
            stakeAmount:   msg.value,
            registeredAt:  block.timestamp,
            active:        true,
            jobsCompleted: 0,
            trustScore:    80
        });

        _agentIdHashToToken[agentIdHash] = tokenId;
        _operatorAgents[msg.sender].push(tokenId);

        emit AgentRegistered(
            tokenId, agentIdHash, msg.sender,
            teeEndpoint, msg.value, block.timestamp
        );
    }

    function deregisterAgent(uint256 tokenId) external nonReentrant {
        Agent storage agent = _agents[tokenId];
        require(agent.operator == msg.sender, "AgentMarketplace: not operator");
        require(agent.active,                 "AgentMarketplace: not active");

        agent.active = false;
        uint256 stake = agent.stakeAmount;
        agent.stakeAmount = 0;

        (bool ok, ) = msg.sender.call{ value: stake }("");
        require(ok, "AgentMarketplace: stake return failed");

        emit AgentDeregistered(tokenId, msg.sender, stake);
    }

    // ── Jobs ──────────────────────────────────────────────────────────────────

    function createJob(
        bytes32 agentIdHash,
        address agentOperator,
        bytes   calldata encryptedPayload,
        bytes32 payloadHash
    ) external nonReentrant returns (uint256 jobId) {
        uint256 tokenId = _agentIdHashToToken[agentIdHash];
        require(tokenId > 0,              "AgentMarketplace: agent not found");
        require(_agents[tokenId].active,  "AgentMarketplace: agent not active");
        // agentOperator param validated for frontend compatibility
        require(agentOperator != address(0), "AgentMarketplace: zero operator");

        _jobCounter++;
        jobId = _jobCounter;

        _jobs[jobId] = Job({
            agentTokenId:     tokenId,
            requester:        msg.sender,
            encryptedPayload: encryptedPayload,
            payloadHash:      payloadHash,
            findingsHash:     bytes32(0),
            resultCID:        "",
            teeSignature:     "",
            createdAt:        block.timestamp,
            completedAt:      0,
            status:           JobStatus.PENDING
        });

        _agentJobs[tokenId].push(jobId);

        emit JobCreated(jobId, tokenId, msg.sender, payloadHash, block.timestamp);
    }

    function completeJob(
        uint256 jobId,
        bytes32 findingsHash,
        string  calldata resultCID,
        bytes   calldata teeSignature
    ) external onlyOwner {
        Job storage job = _jobs[jobId];
        require(job.status == JobStatus.PENDING || job.status == JobStatus.DISPATCHED,
            "AgentMarketplace: job not active");

        job.findingsHash   = findingsHash;
        job.resultCID      = resultCID;
        job.teeSignature   = teeSignature;
        job.completedAt    = block.timestamp;
        job.status         = JobStatus.COMPLETED;

        uint256 tokenId = job.agentTokenId;
        _agents[tokenId].jobsCompleted++;

        emit JobCompleted(jobId, tokenId, findingsHash, resultCID, block.timestamp);
    }

    function failJob(uint256 jobId, string calldata reason) external onlyOwner {
        _jobs[jobId].status = JobStatus.FAILED;
        emit JobFailed(jobId, reason);
    }

    // ── Read ──────────────────────────────────────────────────────────────────

    function getAgent(uint256 tokenId) external view returns (Agent memory) {
        return _agents[tokenId];
    }

    function getAgentByIdHash(bytes32 agentIdHash) external view returns (Agent memory, uint256 tokenId) {
        tokenId = _agentIdHashToToken[agentIdHash];
        return (_agents[tokenId], tokenId);
    }

    function getJob(uint256 jobId) external view returns (Job memory) {
        return _jobs[jobId];
    }

    function getOperatorAgents(address operator) external view returns (uint256[] memory) {
        return _operatorAgents[operator];
    }

    function totalAgents() external view returns (uint256) { return _agentCounter; }
    function totalJobs()   external view returns (uint256) { return _jobCounter;   }
}
