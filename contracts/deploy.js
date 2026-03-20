// Deploy AtlasGoEmblem and YieldBoost to Flow EVM
// Run from contracts/: DEPLOYER_PRIVATE_KEY=0x... npx hardhat run deploy.js --network flowTestnet

const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  // Replace with actual values before deploying
  const MINTER_ADDRESS        = deployer.address; // Update to Privy relayer address
  const STGUSD_ADDRESS        = "0x0000000000000000000000000000000000000000"; // stgUSDC on Flow EVM
  const LENDING_ADAPTER       = "0x0000000000000000000000000000000000000000"; // More Markets adapter

  // Deploy Emblem contract
  const Emblem = await hre.ethers.getContractFactory("AtlasGoEmblem");
  const emblem = await Emblem.deploy(MINTER_ADDRESS);
  await emblem.waitForDeployment();
  console.log("AtlasGoEmblem deployed to:", await emblem.getAddress());

  // Deploy YieldBoost contract
  const YieldBoost = await hre.ethers.getContractFactory("YieldBoost");
  const yieldBoost = await YieldBoost.deploy(STGUSD_ADDRESS, MINTER_ADDRESS, LENDING_ADAPTER);
  await yieldBoost.waitForDeployment();
  console.log("YieldBoost deployed to:", await yieldBoost.getAddress());

  console.log("\nAdd to .env:");
  console.log(`NEXT_PUBLIC_EMBLEM_CONTRACT=${await emblem.getAddress()}`);
  console.log(`NEXT_PUBLIC_YIELD_CONTRACT=${await yieldBoost.getAddress()}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
