// ── Core Types ────────────────────────────────────────────────────────────────

export type AvatarType = 'male' | 'female' | 'none'

export type RarityTier = 'special' | 'rare' | 'epic' | 'legendary' | 'mythical'

export type MarkerState = 'out-of-range' | 'in-range' | 'claimed'

export type ClaimState = 'idle' | 'committing' | 'revealing' | 'success' | 'error'

export type CollectionFilter = 'active' | 'expired' | 'hidden'

export type ButtonState = 'default' | 'loading' | 'disabled' | 'success'

export type Screen =
  | 'map'
  | 'claim'
  | 'collection'
  | 'emblem-detail'
  | 'wallet'
  | 'profile'
  | 'avatar-select'
  | 'settings'

export type ActivityType =
  | 'claim'
  | 'deposit'
  | 'withdraw'
  | 'yield_payout'
  | 'boost_activated'
  | 'boost_expired'

// ── Rarity Config ────────────────────────────────────────────────────────────

export interface RarityInfo {
  boostAPY: number      // total effective APY %
  depositCap: number    // max deposit earning boosted rate (USD)
  label: string         // display name
  color: string         // border/badge color hex
}

export const RARITY_CONFIG: Record<RarityTier, RarityInfo> = {
  special:   { boostAPY: 5,   depositCap: 10000, label: 'Special',   color: '#A0A0B8' },
  rare:      { boostAPY: 10,  depositCap: 10000, label: 'Rare',      color: '#00E5A0' },
  epic:      { boostAPY: 50,  depositCap: 5000,  label: 'Epic',      color: '#7B68EE' },
  legendary: { boostAPY: 200, depositCap: 2000,  label: 'Legendary', color: '#FFD700' },
  mythical:  { boostAPY: 500, depositCap: 1000,  label: 'Mythical',  color: '#FF6BA0' },
}

// ── Location ──────────────────────────────────────────────────────────────────

export interface Location {
  id: string
  name: string
  partnerName: string
  partnerLogo: string
  coordinates: { lat: number; lng: number }
  emblemArtwork: string
  emblemArtTitle: string | null
  mythicalClaimed: boolean
  isActive: boolean
}

// ── Emblem ────────────────────────────────────────────────────────────────────

export interface CollectedEmblem {
  id: string
  tokenId: string | null   // on-chain ERC-721 token ID (null in demo/offline mode)
  locationId: string
  locationName: string
  partnerName: string
  artwork: string
  artTitle: string | null
  claimedAt: string       // ISO 8601
  expiresAt: string       // ISO 8601 (claimedAt + 72h)
  boostPercentage: number // total effective APY (5, 10, 50, 200, or 500)
  depositCap: number      // max deposit earning boosted rate
  rarity: RarityTier      // determined by on-chain randomness
  depositAtClaim: number
  expectedEarnings: number
  isActive: boolean       // derived: now < expiresAt
  isHidden: boolean
}

// ── Wallet ────────────────────────────────────────────────────────────────────

export interface ActiveBoost {
  emblemId: string
  rarity: RarityTier
  boostPercentage: number // total effective APY %
  depositCap: number      // max deposit earning boosted rate
  startedAt: string       // ISO 8601
  expiresAt: string       // ISO 8601
  remainingSeconds: number
}

export interface WalletState {
  isConnected: boolean
  address: string | null
  balance: number         // stgUSDC balance in lending pool
  baseAPY: number         // 2.0–3.0 (from MockLending)
  activeBoost: ActiveBoost | null
  accruedYield: number
  yieldRatePerSecond: number
}

// ── User ──────────────────────────────────────────────────────────────────────

export interface UserProfile {
  username: string
  avatar: AvatarType
  walletAddress: string | null
  totalEmblemsClaimed: number
  totalYieldEarned: number
  locationsVisited: number
}

// ── Activity ──────────────────────────────────────────────────────────────────

export interface ActivityItem {
  id: string
  type: ActivityType
  description: string
  timestamp: string // ISO 8601
  amount: number | null
}

// ── App State ─────────────────────────────────────────────────────────────────

export interface AppState {
  user: UserProfile
  wallet: WalletState
  locations: Location[]
  collectedEmblems: CollectedEmblem[]
  activity: ActivityItem[]
  selectedFilter: CollectionFilter
  gpsEnabled: boolean
  currentPosition: { lat: number; lng: number } | null
  menuOpen: boolean
  currentScreen: Screen
  activeClaimLocationId: string | null
  activeEmblemDetailId: string | null
  toast: ToastMessage | null
  hasOnboarded: boolean
}

export interface ToastMessage {
  id: string
  text: string
  type: 'info' | 'success' | 'warning' | 'error'
}

// ── Utility Helpers ───────────────────────────────────────────────────────────

export function getMarkerState(
  locationId: string,
  userPosition: { lat: number; lng: number } | null,
  locationCoords: { lat: number; lng: number },
  claimedLocationIds: Set<string>
): MarkerState {
  if (claimedLocationIds.has(locationId)) return 'claimed'
  if (!userPosition) return 'out-of-range'
  const dist = haversineDistance(userPosition, locationCoords)
  return dist <= 100 ? 'in-range' : 'out-of-range'
}

export function haversineDistance(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371000 // Earth radius in meters
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const sinDLat = Math.sin(dLat / 2)
  const sinDLng = Math.sin(dLng / 2)
  const aVal =
    sinDLat * sinDLat +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      sinDLng *
      sinDLng
  return R * 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1 - aVal))
}

export function formatCurrency(amount: number, decimals = 2): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount)
}

export function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function formatCountdown(seconds: number): string {
  if (seconds <= 0) return '0s'
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
