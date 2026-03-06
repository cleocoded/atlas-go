// Deploy AtlasGoPOAP and YieldBoost to Flow EVM
// Run: DEPLOYER_PRIVATE_KEY=0x... npx hardhat run contracts/deploy.js --network flowTestnet

const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  // Replace with actual values before deploying
  const MINTER_ADDRESS        = deployer.address; // Update to Privy relayer address
  const STGUSD_ADDRESS        = "0x0000000000000000000000000000000000000000"; // stgUSDC on Flow EVM
  const LENDING_ADAPTER       = "0x0000000000000000000000000000000000000000"; // More Markets adapter

  // Deploy POAP contract
  const POAP = await hre.ethers.getContractFactory("AtlasGoPOAP");
  const poap = await POAP.deploy(MINTER_ADDRESS);
  await poap.waitForDeployment();
  console.log("AtlasGoPOAP deployed to:", await poap.getAddress());

  // Deploy YieldBoost contract
  const YieldBoost = await hre.ethers.getContractFactory("YieldBoost");
  const yieldBoost = await YieldBoost.deploy(STGUSD_ADDRESS, MINTER_ADDRESS, LENDING_ADAPTER);
  await yieldBoost.waitForDeployment();
  console.log("YieldBoost deployed to:", await yieldBoost.getAddress());

  console.log("\nAdd to .env:");
  console.log(`NEXT_PUBLIC_POAP_CONTRACT=${await poap.getAddress()}`);
  console.log(`NEXT_PUBLIC_YIELD_CONTRACT=${await yieldBoost.getAddress()}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
