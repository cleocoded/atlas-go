const { expect } = require("chai");
const { ethers } = require("hardhat");

// ── Constants ───────────────────────────────────────────────────────────────
const CADENCE_ARCH_ADDR = "0x0000000000000000000000010000000000000001";
const USDC = (n) => ethers.parseUnits(String(n), 6);
const DAY = 86400;
const HOUR = 3600;
const YEAR = 365 * DAY;

// ── Helpers ─────────────────────────────────────────────────────────────────

async function deployMockCadenceArch() {
  const Factory = await ethers.getContractFactory("MockCadenceArch");
  const temp = await Factory.deploy();
  await temp.waitForDeployment();
  const code = await ethers.provider.getCode(await temp.getAddress());
  await ethers.provider.send("hardhat_setCode", [CADENCE_ARCH_ADDR, code]);
  return Factory.attach(CADENCE_ARCH_ADDR);
}

async function setFlowBlockHeight(height) {
  const value = ethers.zeroPadValue(ethers.toBeHex(height), 32);
  await ethers.provider.send("hardhat_setStorageAt", [
    CADENCE_ARCH_ADDR,
    "0x0000000000000000000000000000000000000000000000000000000000000000",
    value,
  ]);
}

function locationId(name) {
  return ethers.keccak256(ethers.toUtf8Bytes(name));
}

function predictRarity(flowHeight, userAddress, locId) {
  const seed = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(["uint64"], [flowHeight])
  );
  const roll =
    BigInt(
      ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["bytes32", "address", "bytes32"],
          [seed, userAddress, locId]
        )
      )
    ) % 100n;

  if (roll < 55n) return 0; // Special
  if (roll < 80n) return 1; // Rare
  if (roll < 93n) return 2; // Epic
  if (roll < 98n) return 3; // Legendary
  return 4; // Mythical
}

function findHeightForRarity(targetRarity, userAddress, locId) {
  for (let h = 1; h <= 5000; h++) {
    if (predictRarity(h, userAddress, locId) === targetRarity) return h;
  }
  throw new Error(`Could not find height for rarity ${targetRarity}`);
}

async function commitAndReveal(emblem, user, locId, uri, height) {
  await setFlowBlockHeight(height);
  await emblem.commitClaim(user, locId);
  await setFlowBlockHeight(height + 1);
  const tx = await emblem.revealClaim(user, locId, uri);
  return tx;
}

async function increaseTime(seconds) {
  await ethers.provider.send("evm_increaseTime", [seconds]);
  await ethers.provider.send("evm_mine", []);
}

// ═════════════════════════════════════════════════════════════════════════════
// Tests
// ═════════════════════════════════════════════════════════════════════════════

