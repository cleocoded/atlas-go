// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AtlasGoEmblem
 * @notice ERC-721 Emblem NFT for Atlas Go on Flow EVM.
 *         Uses Cadence Arch commit-reveal for on-chain rarity randomness.
 *
 *         Claim flow (two transactions):
 *           1. commitClaim(user, locationId) — records Flow block height
 *           2. revealClaim(user, locationId, tokenURI) — rolls rarity via getRandomSource()
 *
 *         Five rarity tiers: Special(5%), Rare(10%), Epic(50%), Legendary(200%), Mythical(500%)
 *         Each location has exactly 1 Mythical. Once claimed, rolls downgrade to Legendary.
 */
contract AtlasGoEmblem is ERC721URIStorage, Ownable {

    // ── Cadence Arch precompile ──────────────────────────────────────────────
    address constant CADENCE_ARCH = 0x0000000000000000000000010000000000000001;

    // ── Rarity tiers ─────────────────────────────────────────────────────────
    enum Rarity { Special, Rare, Epic, Legendary, Mythical }

    // Rarity config: boost APY (total effective, in whole %), deposit cap (USD, 6 decimals)
    struct RarityConfig {
        uint16 boostAPY;       // e.g. 500 = 500%
        uint256 depositCap;    // in stgUSDC (6 decimals), e.g. 1000e6 = $1,000
    }

    // ── State ────────────────────────────────────────────────────────────────
    uint256 private _nextTokenId;
    address public minter;

    // Commit-reveal: user+location => committed Flow block height (0 = no commit)
    mapping(bytes32 => uint64) public commits;

    // locationId => user => tokenId (0 = unclaimed)
    mapping(bytes32 => mapping(address => uint256)) public claimRecord;

    // locationId => whether the 1-of-1 Mythical has been claimed
    mapping(bytes32 => bool) public mythicalClaimed;

    // tokenId => metadata
    struct EmblemMeta {
        bytes32 locationId;
        Rarity  rarity;
        uint16  boostAPY;      // total effective APY %
        uint256 depositCap;    // max deposit earning boosted rate
        uint64  claimedAt;
        uint64  expiresAt;     // claimedAt + 72 hours
    }
    mapping(uint256 => EmblemMeta) public emblemMeta;

    // Rarity configs (set in constructor)
    mapping(Rarity => RarityConfig) public rarityConfigs;

    // ── Events ───────────────────────────────────────────────────────────────
    event ClaimCommitted(address indexed user, bytes32 indexed locationId, uint64 flowBlockHeight);
    event EmblemClaimed(
        address indexed claimer,
        uint256 indexed tokenId,
        bytes32 indexed locationId,
        uint8   rarity,
        uint16  boostAPY,
        uint256 depositCap,
        uint64  expiresAt
    );

    // ── Modifiers ────────────────────────────────────────────────────────────
    modifier onlyMinter() {
        require(msg.sender == minter || msg.sender == owner(), "Not authorized");
        _;
    }

    // ── Constructor ──────────────────────────────────────────────────────────
    constructor(address _minter) ERC721("Atlas Go Emblem", "AGEMBLEM") Ownable(msg.sender) {
        minter = _minter;

        // Initialize rarity configs
        rarityConfigs[Rarity.Special]   = RarityConfig({ boostAPY: 5,   depositCap: 10_000e6 });
        rarityConfigs[Rarity.Rare]      = RarityConfig({ boostAPY: 10,  depositCap: 10_000e6 });
        rarityConfigs[Rarity.Epic]      = RarityConfig({ boostAPY: 50,  depositCap: 5_000e6  });
        rarityConfigs[Rarity.Legendary] = RarityConfig({ boostAPY: 200, depositCap: 2_000e6  });
        rarityConfigs[Rarity.Mythical]  = RarityConfig({ boostAPY: 500, depositCap: 1_000e6  });
    }

    // ── Admin ────────────────────────────────────────────────────────────────
    function setMinter(address _minter) external onlyOwner {
        minter = _minter;
    }

    // ── Commit Phase (TX 1) ──────────────────────────────────────────────────

    /**
     * @notice Commit to claim an emblem. Records current Flow block height.
     *         Called by the backend relayer when user taps "Spin to Claim".
     */
    function commitClaim(address user, bytes32 locationId) external onlyMinter {
        require(user != address(0), "Invalid user");
        require(claimRecord[locationId][user] == 0, "Already claimed this location");

        bytes32 commitKey = _commitKey(user, locationId);
        require(commits[commitKey] == 0, "Commit already pending");

        uint64 flowHeight = _flowBlockHeight();
        commits[commitKey] = flowHeight;

        emit ClaimCommitted(user, locationId, flowHeight);
    }

    // ── Reveal Phase (TX 2) ──────────────────────────────────────────────────

    /**
     * @notice Reveal the claim — determines rarity on-chain and mints the emblem.
     *         Must be called at least 1 Flow block after commitClaim.
     */
    function revealClaim(
        address user,
        bytes32 locationId,
        string calldata tokenURI_
    ) external onlyMinter returns (uint256 tokenId, Rarity rarity) {
        bytes32 commitKey = _commitKey(user, locationId);
        uint64 committedHeight = commits[commitKey];
        require(committedHeight > 0, "No commit found");
        require(_flowBlockHeight() > committedHeight, "Wait at least 1 Flow block");

        // Clear commit
        delete commits[commitKey];

        // Enforce one claim per location
        require(claimRecord[locationId][user] == 0, "Already claimed this location");

        // Roll rarity using Cadence Arch randomness
        rarity = _rollRarity(committedHeight, user, locationId);

        // Mint
        tokenId = ++_nextTokenId;
        RarityConfig memory cfg = rarityConfigs[rarity];
        uint64 claimedAt = uint64(block.timestamp);
        uint64 expiresAt = claimedAt + 72 hours;

        _safeMint(user, tokenId);
        _setTokenURI(tokenId, tokenURI_);

        claimRecord[locationId][user] = tokenId;
        emblemMeta[tokenId] = EmblemMeta({
            locationId: locationId,
            rarity:     rarity,
            boostAPY:   cfg.boostAPY,
            depositCap: cfg.depositCap,
            claimedAt:  claimedAt,
            expiresAt:  expiresAt
        });

        emit EmblemClaimed(
            user, tokenId, locationId,
            uint8(rarity), cfg.boostAPY, cfg.depositCap, expiresAt
        );
    }

    // ── Views ────────────────────────────────────────────────────────────────

    function hasClaimed(bytes32 locationId, address user) external view returns (bool) {
        return claimRecord[locationId][user] != 0;
    }

    function hasCommit(address user, bytes32 locationId) external view returns (bool) {
        return commits[_commitKey(user, locationId)] > 0;
    }

    function isMythicalClaimed(bytes32 locationId) external view returns (bool) {
        return mythicalClaimed[locationId];
    }

    function getEmblemMeta(uint256 tokenId) external view returns (EmblemMeta memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return emblemMeta[tokenId];
    }

    function totalSupply() external view returns (uint256) {
        return _nextTokenId;
    }

    // ── Internal: Cadence Arch calls ─────────────────────────────────────────

    function _flowBlockHeight() internal view returns (uint64) {
        (bool ok, bytes memory data) = CADENCE_ARCH.staticcall(
            abi.encodeWithSignature("flowBlockHeight()")
        );
        require(ok, "flowBlockHeight failed");
        return abi.decode(data, (uint64));
    }

    function _getRandomSource(uint64 flowHeight) internal view returns (bytes32) {
        (bool ok, bytes memory data) = CADENCE_ARCH.staticcall(
            abi.encodeWithSignature("getRandomSource(uint64)", flowHeight)
        );
        require(ok, "getRandomSource failed");
        return abi.decode(data, (bytes32));
    }

    // ── Internal: Rarity roll ────────────────────────────────────────────────

    /**
     * @notice Roll rarity using on-chain randomness.
     *         Distribution: Special 55%, Rare 25%, Epic 13%, Legendary 5%, Mythical 2%
     *         Mythical is 1-of-1 per location — downgrades to Legendary if already claimed.
     */
    function _rollRarity(
        uint64 committedHeight,
        address user,
        bytes32 locationId
    ) internal returns (Rarity) {
        bytes32 seed = _getRandomSource(committedHeight);
        uint256 roll = uint256(keccak256(abi.encode(seed, user, locationId))) % 100;

        Rarity result;
        if (roll < 55) {
            result = Rarity.Special;     // 0–54  (55%)
        } else if (roll < 80) {
            result = Rarity.Rare;        // 55–79 (25%)
        } else if (roll < 93) {
            result = Rarity.Epic;        // 80–92 (13%)
        } else if (roll < 98) {
            result = Rarity.Legendary;   // 93–97 (5%)
        } else {
            result = Rarity.Mythical;    // 98–99 (2%)
        }

        // Mythical is 1-of-1 per location
        if (result == Rarity.Mythical) {
            if (mythicalClaimed[locationId]) {
                result = Rarity.Legendary; // downgrade
            } else {
                mythicalClaimed[locationId] = true;
            }
        }

        return result;
    }

    function _commitKey(address user, bytes32 locationId) internal pure returns (bytes32) {
        return keccak256(abi.encode(user, locationId));
    }
}
