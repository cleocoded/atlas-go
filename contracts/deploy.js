// Deploy Atlas Go contracts to Flow EVM Testnet
// Run: DEPLOYER_PRIVATE_KEY=0x... npx hardhat run deploy.js --network flowTestnet

const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const MINTER_ADDRESS = deployer.address; // Update to Privy relayer address in production

  // 1. Deploy MockERC20 (stgUSDC stand-in for testnet)
  const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
  const stgUSDC = await MockERC20.deploy("Stargate USDC", "stgUSDC", 6);
  await stgUSDC.waitForDeployment();
  const stgUSDCAddr = await stgUSDC.getAddress();
  console.log("MockERC20 (stgUSDC) deployed to:", stgUSDCAddr);

  // 2. Deploy MockLending (base 2.5% APY)
  const MockLending = await hre.ethers.getContractFactory("MockLending");
  const lending = await MockLending.deploy(stgUSDCAddr);
  await lending.waitForDeployment();
  const lendingAddr = await lending.getAddress();
  console.log("MockLending deployed to:", lendingAddr);

  // 3. Deploy AtlasGoEmblem (ERC-721 + commit-reveal)
  const Emblem = await hre.ethers.getContractFactory("AtlasGoEmblem");
  const emblem = await Emblem.deploy(MINTER_ADDRESS);
  await emblem.waitForDeployment();
  const emblemAddr = await emblem.getAddress();
  console.log("AtlasGoEmblem deployed to:", emblemAddr);

  // 4. Deploy IncentivePool ($50k boost pool)
  const IncentivePool = await hre.ethers.getContractFactory("IncentivePool");
  const pool = await IncentivePool.deploy(stgUSDCAddr, MINTER_ADDRESS, lendingAddr);
  await pool.waitForDeployment();
  const poolAddr = await pool.getAddress();
  console.log("IncentivePool deployed to:", poolAddr);

  // 5. Mint testnet stgUSDC to deployer for pool funding
  const fundAmount = hre.ethers.parseUnits("50000", 6); // $50k
  await stgUSDC.mint(deployer.address, fundAmount);
  console.log("Minted 50,000 stgUSDC to deployer");

  // 6. Fund the incentive pool
  await stgUSDC.approve(poolAddr, fundAmount);
  await pool.fundPool(fundAmount);
  console.log("Funded IncentivePool with 50,000 stgUSDC");

  // 7. Fund MockLending with yield reserves
  const yieldReserve = hre.ethers.parseUnits("10000", 6); // $10k for yield payouts
  await stgUSDC.mint(deployer.address, yieldReserve);
  await stgUSDC.approve(lendingAddr, yieldReserve);
  await lending.fundYield(yieldReserve);
  console.log("Funded MockLending with 10,000 stgUSDC yield reserve");

  console.log("\n── Add to .env ──────────────────────────────────────────");
  console.log(`NEXT_PUBLIC_STGUSDС_ADDRESS=${stgUSDCAddr}`);
  console.log(`NEXT_PUBLIC_EMBLEM_CONTRACT=${emblemAddr}`);
  console.log(`NEXT_PUBLIC_LENDING_CONTRACT=${lendingAddr}`);
  console.log(`NEXT_PUBLIC_INCENTIVE_POOL_CONTRACT=${poolAddr}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