describe("MockERC20", function () {
  let token, owner, user1;

  beforeEach(async function () {
    [owner, user1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MockERC20");
    token = await Factory.deploy("Stargate USDC", "stgUSDC", 6);
  });

  it("deploys with correct name, symbol, and decimals", async function () {
    expect(await token.name()).to.equal("Stargate USDC");
    expect(await token.symbol()).to.equal("stgUSDC");
    expect(await token.decimals()).to.equal(6);
  });

  it("mint() creates tokens", async function () {
    await token.mint(user1.address, USDC(1000));
    expect(await token.balanceOf(user1.address)).to.equal(USDC(1000));
  });

  it("transfers work", async function () {
    await token.mint(owner.address, USDC(500));
    await token.transfer(user1.address, USDC(200));
    expect(await token.balanceOf(user1.address)).to.equal(USDC(200));
    expect(await token.balanceOf(owner.address)).to.equal(USDC(300));
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("AtlasGoEmblem", function () {
  let emblem, mockArch, owner, minter, user1, user2;
  const LOC_A = locationId("loc-marina-bay");
  const LOC_B = locationId("loc-merlion");

  beforeEach(async function () {
    [owner, minter, user1, user2] = await ethers.getSigners();
    mockArch = await deployMockCadenceArch();
    const Factory = await ethers.getContractFactory("AtlasGoEmblem");
    emblem = await Factory.deploy(minter.address);
    // Connect as minter for most operations
    emblem = emblem.connect(minter);
  });

  describe("Deployment", function () {
    it("has correct name and symbol", async function () {
      expect(await emblem.name()).to.equal("Atlas Go Emblem");
      expect(await emblem.symbol()).to.equal("AGEMBLEM");
    });

    it("sets minter correctly", async function () {
      expect(await emblem.minter()).to.equal(minter.address);
    });

    it("initializes all 5 rarity configs", async function () {
      const expected = [
        { boostAPY: 5, depositCap: USDC(10000) },
        { boostAPY: 10, depositCap: USDC(10000) },
        { boostAPY: 50, depositCap: USDC(5000) },
        { boostAPY: 200, depositCap: USDC(2000) },
        { boostAPY: 500, depositCap: USDC(1000) },
      ];
      for (let i = 0; i < 5; i++) {
        const cfg = await emblem.rarityConfigs(i);
        expect(cfg.boostAPY).to.equal(expected[i].boostAPY);
        expect(cfg.depositCap).to.equal(expected[i].depositCap);
      }
    });
  });

  describe("Admin", function () {
    it("owner can change minter", async function () {
      await emblem.connect(owner).setMinter(user1.address);
      expect(await emblem.minter()).to.equal(user1.address);
    });

    it("non-owner cannot change minter", async function () {
      await expect(
        emblem.connect(user1).setMinter(user2.address)
      ).to.be.revertedWithCustomError(emblem, "OwnableUnauthorizedAccount");
    });
  });

  describe("Commit Phase", function () {
    it("records flow block height and emits ClaimCommitted", async function () {
      await setFlowBlockHeight(100);
      await expect(emblem.commitClaim(user1.address, LOC_A))
        .to.emit(emblem, "ClaimCommitted")
        .withArgs(user1.address, LOC_A, 100);
    });

    it("reverts for zero address", async function () {
      await setFlowBlockHeight(100);
      await expect(
        emblem.commitClaim(ethers.ZeroAddress, LOC_A)
      ).to.be.revertedWith("Invalid user");
    });

    it("reverts if commit already pending", async function () {
      await setFlowBlockHeight(100);
      await emblem.commitClaim(user1.address, LOC_A);
      await expect(
        emblem.commitClaim(user1.address, LOC_A)
      ).to.be.revertedWith("Commit already pending");
    });

    it("only minter can commit", async function () {
      await setFlowBlockHeight(100);
      await expect(
        emblem.connect(user1).commitClaim(user1.address, LOC_A)
      ).to.be.revertedWith("Not authorized");
    });
  });

  describe("Reveal Phase", function () {
    it("mints NFT with correct owner and URI", async function () {
      await commitAndReveal(
        emblem, user1.address, LOC_A,
        "ipfs://test-uri", 100
      );
      expect(await emblem.ownerOf(1)).to.equal(user1.address);
      expect(await emblem.tokenURI(1)).to.equal("ipfs://test-uri");
    });

    it("emits EmblemClaimed with correct args", async function () {
      const height = 100;
      await setFlowBlockHeight(height);
      await emblem.commitClaim(user1.address, LOC_A);
      await setFlowBlockHeight(height + 1);

      const tx = emblem.revealClaim(user1.address, LOC_A, "ipfs://uri");
      await expect(tx).to.emit(emblem, "EmblemClaimed");
    });

    it("sets correct emblem metadata with 72h expiry", async function () {
      await commitAndReveal(
        emblem, user1.address, LOC_A,
        "ipfs://uri", 100
      );
      const meta = await emblem.getEmblemMeta(1);
      expect(meta.locationId).to.equal(LOC_A);
      expect(meta.expiresAt - meta.claimedAt).to.equal(72 * HOUR);
    });

    it("reverts with no prior commit", async function () {
      await setFlowBlockHeight(101);
      await expect(
        emblem.revealClaim(user1.address, LOC_A, "ipfs://uri")
      ).to.be.revertedWith("No commit found");
    });

    it("reverts if flow block has not advanced", async function () {
      await setFlowBlockHeight(100);
      await emblem.commitClaim(user1.address, LOC_A);
      // Don't advance — still at 100
      await expect(
        emblem.revealClaim(user1.address, LOC_A, "ipfs://uri")
      ).to.be.revertedWith("Wait at least 1 Flow block");
    });

    it("clears commit after reveal (no replay)", async function () {
      await commitAndReveal(
        emblem, user1.address, LOC_A,
        "ipfs://uri", 100
      );
      expect(await emblem.hasCommit(user1.address, LOC_A)).to.equal(false);
    });
  });

  describe("Double-claim prevention", function () {
    it("cannot claim same location twice", async function () {
      await commitAndReveal(
        emblem, user1.address, LOC_A,
        "ipfs://uri-1", 100
      );
      await setFlowBlockHeight(200);
      await expect(
        emblem.commitClaim(user1.address, LOC_A)
      ).to.be.revertedWith("Already claimed this location");
    });

    it("different users can claim the same location", async function () {
      await commitAndReveal(
        emblem, user1.address, LOC_A,
        "ipfs://uri-1", 100
      );
      await commitAndReveal(
        emblem, user2.address, LOC_A,
        "ipfs://uri-2", 200
      );
      expect(await emblem.ownerOf(1)).to.equal(user1.address);
      expect(await emblem.ownerOf(2)).to.equal(user2.address);
    });
  });

  describe("Rarity", function () {
    it("produces correct rarity for deterministic seed", async function () {
      const height = 100;
      const expected = predictRarity(height, user1.address, LOC_A);
      await commitAndReveal(
        emblem, user1.address, LOC_A,
        "ipfs://uri", height
      );
      const meta = await emblem.getEmblemMeta(1);
      expect(meta.rarity).to.equal(expected);
    });

    it("Mythical is 1-of-1: second mythical downgrades to Legendary", async function () {
      const mythicalHeight = findHeightForRarity(4, user1.address, LOC_A);
      await commitAndReveal(
        emblem, user1.address, LOC_A,
        "ipfs://uri-1", mythicalHeight
      );
      const meta1 = await emblem.getEmblemMeta(1);
      expect(meta1.rarity).to.equal(4); // Mythical

      // Second user rolls mythical at same location => downgrade
      const mythicalHeight2 = findHeightForRarity(4, user2.address, LOC_A);
      await commitAndReveal(
        emblem, user2.address, LOC_A,
        "ipfs://uri-2", mythicalHeight2
      );
      const meta2 = await emblem.getEmblemMeta(2);
      expect(meta2.rarity).to.equal(3); // Legendary (downgraded)
    });

    it("Mythical at different locations are independent", async function () {
      const h1 = findHeightForRarity(4, user1.address, LOC_A);
      await commitAndReveal(
        emblem, user1.address, LOC_A,
        "ipfs://uri-1", h1
      );

      const h2 = findHeightForRarity(4, user2.address, LOC_B);
      await commitAndReveal(
        emblem, user2.address, LOC_B,
        "ipfs://uri-2", h2
      );

      expect((await emblem.getEmblemMeta(1)).rarity).to.equal(4);
      expect((await emblem.getEmblemMeta(2)).rarity).to.equal(4);
    });
  });

  describe("Views", function () {
    it("hasClaimed returns true after reveal", async function () {
      expect(await emblem.hasClaimed(LOC_A, user1.address)).to.equal(false);
      await commitAndReveal(
        emblem, user1.address, LOC_A,
        "ipfs://uri", 100
      );
      expect(await emblem.hasClaimed(LOC_A, user1.address)).to.equal(true);
    });

    it("totalSupply increments", async function () {
      expect(await emblem.totalSupply()).to.equal(0);
      await commitAndReveal(
        emblem, user1.address, LOC_A,
        "ipfs://uri", 100
      );
      expect(await emblem.totalSupply()).to.equal(1);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("MockLending", function () {
  let token, lending, owner, user1;

  beforeEach(async function () {
    [owner, user1] = await ethers.getSigners();
    const ERC20 = await ethers.getContractFactory("MockERC20");
    token = await ERC20.deploy("Stargate USDC", "stgUSDC", 6);

    const Lending = await ethers.getContractFactory("MockLending");
    lending = await Lending.deploy(await token.getAddress());

    // Mint tokens to user and owner
    await token.mint(user1.address, USDC(100000));
    await token.mint(owner.address, USDC(100000));

    // User approves lending
    await token.connect(user1).approve(await lending.getAddress(), ethers.MaxUint256);
    // Owner funds yield reserves
    await token.approve(await lending.getAddress(), ethers.MaxUint256);
    await lending.fundYield(USDC(10000));
  });

  describe("Deployment", function () {
    it("sets stgUSDC address and default baseAPYBps", async function () {
      expect(await lending.stgUSDC()).to.equal(await token.getAddress());
      expect(await lending.baseAPYBps()).to.equal(250);
    });
  });

  describe("Admin", function () {
    it("owner can setBaseAPY", async function () {
      await lending.setBaseAPY(500);
      expect(await lending.baseAPYBps()).to.equal(500);
    });

    it("setBaseAPY reverts above 1000 bps", async function () {
      await expect(lending.setBaseAPY(1001)).to.be.revertedWith("Max 10%");
    });

    it("non-owner cannot setBaseAPY", async function () {
      await expect(
        lending.connect(user1).setBaseAPY(500)
      ).to.be.revertedWithCustomError(lending, "OwnableUnauthorizedAccount");
    });
  });

  describe("Deposit / Withdraw", function () {
    it("deposit transfers tokens and updates balance", async function () {
      await lending.connect(user1).deposit(USDC(5000));
      expect(await lending.deposits(user1.address)).to.equal(USDC(5000));
      expect(await lending.totalDeposits()).to.equal(USDC(5000));
    });

    it("deposit reverts on zero amount", async function () {
      await expect(lending.connect(user1).deposit(0)).to.be.revertedWith("Zero amount");
    });

    it("withdraw returns tokens and updates balance", async function () {
      await lending.connect(user1).deposit(USDC(5000));
      await lending.connect(user1).withdraw(USDC(2000));
      expect(await lending.deposits(user1.address)).to.equal(USDC(3000));
    });

    it("withdraw reverts on insufficient balance", async function () {
      await lending.connect(user1).deposit(USDC(1000));
      await expect(
        lending.connect(user1).withdraw(USDC(2000))
      ).to.be.revertedWith("Insufficient balance");
    });
  });

  describe("Yield", function () {
    it("earned() returns 0 immediately after deposit", async function () {
      await lending.connect(user1).deposit(USDC(10000));
      expect(await lending.earned(user1.address)).to.equal(0);
    });

    it("earned() accrues linearly over time", async function () {
      await lending.connect(user1).deposit(USDC(10000));
      await increaseTime(YEAR); // 1 year

      const earned = await lending.earned(user1.address);
      // Expected: 10000 * 250 / 10000 = $250 = 250e6
      expect(earned).to.be.closeTo(USDC(250), USDC(3));
    });

    it("claimYield() transfers accrued yield", async function () {
      await lending.connect(user1).deposit(USDC(10000));
      await increaseTime(YEAR);

      const balBefore = await token.balanceOf(user1.address);
      await lending.connect(user1).claimYield();
      const balAfter = await token.balanceOf(user1.address);

      expect(balAfter - balBefore).to.be.closeTo(USDC(250), USDC(3));
      expect(await lending.earned(user1.address)).to.equal(0);
    });

    it("claimYield() reverts when nothing accrued", async function () {
      await expect(lending.connect(user1).claimYield()).to.be.revertedWith(
        "Nothing to claim"
      );
    });

    it("checkpoint resets on deposit (no double counting)", async function () {
      await lending.connect(user1).deposit(USDC(10000));
      await increaseTime(YEAR / 2);
      // Second deposit triggers checkpoint
      await lending.connect(user1).deposit(USDC(5000));
      await increaseTime(YEAR / 2);

      const earned = await lending.earned(user1.address);
      // First half: 10000 * 2.5% * 0.5 = 125
      // Second half: 15000 * 2.5% * 0.5 = 187.5
      // Total ~ 312.5
      expect(earned).to.be.closeTo(USDC(312.5), USDC(5));
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("IncentivePool", function () {
  let token, lending, pool, owner, minter, user1;

  beforeEach(async function () {
    [owner, minter, user1] = await ethers.getSigners();

    const ERC20 = await ethers.getContractFactory("MockERC20");
    token = await ERC20.deploy("Stargate USDC", "stgUSDC", 6);

    const Lending = await ethers.getContractFactory("MockLending");
    lending = await Lending.deploy(await token.getAddress());

    const Pool = await ethers.getContractFactory("IncentivePool");
    pool = await Pool.deploy(
      await token.getAddress(),
      minter.address,
      await lending.getAddress()
    );

    // Mint and fund
    await token.mint(owner.address, USDC(100000));
    await token.mint(user1.address, USDC(50000));
    await token.approve(await pool.getAddress(), ethers.MaxUint256);
    await pool.fundPool(USDC(50000));

    // User deposits into lending
    await token.connect(user1).approve(await lending.getAddress(), ethers.MaxUint256);
    await lending.connect(user1).deposit(USDC(10000));

    // Connect pool as minter for activateBoost calls
    pool = pool.connect(minter);
  });

  describe("Deployment", function () {
    it("sets stgUSDC, minter, and lendingPool", async function () {
      expect(await pool.stgUSDC()).to.equal(await token.getAddress());
      expect(await pool.minter()).to.equal(minter.address);
    });

    it("initializes all 5 boost configs", async function () {
      const expected = [5, 10, 50, 200, 500];
      for (let i = 0; i < 5; i++) {
        const cfg = await pool.boostConfigs(i);
        expect(cfg.boostAPY).to.equal(expected[i]);
      }
    });
  });

  describe("Admin", function () {
    it("non-minter cannot activateBoost", async function () {
      await expect(
        pool.connect(user1).activateBoost(user1.address, 1, 0)
      ).to.be.revertedWith("Not authorized");
    });
  });

  describe("Boost activation", function () {
    it("activateBoost sets correct params and emits event", async function () {
      await expect(pool.activateBoost(user1.address, 1, 2)) // Epic
        .to.emit(pool, "BoostActivated");

      const boost = await pool.getActiveBoost(user1.address);
      expect(boost.emblemTokenId).to.equal(1);
      expect(boost.rarity).to.equal(2);
      expect(boost.boostAPY).to.equal(50);
      expect(boost.depositCap).to.equal(USDC(5000));
      expect(boost.expiresAt - boost.startedAt).to.equal(72 * HOUR);
    });

    it("reverts for invalid rarity", async function () {
      await expect(
        pool.activateBoost(user1.address, 1, 5)
      ).to.be.revertedWith("Invalid rarity");
    });

    it("replaces existing active boost (emits BoostExpired)", async function () {
      await pool.activateBoost(user1.address, 1, 0); // Special
      await expect(pool.activateBoost(user1.address, 2, 4)) // Mythical
        .to.emit(pool, "BoostExpired")
        .withArgs(user1.address, 1);

      const boost = await pool.getActiveBoost(user1.address);
      expect(boost.emblemTokenId).to.equal(2);
      expect(boost.rarity).to.equal(4); // Mythical
    });

    it("isBoostActive returns true within 72h, false after", async function () {
      await pool.activateBoost(user1.address, 1, 0);
      expect(await pool.isBoostActive(user1.address)).to.equal(true);

      await increaseTime(73 * HOUR);
      expect(await pool.isBoostActive(user1.address)).to.equal(false);
    });

    it("getEffectiveBoostAPY returns 0 after expiry", async function () {
      await pool.activateBoost(user1.address, 1, 3); // Legendary 200%
      expect(await pool.getEffectiveBoostAPY(user1.address)).to.equal(200);

      await increaseTime(73 * HOUR);
      expect(await pool.getEffectiveBoostAPY(user1.address)).to.equal(0);
    });
  });

  describe("Boost yield", function () {
    it("earnedBoostYield returns 0 immediately", async function () {
      await pool.activateBoost(user1.address, 1, 0);
      expect(await pool.earnedBoostYield(user1.address)).to.equal(0);
    });

    it("accrues differential yield over time", async function () {
      // Activate Legendary (200% total, base 2% => differential 198%)
      await pool.activateBoost(user1.address, 1, 3);
      await increaseTime(YEAR);

      const earned = await pool.earnedBoostYield(user1.address);
      // Boost expired after 72h, so only 72h of yield
      // User deposited $10k, cap $2k => capped at $2k
      // diffAPY = 200 - 2 = 198%
      // yield = 2000e6 * 198 * 259200 / (100 * 31536000) ~ $32.56
      expect(earned).to.be.gt(0);
      expect(earned).to.be.closeTo(USDC(32.56), USDC(1));
    });

    it("yield stops accruing after 72h expiry", async function () {
      await pool.activateBoost(user1.address, 1, 3); // Legendary
      await increaseTime(72 * HOUR);
      const yieldAt72h = await pool.earnedBoostYield(user1.address);

      await increaseTime(72 * HOUR); // Another 72h
      const yieldAt144h = await pool.earnedBoostYield(user1.address);

      expect(yieldAt144h).to.equal(yieldAt72h);
    });

    it("claimBoostYield transfers and resets", async function () {
      await pool.activateBoost(user1.address, 1, 2); // Epic 50%
      await increaseTime(24 * HOUR);

      const earned = await pool.earnedBoostYield(user1.address);
      expect(earned).to.be.gt(0);

      const balBefore = await token.balanceOf(user1.address);
      await pool.connect(user1).claimBoostYield();
      const balAfter = await token.balanceOf(user1.address);

      expect(balAfter - balBefore).to.be.closeTo(earned, USDC(0.01));
      expect(await pool.earnedBoostYield(user1.address)).to.equal(0);
    });

    it("claimBoostYield reverts when nothing to claim", async function () {
      await expect(
        pool.connect(user1).claimBoostYield()
      ).to.be.revertedWith("Nothing to claim");
    });

    it("replacing boost settles previous yield", async function () {
      await pool.activateBoost(user1.address, 1, 2); // Epic
      await increaseTime(24 * HOUR);
      const earnedBefore = await pool.earnedBoostYield(user1.address);
      expect(earnedBefore).to.be.gt(0);

      // Replace with new boost — old yield should be settled
      await pool.activateBoost(user1.address, 2, 0); // Special
      const earnedAfter = await pool.earnedBoostYield(user1.address);
      // Should still have the old yield (settled) + 0 from new boost
      expect(earnedAfter).to.be.closeTo(earnedBefore, USDC(0.1));
    });
  });
});
