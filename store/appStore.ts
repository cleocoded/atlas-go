import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type {
  AppState,
  CollectedPOAP,
  Location,
  ActivityItem,
  CollectionFilter,
  Screen,
  AvatarType,
  ActiveBoost,
  ToastMessage,
} from '@/types'

// ── Seed / mock data ──────────────────────────────────────────────────────────

const MOCK_LOCATIONS: Location[] = [
  {
    id: 'loc-paypal-sf',
    name: 'PayPal Innovation Lab',
    partnerName: 'PayPal',
    partnerLogo: '/logos/paypal.svg',
    coordinates: { lat: 37.7749, lng: -122.4194 },
    poapArtwork: '/poap/paypal-sf.svg',
    poapArtTitle: 'Golden Gate Sunrise',
    boostPercentage: 300,
    boostDurationHours: 72,
    rarity: 'uncommon',
    isActive: true,
  },
  {
    id: 'loc-flow-hq',
    name: 'Flow Foundation HQ',
    partnerName: 'Flow',
    partnerLogo: '/logos/flow.svg',
    coordinates: { lat: 37.7851, lng: -122.3985 },
    poapArtwork: '/poap/flow-hq.svg',
    poapArtTitle: 'Bay Bridge Blaze',
    boostPercentage: 450,
    boostDurationHours: 48,
    rarity: 'legendary',
    isActive: true,
  },
  {
    id: 'loc-paypal-downtown',
    name: 'PayPal Downtown',
    partnerName: 'PayPal',
    partnerLogo: '/logos/paypal.svg',
    coordinates: { lat: 37.7879, lng: -122.4075 },
    poapArtwork: '/poap/paypal-downtown.svg',
    poapArtTitle: null,
    boostPercentage: 220,
    boostDurationHours: 24,
    rarity: 'common',
    isActive: true,
  },
  {
    id: 'loc-flow-events',
    name: 'Flow Hackathon Space',
    partnerName: 'Flow',
    partnerLogo: '/logos/flow.svg',
    coordinates: { lat: 37.7694, lng: -122.4862 },
    poapArtwork: '/poap/flow-events.svg',
    poapArtTitle: 'Sunset District Badge',
    boostPercentage: 380,
    boostDurationHours: 96,
    rarity: 'rare',
    isActive: true,
  },
]

// ── Initial state ─────────────────────────────────────────────────────────────

const initialState: AppState = {
  user: {
    username: 'Explorer',
    avatar: 'none',
    walletAddress: null,
    totalPOAPsClaimed: 0,
    totalYieldEarned: 0,
    locationsVisited: 0,
  },
  wallet: {
    isConnected: false,
    address: null,
    balance: 0,
    baseAPY: 3.0,
    activeBoost: null,
    accruedYield: 0,
    yieldRatePerSecond: 0,
  },
  locations: MOCK_LOCATIONS,
  collectedPOAPs: [],
  activity: [],
  selectedFilter: 'active',
  gpsEnabled: false,
  currentPosition: null,
  menuOpen: false,
  currentScreen: 'map',
  activeClaimLocationId: null,
  activePoapDetailId: null,
  toast: null,
}

// ── Store actions interface ───────────────────────────────────────────────────

interface AppActions {
  // Navigation
  navigate: (screen: Screen) => void
  goBack: () => void

  // Menu
  toggleMenu: () => void
  closeMenu: () => void

  // GPS
  setGpsEnabled: (enabled: boolean) => void
  setCurrentPosition: (pos: { lat: number; lng: number } | null) => void

  // Claim flow
  openClaim: (locationId: string) => void
  closeClaim: () => void
  claimPOAP: (locationId: string) => Promise<void>

  // Collection
  setFilter: (filter: CollectionFilter) => void
  openPoapDetail: (poapId: string) => void
  hidePOAP: (poapId: string) => void
  unhidePOAP: (poapId: string) => void

  // Wallet
  connectWallet: (address: string) => void
  disconnectWallet: () => void
  deposit: (amount: number) => void
  withdraw: (amount: number) => void
  tickYield: () => void
  checkBoostExpiry: () => void
  setBoostFromChain: (data: { balance: number; activeBoost: ActiveBoost | null; effectiveAPY: number }) => void

  // Profile
  setUsername: (name: string) => void
  setAvatar: (avatar: AvatarType) => void

  // Toast
  showToast: (text: string, type?: ToastMessage['type']) => void
  clearToast: () => void

  // Activity
  addActivity: (item: Omit<ActivityItem, 'id' | 'timestamp'>) => void

