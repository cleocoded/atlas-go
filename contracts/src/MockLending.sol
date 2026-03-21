// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title MockLending
 * @notice Mimics More Markets lending on Flow EVM Testnet.
 *         Provides a simple 2–3% base APY on stgUSDC deposits.
 *         Yield is funded by the contract owner (no real lending protocol).
 *
 *         In production this would be replaced by actual More Markets integration.
 */
contract MockLending is Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable stgUSDC;

    // Base APY in basis points (250 = 2.50%)
    uint256 public baseAPYBps = 250;

    // User => principal deposited (6 decimals like USDC)
    mapping(address => uint256) public deposits;
    // User => last yield checkpoint timestamp
    mapping(address => uint64) public lastCheckpoint;
    // User => accrued but unclaimed yield
    mapping(address => uint256) public accruedYield;

    uint256 public totalDeposits;

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event YieldClaimed(address indexed user, uint256 amount);

    constructor(address _stgUSDC) Ownable(msg.sender) {
        stgUSDC = IERC20(_stgUSDC);
    }

    // ── Admin ────────────────────────────────────────────────────────────────

    function setBaseAPY(uint256 _bps) external onlyOwner {
        require(_bps <= 1000, "Max 10%");
        baseAPYBps = _bps;
    }

    /// @notice Owner funds the contract so it can pay yield
    function fundYield(uint256 amount) external onlyOwner {
        stgUSDC.safeTransferFrom(msg.sender, address(this), amount);
    }

    // ── Deposit / Withdraw ───────────────────────────────────────────────────

    function deposit(uint256 amount) external {
        require(amount > 0, "Zero amount");
        _checkpoint(msg.sender);
        stgUSDC.safeTransferFrom(msg.sender, address(this), amount);
        deposits[msg.sender] += amount;
        totalDeposits += amount;
        emit Deposited(msg.sender, amount);
    }

    function withdraw(uint256 amount) external {
        require(amount > 0, "Zero amount");
        _checkpoint(msg.sender);
        require(deposits[msg.sender] >= amount, "Insufficient balance");
        deposits[msg.sender] -= amount;
        totalDeposits -= amount;
        stgUSDC.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    /// @notice Claim accrued base yield
    function claimYield() external {
        _checkpoint(msg.sender);
        uint256 amount = accruedYield[msg.sender];
        require(amount > 0, "Nothing to claim");
        uint256 available = stgUSDC.balanceOf(address(this)) - totalDeposits;
        require(amount <= available, "Insufficient yield reserves");
        accruedYield[msg.sender] = 0;
        stgUSDC.safeTransfer(msg.sender, amount);
        emit YieldClaimed(msg.sender, amount);
    }

    // ── Views ────────────────────────────────────────────────────────────────

    function balanceOf(address user) external view returns (uint256) {
        return deposits[user];
    }

    function earned(address user) external view returns (uint256) {
        return accruedYield[user] + _pendingYield(user);
    }

    function baseAPY() external view returns (uint256) {
        return baseAPYBps;
    }

    // ── Internal ─────────────────────────────────────────────────────────────

    function _checkpoint(address user) internal {
        accruedYield[user] += _pendingYield(user);
        lastCheckpoint[user] = uint64(block.timestamp);
    }

    function _pendingYield(address user) internal view returns (uint256) {
        uint64 last = lastCheckpoint[user];
        if (last == 0 || deposits[user] == 0) return 0;
        uint256 elapsed = block.timestamp - last;
        // yield = principal * APY_bps / 10000 * elapsed / 365.25 days
        return (deposits[user] * baseAPYBps * elapsed) / (10000 * 365 days);
    }
}
