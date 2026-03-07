const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AtlasGoPOAP", function () {
  let poap, owner, minter, user1, user2;

  beforeEach(async () => {
    [owner, minter, user1, user2] = await ethers.getSigners();
    const POAP = await ethers.getContractFactory("AtlasGoPOAP");
    poap = await POAP.deploy(minter.address);
    await poap.waitForDeployment();
  });

  it("deploys with correct name and symbol", async () => {
    expect(await poap.name()).to.equal("Atlas Go POAP");
    expect(await poap.symbol()).to.equal("AGPOAP");
  });

  it("mints a POAP for a claimer", async () => {
    const locationId = ethers.keccak256(ethers.toUtf8Bytes("loc-paypal-sf"));
    await poap.connect(minter).mintPOAP(
      user1.address,
      locationId,
      "ipfs://QmTest/1.json",
      300,
      72
    );
    expect(await poap.totalSupply()).to.equal(1);
    expect(await poap.ownerOf(1)).to.equal(user1.address);
    expect(await poap.hasClaimed(locationId, user1.address)).to.be.true;
  });

  it("prevents double-claiming the same location", async () => {
    const locationId = ethers.keccak256(ethers.toUtf8Bytes("loc-paypal-sf"));
    await poap.connect(minter).mintPOAP(user1.address, locationId, "ipfs://1", 300, 72);
    await expect(
      poap.connect(minter).mintPOAP(user1.address, locationId, "ipfs://2", 300, 72)
    ).to.be.revertedWith("Already claimed this location");
  });

  it("allows different users to claim the same location", async () => {
    const locationId = ethers.keccak256(ethers.toUtf8Bytes("loc-flow-hq"));
    await poap.connect(minter).mintPOAP(user1.address, locationId, "ipfs://1", 450, 48);
    await poap.connect(minter).mintPOAP(user2.address, locationId, "ipfs://2", 450, 48);
    expect(await poap.totalSupply()).to.equal(2);
  });

  it("stores boost metadata correctly", async () => {
    const locationId = ethers.keccak256(ethers.toUtf8Bytes("loc-flow-events"));
    await poap.connect(minter).mintPOAP(user1.address, locationId, "ipfs://1", 380, 96);
    const meta = await poap.getTokenMeta(1);
    expect(meta.boostPercentage).to.equal(380);
    expect(meta.boostDurationHours).to.equal(96);
  });

  it("rejects boost percentage out of range", async () => {
    const locationId = ethers.keccak256(ethers.toUtf8Bytes("loc-test"));
    await expect(
      poap.connect(minter).mintPOAP(user1.address, locationId, "ipfs://1", 100, 24)
    ).to.be.revertedWith("Boost out of range");
    await expect(
      poap.connect(minter).mintPOAP(user1.address, locationId, "ipfs://1", 600, 24)
    ).to.be.revertedWith("Boost out of range");
  });

  it("only minter can mint", async () => {
    const locationId = ethers.keccak256(ethers.toUtf8Bytes("loc-test"));
    await expect(
      poap.connect(user1).mintPOAP(user1.address, locationId, "ipfs://1", 300, 72)
    ).to.be.revertedWith("Not authorized minter");
  });
});

describe("YieldBoost", function () {
  let yieldBoost, mockToken, owner, minter, user1;

  beforeEach(async () => {
    [owner, minter, user1] = await ethers.getSigners();

    // Deploy a simple ERC20 mock for stgUSDC
    const Token = await ethers.getContractFactory("MockERC20");
    mockToken = await Token.deploy("Stargate USDC", "stgUSDC", 6);
    await mockToken.waitForDeployment();

    const YB = await ethers.getContractFactory("YieldBoost");
    yieldBoost = await YB.deploy(
      await mockToken.getAddress(),
      minter.address,
      ethers.ZeroAddress // no lending adapter in tests
    );
    await yieldBoost.waitForDeployment();

    // Fund user1 with 10,000 stgUSDC
    await mockToken.mint(user1.address, ethers.parseUnits("10000", 6));
    await mockToken.connect(user1).approve(await yieldBoost.getAddress(), ethers.MaxUint256);
  });

  it("deposits and tracks balance", async () => {
    await yieldBoost.connect(user1).deposit(ethers.parseUnits("5000", 6));
    expect(await yieldBoost.deposits(user1.address)).to.equal(ethers.parseUnits("5000", 6));
  });

  it("withdraws correctly", async () => {
    await yieldBoost.connect(user1).deposit(ethers.parseUnits("5000", 6));
    await yieldBoost.connect(user1).withdraw(ethers.parseUnits("2000", 6));
    expect(await yieldBoost.deposits(user1.address)).to.equal(ethers.parseUnits("3000", 6));
  });

  it("sets a boost correctly", async () => {
    await yieldBoost.connect(minter).setBoost(user1.address, 1, 300, 72);
    expect(await yieldBoost.isBoostActive(user1.address)).to.be.true;
    const boost = await yieldBoost.getActiveBoost(user1.address);
    expect(boost.boostPercentage).to.equal(300);
  });

  it("replaces existing boost", async () => {
    await yieldBoost.connect(minter).setBoost(user1.address, 1, 300, 72);
    await yieldBoost.connect(minter).setBoost(user1.address, 2, 450, 48);
    const boost = await yieldBoost.getActiveBoost(user1.address);
    expect(boost.tokenId).to.equal(2);
    expect(boost.boostPercentage).to.equal(450);
  });

  it("returns correct effective APY", async () => {
    // Base APY = 300 (3.00% in bp*100)
    expect(await yieldBoost.getEffectiveAPY(user1.address)).to.equal(300);
    await yieldBoost.connect(minter).setBoost(user1.address, 1, 250, 72);
    // 300 + 250*100 = 25300
    expect(await yieldBoost.getEffectiveAPY(user1.address)).to.equal(25300);
  });
});
