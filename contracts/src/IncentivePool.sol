// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title IncentivePool
 * @notice Manages the $50k boost incentive pool for Atlas Go.
 *         Separate from base lending yield (MockLending).
 *
 *         When a user claims an emblem, the relayer calls activateBoost()
 *         with the rarity from AtlasGoEmblem. The boost determines the total
 *         effective APY on a capped deposit amount for 72 hours.
 *
 *         Yield above the base lending rate is paid from this pool.
 *         When the pool is depleted, no more boosts can be activated.
 */
contract IncentivePool is Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable stgUSDC;
    address public minter; // relayer

    uint256 public constant BOOST_DURATION = 72 hours;

    // ── Rarity → boost config (mirrors AtlasGoEmblem) ────────────────────────
    struct BoostConfig {
        uint16  boostAPY;    // total effective APY %
        uint256 depositCap;  // max deposit earning boosted rate (6 decimals)
    }

    // rarity enum value (0-4) => config
    mapping(uint8 => BoostConfig) public boostConfigs;

    // ── Active boosts ────────────────────────────────────────────────────────
    struct ActiveBoost {
        uint256 emblemTokenId;
        uint8   rarity;
        uint16  boostAPY;
        uint256 depositCap;
        uint64  startedAt;
        uint64  expiresAt;
    }

    mapping(address => ActiveBoost) public activeBoosts;

    // ── Settled yield tracking ───────────────────────────────────────────────
    // Tracks how much boost yield has been reserved/paid per user per boost
    mapping(address => uint256) public pendingBoostYield;

    // ── Events ───────────────────────────────────────────────────────────────
    event BoostActivated(
        address indexed user,
        uint256 indexed emblemTokenId,
        uint8   rarity,
        uint16  boostAPY,
        uint256 depositCap,
        uint64  expiresAt
    );
    event BoostExpired(address indexed user, uint256 indexed emblemTokenId);
    event BoostYieldClaimed(address indexed user, uint256 amount);
    event PoolFunded(address indexed funder, uint256 amount);

    modifier onlyMinter() {
        require(msg.sender == minter || msg.sender == owner(), "Not authorized");
        _;
    }

    constructor(address _stgUSDC, address _minter) Ownable(msg.sender) {
        stgUSDC = IERC20(_stgUSDC);
        minter = _minter;

        // Initialize boost configs (must match AtlasGoEmblem rarity enum)
        boostConfigs[0] = BoostConfig({ boostAPY: 5,   depositCap: 10_000e6 }); // Special
        boostConfigs[1] = BoostConfig({ boostAPY: 10,  depositCap: 10_000e6 }); // Rare
        boostConfigs[2] = BoostConfig({ boostAPY: 50,  depositCap: 5_000e6  }); // Epic
        boostConfigs[3] = BoostConfig({ boostAPY: 200, depositCap: 2_000e6  }); // Legendary
        boostConfigs[4] = BoostConfig({ boostAPY: 500, depositCap: 1_000e6  }); // Mythical
    }

    // ── Admin ────────────────────────────────────────────────────────────────

    function setMinter(address _minter) external onlyOwner {
        minter = _minter;
    }

    /// @notice Fund the incentive pool with stgUSDC
    function fundPool(uint256 amount) external {
        stgUSDC.safeTransferFrom(msg.sender, address(this), amount);
        emit PoolFunded(msg.sender, amount);
    }

    // ── Boost activation ─────────────────────────────────────────────────────

    /**
     * @notice Activate a yield boost for a user after emblem claim.
     *         Replaces any existing active boost.
     */
    function activateBoost(
        address user,
        uint256 emblemTokenId,
        uint8 rarity
    ) external onlyMinter {
        require(rarity <= 4, "Invalid rarity");
        require(poolBalance() > 0, "Incentive pool depleted");

        // Expire previous boost if active
        ActiveBoost memory existing = activeBoosts[user];
        if (existing.emblemTokenId != 0 && block.timestamp < existing.expiresAt) {
            emit BoostExpired(user, existing.emblemTokenId);
        }

        BoostConfig memory cfg = boostConfigs[rarity];
        uint64 expiresAt = uint64(block.timestamp) + uint64(BOOST_DURATION);

        activeBoosts[user] = ActiveBoost({
            emblemTokenId: emblemTokenId,
            rarity:        rarity,
            boostAPY:      cfg.boostAPY,
            depositCap:    cfg.depositCap,
            startedAt:     uint64(block.timestamp),
            expiresAt:     expiresAt
        });

        emit BoostActivated(user, emblemTokenId, rarity, cfg.boostAPY, cfg.depositCap, expiresAt);
    }

    // ── Views ────────────────────────────────────────────────────────────────

    function getActiveBoost(address user) external view returns (ActiveBoost memory) {
        return activeBoosts[user];
    }

    function isBoostActive(address user) external view returns (bool) {
        ActiveBoost memory b = activeBoosts[user];
        return b.emblemTokenId != 0 && block.timestamp < b.expiresAt;
    }

    function poolBalance() public view returns (uint256) {
        return stgUSDC.balanceOf(address(this));
    }

    /**
     * @notice Calculate the effective APY for a user.
     *         Returns boost APY if active, otherwise 0 (base rate comes from MockLending).
     */
    function getEffectiveBoostAPY(address user) external view returns (uint16) {
        ActiveBoost memory b = activeBoosts[user];
        if (b.emblemTokenId == 0 || block.timestamp >= b.expiresAt) return 0;
        return b.boostAPY;
    }

    /**
     * @notice Get deposit cap for user's active boost. 0 if no boost.
     */
    function getDepositCap(address user) external view returns (uint256) {
        ActiveBoost memory b = activeBoosts[user];
        if (b.emblemTokenId == 0 || block.timestamp >= b.expiresAt) return 0;
        return b.depositCap;
    }
}
