// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AtlasGoPOAP
 * @notice ERC-721 POAP NFT contract for Atlas Go on Flow EVM.
 *         Each token represents a claimed real-world location visit.
 *         Minting is gasless via Privy-sponsored transactions (relayer calls mint).
 *         One claim per (wallet, locationId) — enforced on-chain.
 */
contract AtlasGoPOAP is ERC721URIStorage, Ownable {
    uint256 private _nextTokenId;

    // Address authorized to call mint (Privy relayer / backend)
    address public minter;

    // locationId => (wallet => tokenId). 0 means unclaimed.
    mapping(bytes32 => mapping(address => uint256)) public claimRecord;

    // tokenId => locationId
    mapping(uint256 => bytes32) public tokenLocation;

    // tokenId => boost metadata
    struct BoostMeta {
        uint16  boostPercentage;   // e.g. 250 for +250% APY
        uint32  boostDurationHours;
        uint64  claimedAt;         // Unix timestamp
        uint64  expiresAt;         // Unix timestamp
    }
    mapping(uint256 => BoostMeta) public boostMeta;

    event POAPClaimed(
        address indexed claimer,
        uint256 indexed tokenId,
        bytes32 indexed locationId,
        uint16  boostPercentage,
        uint64  expiresAt
    );

    modifier onlyMinter() {
        require(msg.sender == minter || msg.sender == owner(), "Not authorized minter");
        _;
    }

    constructor(address _minter) ERC721("Atlas Go POAP", "AGPOAP") Ownable(msg.sender) {
        minter = _minter;
    }

    // ── Admin ──────────────────────────────────────────────────────────────────

    function setMinter(address _minter) external onlyOwner {
        minter = _minter;
    }

    // ── Minting ────────────────────────────────────────────────────────────────

    /**
     * @notice Mint a POAP for a claimer. Called by the Privy relayer (gasless).
     * @param claimer           The user's wallet address
     * @param locationId        Unique location identifier (bytes32 hash of location string ID)
     * @param tokenURI_         IPFS URI for POAP metadata
     * @param boostPercentage   APY boost percentage (e.g. 250)
     * @param boostDurationHours Duration of boost in hours
     */
    function mintPOAP(
        address claimer,
        bytes32 locationId,
        string calldata tokenURI_,
        uint16 boostPercentage,
        uint32 boostDurationHours
    ) external onlyMinter returns (uint256) {
        require(claimer != address(0), "Invalid claimer");
        require(boostPercentage >= 200 && boostPercentage <= 500, "Boost out of range");
        require(boostDurationHours >= 1 && boostDurationHours <= 168, "Duration out of range");

        // One claim per location per wallet
        require(claimRecord[locationId][claimer] == 0, "Already claimed this location");

        uint256 newTokenId = ++_nextTokenId;

        uint64 claimedAt  = uint64(block.timestamp);
        uint64 expiresAt  = claimedAt + uint64(boostDurationHours) * 3600;

        _safeMint(claimer, newTokenId);
        _setTokenURI(newTokenId, tokenURI_);

        claimRecord[locationId][claimer] = newTokenId;
        tokenLocation[newTokenId] = locationId;
        boostMeta[newTokenId] = BoostMeta({
            boostPercentage:   boostPercentage,
            boostDurationHours: boostDurationHours,
            claimedAt:         claimedAt,
            expiresAt:         expiresAt
        });

        emit POAPClaimed(claimer, newTokenId, locationId, boostPercentage, expiresAt);

        return newTokenId;
    }

    // ── Views ──────────────────────────────────────────────────────────────────

    function hasClaimed(bytes32 locationId, address claimer) external view returns (bool) {
        return claimRecord[locationId][claimer] != 0;
    }

    function getTokenMeta(uint256 tokenId) external view returns (BoostMeta memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return boostMeta[tokenId];
    }

    function totalSupply() external view returns (uint256) {
        return _nextTokenId;
    }
}
