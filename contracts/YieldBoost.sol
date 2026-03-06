// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title YieldBoost
 * @notice Manages the stgUSDC deposit pool and yield boost state for Atlas Go.
 *
 * Flow:
 *   1. Users deposit stgUSDC — funds are forwarded to More Markets lending
 *      (via an adapter address set by owner — actual More Markets integration
 *       via their SDK/API on the backend).
 *   2. On POAP claim (called by minter/relayer), the user's active boost is
 *      recorded. Maximum 1 active boost per user at a time.
 *   3. Base APY = 3%. Boost APY is additive. Partnership sponsors fund the
 *      boost subsidy by sending stgUSDC to this contract.
 *   4. Withdrawals are unlocked at any time (no lock-up).
 */
contract YieldBoost is Ownable {
    using SafeERC20 for IERC20;

    // stgUSDC on Flow EVM
    IERC20 public immutable stgUSDC;

    // Address authorized to set boosts (Privy relayer / backend)
    address public minter;

    // More Markets lending adapter (receives deposited funds)
    address public lendingAdapter;

    // User => deposited balance (in stgUSDC wei, 6 decimals)
    mapping(address => uint256) public deposits;

    uint256 public totalDeposits;

    struct ActiveBoost {
        uint256 tokenId;           // POAP token ID that activated this boost
        uint16  boostPercentage;   // e.g. 250
        uint64  startedAt;
        uint64  expiresAt;
    }

    // User => active boost (zero-value struct means no boost)
    mapping(address => ActiveBoost) public activeBoosts;

    // ── Events ─────────────────────────────────────────────────────────────────

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event BoostSet(address indexed user, uint256 indexed tokenId, uint16 boostPercentage, uint64 expiresAt);
    event BoostExpired(address indexed user, uint256 indexed tokenId);

    // ── Modifiers ─────────────────────────────────────────────────────────────

    modifier onlyMinter() {
        require(msg.sender == minter || msg.sender == owner(), "Not authorized");
        _;
    }

    // ── Constructor ───────────────────────────────────────────────────────────

    constructor(address _stgUSDC, address _minter, address _lendingAdapter)
        Ownable(msg.sender)
    {
        stgUSDC        = IERC20(_stgUSDC);
        minter         = _minter;
        lendingAdapter = _lendingAdapter;
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    function setMinter(address _minter) external onlyOwner { minter = _minter; }
    function setLendingAdapter(address _adapter) external onlyOwner { lendingAdapter = _adapter; }

    // ── Deposit / Withdraw ────────────────────────────────────────────────────

    /**
     * @notice Deposit stgUSDC into the yield pool.
     *         User must approve this contract first.
     */
    function deposit(uint256 amount) external {
        require(amount > 0, "Zero amount");
        stgUSDC.safeTransferFrom(msg.sender, address(this), amount);
        deposits[msg.sender] += amount;
        totalDeposits        += amount;

        // Forward to lending adapter for yield generation
        if (lendingAdapter != address(0)) {
            stgUSDC.safeTransfer(lendingAdapter, amount);
        }

        emit Deposited(msg.sender, amount);
    }

    /**
     * @notice Withdraw stgUSDC from the yield pool. No lock-up.
     */
    function withdraw(uint256 amount) external {
        require(amount > 0, "Zero amount");
        require(deposits[msg.sender] >= amount, "Insufficient balance");

        deposits[msg.sender] -= amount;
        totalDeposits        -= amount;

        // Recall from lending adapter
        if (lendingAdapter != address(0)) {
            // In production: call More Markets redeem
            // For now, contract must hold sufficient stgUSDC
        }

        stgUSDC.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    // ── Boost management ─────────────────────────────────────────────────────

    /**
     * @notice Set or replace a user's active yield boost.
     *         Called by the Privy relayer after a successful POAP mint.
     *         Replacing an active boost is allowed — old boost ends immediately.
     */
    function setBoost(
        address user,
        uint256 tokenId,
        uint16  boostPercentage,
        uint32  boostDurationHours
    ) external onlyMinter {
        require(boostPercentage >= 200 && boostPercentage <= 500, "Boost out of range");
        require(boostDurationHours >= 1 && boostDurationHours <= 168, "Duration out of range");

        ActiveBoost memory existing = activeBoosts[user];
        if (existing.tokenId != 0 && block.timestamp < existing.expiresAt) {
            emit BoostExpired(user, existing.tokenId);
        }

        uint64 expiresAt = uint64(block.timestamp) + uint64(boostDurationHours) * 3600;

        activeBoosts[user] = ActiveBoost({
            tokenId:         tokenId,
            boostPercentage: boostPercentage,
            startedAt:       uint64(block.timestamp),
            expiresAt:       expiresAt
        });

        emit BoostSet(user, tokenId, boostPercentage, expiresAt);
    }

    // ── Views ─────────────────────────────────────────────────────────────────

    function getActiveBoost(address user) external view returns (ActiveBoost memory) {
        return activeBoosts[user];
    }

    function isBoostActive(address user) external view returns (bool) {
        ActiveBoost memory b = activeBoosts[user];
        return b.tokenId != 0 && block.timestamp < b.expiresAt;
    }

    function getEffectiveAPY(address user) external view returns (uint256) {
        uint256 baseAPY = 300; // 3.00% expressed as basis points * 100
        ActiveBoost memory b = activeBoosts[user];
        if (b.tokenId == 0 || block.timestamp >= b.expiresAt) return baseAPY;
        return baseAPY + uint256(b.boostPercentage) * 100;
    }

    /**
     * @notice Allow owner to fund boost subsidies
     */
    function fundSubsidy(uint256 amount) external onlyOwner {
        stgUSDC.safeTransferFrom(msg.sender, address(this), amount);
    }
}
