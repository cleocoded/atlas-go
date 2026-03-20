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
  'function mintEmblem(address claimer, bytes32 locationId, string tokenURI, uint16 boostPercentage, uint32 boostDurationHours) returns (uint256)',
  'function hasClaimed(bytes32 locationId, address claimer) view returns (bool)',
  'function totalSupply() view returns (uint256)',
]

export const YIELD_ABI = [
  'function deposits(address) view returns (uint256)',
  'function getActiveBoost(address) view returns (tuple(uint256 tokenId, uint16 boostPercentage, uint64 startedAt, uint64 expiresAt))',
  'function isBoostActive(address) view returns (bool)',
  'function getEffectiveAPY(address) view returns (uint256)',
  'function setBoost(address user, uint256 tokenId, uint16 boostPercentage, uint32 boostDurationHours)',
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

export function getYieldContract(signerOrProvider?: ethers.Signer | ethers.Provider) {
  const addr = process.env.NEXT_PUBLIC_YIELD_CONTRACT
  if (!addr) throw new Error('NEXT_PUBLIC_YIELD_CONTRACT not set')
  return new ethers.Contract(addr, YIELD_ABI, signerOrProvider ?? getProvider())
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