  // Locations
  loadLocations: () => Promise<void>
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useAppStore = create<AppState & AppActions>()(
  persist(
  immer((set, get) => ({
    ...initialState,

    // ── Navigation ──────────────────────────────────────────────────────────

    navigate: (screen) =>
      set((s) => {
        s.currentScreen = screen
        s.menuOpen = false
      }),

    goBack: () =>
      set((s) => {
        s.currentScreen = 'map'
        s.activeClaimLocationId = null
        s.activePoapDetailId = null
      }),

    // ── Menu ────────────────────────────────────────────────────────────────

    toggleMenu: () => set((s) => { s.menuOpen = !s.menuOpen }),
    closeMenu:  () => set((s) => { s.menuOpen = false }),

    // ── GPS ─────────────────────────────────────────────────────────────────

    setGpsEnabled:      (enabled) => set((s) => { s.gpsEnabled = enabled }),
    setCurrentPosition: (pos)     => set((s) => { s.currentPosition = pos }),

    // ── Claim flow ──────────────────────────────────────────────────────────

    openClaim: (locationId) =>
      set((s) => {
        s.activeClaimLocationId = locationId
        s.currentScreen = 'claim'
        s.menuOpen = false
      }),

    closeClaim: () =>
      set((s) => {
        s.activeClaimLocationId = null
        s.currentScreen = 'map'
      }),

    claimPOAP: async (locationId) => {
      const state = get()
      const location = state.locations.find((l) => l.id === locationId)
      if (!location) return

      const now = new Date()
      const expiresAt = new Date(
        now.getTime() + location.boostDurationHours * 3600 * 1000
      )

      // Call gasless relay API (handles on-chain mint when contracts are deployed;
      // returns mock success in dev mode when contracts are not yet set up)
      const walletAddress = state.wallet.address
      if (walletAddress) {
        const res = await fetch('/api/claim', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletAddress, locationId }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Claim failed')
      } else {
        // No wallet connected — Privy will create one silently; delay for UX
        await new Promise((r) => setTimeout(r, 2000))
      }

      const newPOAP: CollectedPOAP = {
        id: `poap-${Date.now()}`,
        locationId,
        locationName: location.name,
        partnerName: location.partnerName,
        artwork: location.poapArtwork,
        artTitle: location.poapArtTitle,
        claimedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        boostPercentage: location.boostPercentage,
        boostDurationHours: location.boostDurationHours,
        rarity: location.rarity,
        depositAtClaim: state.wallet.balance,
        expectedEarnings:
          (state.wallet.balance *
            (location.boostPercentage / 100) *
            (location.boostDurationHours / 8760)),
        isActive: true,
        isHidden: false,
      }

      const newBoost: ActiveBoost = {
        poapId: newPOAP.id,
        boostPercentage: location.boostPercentage,
        effectiveAPY: state.wallet.baseAPY + location.boostPercentage,
        startedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        remainingSeconds: location.boostDurationHours * 3600,
      }

      // Calculate yield rate per second at boosted APY
      const effectiveApy = state.wallet.baseAPY + location.boostPercentage
      const yieldPerSecond = (state.wallet.balance * (effectiveApy / 100)) / 31536000

      set((s) => {
        // Expire previous active POAP if any
        if (s.wallet.activeBoost) {
          const oldPoapIdx = s.collectedPOAPs.findIndex(
            (p) => p.id === s.wallet.activeBoost?.poapId
          )
          if (oldPoapIdx !== -1) s.collectedPOAPs[oldPoapIdx].isActive = false
        }

        s.collectedPOAPs.unshift(newPOAP)
        s.wallet.activeBoost = newBoost
        s.wallet.yieldRatePerSecond = yieldPerSecond
        s.user.totalPOAPsClaimed += 1
        s.user.locationsVisited += 1
        s.currentScreen = 'map'
        s.activeClaimLocationId = null
      })

      get().addActivity({ type: 'claim', description: `Claimed "${location.poapArtTitle ?? location.name}" POAP`, amount: null })
      get().addActivity({ type: 'boost_activated', description: `Boost activated: +${location.boostPercentage}% APY for ${location.boostDurationHours}h`, amount: null })
      get().showToast(`Claimed! +${location.boostPercentage}% APY boost activated`, 'success')
    },

    // ── Collection ──────────────────────────────────────────────────────────

    setFilter: (filter) => set((s) => { s.selectedFilter = filter }),

    openPoapDetail: (poapId) =>
      set((s) => {
        s.activePoapDetailId = poapId
        s.currentScreen = 'poap-detail'
      }),

    hidePOAP:   (poapId) => set((s) => {
      const p = s.collectedPOAPs.find((x) => x.id === poapId)
      if (p) p.isHidden = true
    }),
    unhidePOAP: (poapId) => set((s) => {
      const p = s.collectedPOAPs.find((x) => x.id === poapId)
      if (p) p.isHidden = false
    }),

    // ── Wallet ──────────────────────────────────────────────────────────────

    connectWallet: (address) =>
      set((s) => {
        s.wallet.isConnected = true
        s.wallet.address = address
        s.user.walletAddress = address
      }),

    disconnectWallet: () =>
      set((s) => {
        s.wallet.isConnected = false
        s.wallet.address = null
        s.user.walletAddress = null
        s.wallet.balance = 0
        s.wallet.activeBoost = null
        s.wallet.accruedYield = 0
        s.wallet.yieldRatePerSecond = 0
      }),

    deposit: (amount) => {
      set((s) => {
        s.wallet.balance += amount
        // Recalculate yield rate
        const effectiveApy = s.wallet.baseAPY + (s.wallet.activeBoost?.boostPercentage ?? 0)
        s.wallet.yieldRatePerSecond = (s.wallet.balance * (effectiveApy / 100)) / 31536000
      })
      get().addActivity({ type: 'deposit', description: `Deposited ${amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`, amount })
    },

    withdraw: (amount) => {
      set((s) => {
        s.wallet.balance = Math.max(0, s.wallet.balance - amount)
        const effectiveApy = s.wallet.baseAPY + (s.wallet.activeBoost?.boostPercentage ?? 0)
        s.wallet.yieldRatePerSecond = (s.wallet.balance * (effectiveApy / 100)) / 31536000
      })
      get().addActivity({ type: 'withdraw', description: `Withdrew ${amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`, amount })
    },

    tickYield: () =>
      set((s) => {
        if (s.wallet.yieldRatePerSecond > 0) {
          const tick = s.wallet.yieldRatePerSecond / 10 // called every 100ms
          s.wallet.accruedYield += tick
          s.user.totalYieldEarned += tick
          // Update boost countdown
          if (s.wallet.activeBoost) {
            s.wallet.activeBoost.remainingSeconds = Math.max(
              0,
              s.wallet.activeBoost.remainingSeconds - 0.1
            )
          }
        }
      }),

    checkBoostExpiry: () => {
      const state = get()
      if (!state.wallet.activeBoost) return
      const now = Date.now()
      const expiry = new Date(state.wallet.activeBoost.expiresAt).getTime()
      if (now >= expiry) {
        set((s) => {
          if (s.wallet.activeBoost) {
            const poapIdx = s.collectedPOAPs.findIndex(
              (p) => p.id === s.wallet.activeBoost?.poapId
            )
            if (poapIdx !== -1) s.collectedPOAPs[poapIdx].isActive = false
          }
          s.wallet.activeBoost = null
          s.wallet.yieldRatePerSecond = (s.wallet.balance * (s.wallet.baseAPY / 100)) / 31536000
        })
        get().addActivity({ type: 'boost_expired', description: 'Yield boost expired', amount: null })
        get().showToast('Your boost has expired. Explore for more!', 'info')
      }
    },

    setBoostFromChain: ({ balance, activeBoost, effectiveAPY }) =>
      set((s) => {
        // Only update balance if meaningful change (avoid overriding optimistic UI mid-tx)
        const diff = Math.abs(s.wallet.balance - balance)
        if (diff > 0.01) s.wallet.balance = balance

        s.wallet.activeBoost = activeBoost

        // Recalculate yield rate from chain's effective APY
        s.wallet.yieldRatePerSecond = (balance * (effectiveAPY / 100)) / 31536000
      }),

    // ── Profile ─────────────────────────────────────────────────────────────

    setUsername: (name) => set((s) => { s.user.username = name }),
    setAvatar:   (avatar) => set((s) => { s.user.avatar = avatar }),

    // ── Toast ────────────────────────────────────────────────────────────────

    showToast: (text, type = 'info') =>
      set((s) => {
        s.toast = { id: String(Date.now()), text, type }
      }),

    clearToast: () => set((s) => { s.toast = null }),

    // ── Activity ─────────────────────────────────────────────────────────────

    addActivity: (item) =>
      set((s) => {
        s.activity.unshift({
          ...item,
          id: `act-${Date.now()}-${Math.random()}`,
          timestamp: new Date().toISOString(),
        })
        if (s.activity.length > 20) s.activity = s.activity.slice(0, 20)
      }),

    // ── Locations ────────────────────────────────────────────────────────────

    loadLocations: async () => {
      try {
        const res = await fetch('/api/locations')
        if (!res.ok) return
        const locations: Location[] = await res.json()
        set((s) => { s.locations = locations })
      } catch {
        // Offline / API error — keep seed data
      }
    },
  })),
  {
    name: 'atlas-go-user',
    partialize: (state) => ({
      user: {
        avatar: state.user.avatar,
        username: state.user.username,
      },
    }),
    merge: (persisted, current) => ({
      ...current,
      user: { ...(current as AppState).user, ...(persisted as any)?.user },
    }),
  },
  )
)

// ── Selectors ─────────────────────────────────────────────────────────────────

export const selectClaimedLocationIds = (state: AppState) =>
  new Set(state.collectedPOAPs.map((p) => p.locationId))

export const selectFilteredPOAPs = (state: AppState) => {
  const { collectedPOAPs, selectedFilter } = state
  const now = Date.now()
  return collectedPOAPs.filter((p) => {
    const active = new Date(p.expiresAt).getTime() > now
    if (selectedFilter === 'active') return active && !p.isHidden
    if (selectedFilter === 'expired') return !active && !p.isHidden
    if (selectedFilter === 'hidden') return p.isHidden
    return true
  })
}

export const selectFilterCounts = (state: AppState) => {
  const now = Date.now()
  return {
    active:  state.collectedPOAPs.filter((p) => new Date(p.expiresAt).getTime() > now && !p.isHidden).length,
    expired: state.collectedPOAPs.filter((p) => new Date(p.expiresAt).getTime() <= now && !p.isHidden).length,
    hidden:  state.collectedPOAPs.filter((p) => p.isHidden).length,
  }
}
