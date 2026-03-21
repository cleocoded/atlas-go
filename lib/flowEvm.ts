import { ethers } from 'ethers'

// Flow EVM RPC endpoints
export const FLOW_EVM_MAINNET_RPC = 'https://mainnet.evm.nodes.onflow.org'
export const FLOW_EVM_TESTNET_RPC = 'https://testnet.evm.nodes.onflow.org'

export const FLOW_EVM_CHAIN_ID_MAINNET = 747
export const FLOW_EVM_CHAIN_ID_TESTNET = 545

const RPC_URL =
  process.env.NEXT_PUBLIC_FLOW_EVM_RPC ?? FLOW_EVM_MAINNET_RPC

// Read-only provider (for balance / boost state reads)
export function getProvider(): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(RPC_URL)
}

// Signer for server-side gasless relay
export function getMinterSigner(): ethers.Wallet {
  const pk = process.env.DEPLOYER_PRIVATE_KEY
  if (!pk) throw new Error('DEPLOYER_PRIVATE_KEY not set')
  return new ethers.Wallet(pk, getProvider())
}

// ── Minimal ABIs ──────────────────────────────────────────────────────────────

export const EMBLEM_ABI = [
  'function commitClaim(address claimer, bytes32 locationId)',
  'function revealClaim(address claimer, bytes32 locationId, string metadataUri) returns (uint256 tokenId, uint8 rarity)',
  'function hasClaimed(bytes32 locationId, address claimer) view returns (bool)',
  'function isMythicalClaimed(bytes32 locationId) view returns (bool)',
  'event EmblemClaimed(address indexed claimer, uint256 indexed tokenId, bytes32 indexed locationId, uint8 rarity, uint16 boostAPY, uint256 depositCap, uint64 expiresAt)',
]

export const LENDING_ABI = [
  'function deposits(address) view returns (uint256)',
  'function earned(address) view returns (uint256)',
  'function baseAPY() view returns (uint256)',
  'function deposit(uint256 amount)',
  'function withdraw(uint256 amount)',
]

export const INCENTIVE_POOL_ABI = [
  'function getActiveBoost(address) view returns (tuple(uint256 tokenId, uint8 rarity, uint16 boostBps, uint256 depositCap, uint64 startedAt, uint64 expiresAt))',
  'function isBoostActive(address) view returns (bool)',
  'function getEffectiveBoostAPY(address) view returns (uint16)',
  'function getDepositCap(address) view returns (uint256)',
  'function activateBoost(address user, uint256 tokenId, uint8 rarity)',
  'function poolBalance() view returns (uint256)',
  'function earnedBoostYield(address) view returns (uint256)',
  'function claimBoostYield()',
]

export const STGUSDС_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
]

export function getEmblemContract(signerOrProvider?: ethers.Signer | ethers.Provider) {
  const addr = process.env.NEXT_PUBLIC_EMBLEM_CONTRACT
  if (!addr) throw new Error('NEXT_PUBLIC_EMBLEM_CONTRACT not set')
  return new ethers.Contract(addr, EMBLEM_ABI, signerOrProvider ?? getProvider())
}

export function getLendingContract(signerOrProvider?: ethers.Signer | ethers.Provider) {
  const addr = process.env.NEXT_PUBLIC_LENDING_CONTRACT
  if (!addr) throw new Error('NEXT_PUBLIC_LENDING_CONTRACT not set')
  return new ethers.Contract(addr, LENDING_ABI, signerOrProvider ?? getProvider())
}

export function getIncentivePoolContract(signerOrProvider?: ethers.Signer | ethers.Provider) {
  const addr = process.env.NEXT_PUBLIC_INCENTIVE_POOL_CONTRACT
  if (!addr) throw new Error('NEXT_PUBLIC_INCENTIVE_POOL_CONTRACT not set')
  return new ethers.Contract(addr, INCENTIVE_POOL_ABI, signerOrProvider ?? getProvider())
}

export function getStgUsdcContract(signerOrProvider?: ethers.Signer | ethers.Provider) {
  const addr = process.env.NEXT_PUBLIC_STGUSDС_ADDRESS
  if (!addr) throw new Error('NEXT_PUBLIC_STGUSDС_ADDRESS not set')
  return new ethers.Contract(addr, STGUSDС_ABI, signerOrProvider ?? getProvider())
}

// Convert location string ID → bytes32
export function locationIdToBytes32(id: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(id))
}
