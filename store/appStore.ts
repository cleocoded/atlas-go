import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type {
  AppState,
  CollectedEmblem,
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
    id: 'loc-marina-bay',
    name: 'Marina Bay Sands',
    partnerName: 'PayPal',
    partnerLogo: '/logos/paypal.svg',
    coordinates: { lat: 1.2834, lng: 103.8607 },
    emblemArtwork: '/emblems/emblem-1-transparent.png',
    emblemArtTitle: 'Marina Bay Nights',
    mythicalClaimed: false,
    isActive: true,
  },
  {
    id: 'loc-supertree',
    name: 'Supertree Grove',
    partnerName: 'Flow',
    partnerLogo: '/logos/flow.svg',
    coordinates: { lat: 1.2816, lng: 103.8636 },
    emblemArtwork: '/emblems/emblem-2-transparent.png',
    emblemArtTitle: 'Garden of Light',
    mythicalClaimed: false,
    isActive: true,
  },
  {
    id: 'loc-merlion',
    name: 'Merlion Park',
    partnerName: 'PayPal',
    partnerLogo: '/logos/paypal.svg',
    coordinates: { lat: 1.2868, lng: 103.8545 },
    emblemArtwork: '/emblems/emblem-3-transparent.png',
    emblemArtTitle: 'Guardian of the Bay',
    mythicalClaimed: false,
    isActive: true,
  },
  {
    id: 'loc-cafe',
    name: 'Flow Cafe',
    partnerName: 'Flow',
    partnerLogo: '/logos/flow.svg',
    coordinates: { lat: 1.2850, lng: 103.8570 },
    emblemArtwork: '/emblems/emblem-4-transparent.png',
    emblemArtTitle: 'Cozy Corner',
    mythicalClaimed: false,
    isActive: true,
  },
]

// ── Initial state ─────────────────────────────────────────────────────────────

const initialState: AppState = {
  user: {
    username: 'Explorer',
    avatar: 'none',
    walletAddress: null,
    totalEmblemsClaimed: 0,
    totalYieldEarned: 0,
    locationsVisited: 0,
  },
  wallet: {
    isConnected: false,
    address: null,
    balance: 0,
    baseAPY: 2.5,
    activeBoost: null,
    accruedYield: 0,
    yieldRatePerSecond: 0,
  },
  locations: MOCK_LOCATIONS,
  collectedEmblems: [],
  activity: [],
  selectedFilter: 'active',
  gpsEnabled: false,
  currentPosition: null,
  menuOpen: false,
  currentScreen: 'map',
  activeClaimLocationId: null,
  activeEmblemDetailId: null,
  toast: null,
  hasOnboarded: false,
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
  claimEmblem: (locationId: string, claimResult?: { rarity: string; boostPercentage: number; depositCap: number }) => Promise<{ rarity: string; boostPercentage: number; depositCap: number } | undefined>

  // Collection
  setFilter: (filter: CollectionFilter) => void
  openEmblemDetail: (emblemId: string) => void
  hideEmblem: (emblemId: string) => void
  unhideEmblem: (emblemId: string) => void

  // Wallet
  connectWallet: (address: string) => void
  disconnectWallet: () => void
  deposit: (amount: number) => void
  withdraw: (amount: number) => void
  tickYield: () => void
  checkBoostExpiry: () => void
  setBoostFromChain: (data: { balance: number; activeBoost: ActiveBoost | null }) => void
  setEmblemsFromChain: (emblems: CollectedEmblem[]) => void

  // Profile
  setUsername: (name: string) => void
  setAvatar: (avatar: AvatarType) => void

  // Onboarding
  completeOnboarding: (username: string, avatar: AvatarType) => void

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
        s.activeEmblemDetailId = null
      }),

    // ── Menu ────────────────────────────────────────────────────────────────

    toggleMenu: () => set((s) => { s.menuOpen = !s.menuOpen }),
    closeMenu:  () => set((s) => { s.menuOpen = false }),

    // ── GPS ─────────────────────────────────────────────────────────────────

    setGpsEnabled:      (enabled) => set((s) => { s.gpsEnabled = enabled }),
    setCurrentPosition: (pos)     => set((s) => { s.currentPosition = pos }),

    // ── Claim flow ──────────────────────────────────────────────────────────

    openClaim: (locationId) => {
      console.log('[Store] openClaim called with:', locationId, 'hasOnboarded:', get().hasOnboarded, 'screen before:', get().currentScreen)
      set((s) => {
        s.activeClaimLocationId = locationId
        s.currentScreen = 'claim'
        s.menuOpen = false
      })
      console.log('[Store] openClaim done, screen now:', get().currentScreen)
    },

    closeClaim: () =>
      set((s) => {
        s.activeClaimLocationId = null
        s.currentScreen = 'map'
      }),

    claimEmblem: async (locationId, claimResult) => {
      const state = get()
      const location = state.locations.find((l) => l.id === locationId)
      if (!location) return

      const BOOST_DURATION_HOURS = 72
      const now = new Date()
      const expiresAt = new Date(
        now.getTime() + BOOST_DURATION_HOURS * 3600 * 1000
      )

      // Call gasless relay API (handles on-chain mint when contracts are deployed;
      // returns mock success in dev mode when contracts are not yet set up)
      let apiResult = claimResult
      const walletAddress = state.wallet.address
      if (walletAddress && !apiResult) {
        const res = await fetch('/api/claim', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletAddress, locationId }),
        })
        const data = await res.json()
        if (!res.ok && res.status !== 409) throw new Error(data.error ?? 'Claim failed')
        // 409 = already claimed on-chain — still add to local collection
        apiResult = { rarity: data.rarity, boostPercentage: data.boostPercentage, depositCap: data.depositCap }
      } else if (!walletAddress) {
        // No wallet connected — Privy will create one silently; delay for UX
        await new Promise((r) => setTimeout(r, 2000))
      }

      // Fallback defaults when no API result (e.g. dev/offline mode)
      const rarity = apiResult?.rarity ?? 'special'
      const boostPercentage = apiResult?.boostPercentage ?? 5
      const depositCap = apiResult?.depositCap ?? 10000

      const newEmblem: CollectedEmblem = {
        id: `emblem-${Date.now()}`,
        locationId,
        locationName: location.name,
        partnerName: location.partnerName,
        artwork: location.emblemArtwork,
        artTitle: location.emblemArtTitle,
        claimedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        boostPercentage,
        depositCap,
        rarity: rarity as CollectedEmblem['rarity'],
        depositAtClaim: state.wallet.balance,
        expectedEarnings:
          (Math.min(state.wallet.balance, depositCap) *
            (boostPercentage / 100) *
            (BOOST_DURATION_HOURS / 8760)),
        isActive: true,
        isHidden: false,
      }

      const newBoost: ActiveBoost = {
        emblemId: newEmblem.id,
        rarity: rarity as ActiveBoost['rarity'],
        boostPercentage,
        depositCap,
        startedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        remainingSeconds: BOOST_DURATION_HOURS * 3600,
      }

      // Calculate yield rate per second at boosted APY
      const yieldPerSecond = (Math.min(state.wallet.balance, depositCap) * (boostPercentage / 100)) / 31536000

      set((s) => {
        // Expire previous active emblem if any
        if (s.wallet.activeBoost) {
          const oldEmblemIdx = s.collectedEmblems.findIndex(
            (p) => p.id === s.wallet.activeBoost?.emblemId
          )
          if (oldEmblemIdx !== -1) s.collectedEmblems[oldEmblemIdx].isActive = false
        }

        s.collectedEmblems.unshift(newEmblem)
        s.wallet.activeBoost = newBoost
        s.wallet.yieldRatePerSecond = yieldPerSecond
        s.user.totalEmblemsClaimed += 1
        s.user.locationsVisited += 1
        // Don't navigate here — let ClaimScreen show the rarity reveal first
      })

      get().addActivity({ type: 'claim', description: `Claimed "${location.emblemArtTitle ?? location.name}" emblem`, amount: null })
      get().addActivity({ type: 'boost_activated', description: `Boost activated: +${boostPercentage}% APY for ${BOOST_DURATION_HOURS}h`, amount: null })
      get().showToast(`Claimed! +${boostPercentage}% APY boost activated`, 'success')

      return { rarity, boostPercentage, depositCap }
    },

    // ── Collection ──────────────────────────────────────────────────────────

    setFilter: (filter) => set((s) => { s.selectedFilter = filter }),

    openEmblemDetail: (emblemId) =>
      set((s) => {
        s.activeEmblemDetailId = emblemId
        s.currentScreen = 'emblem-detail'
      }),

    hideEmblem:   (emblemId) => set((s) => {
      const p = s.collectedEmblems.find((x) => x.id === emblemId)
      if (p) p.isHidden = true
    }),
    unhideEmblem: (emblemId) => set((s) => {
      const p = s.collectedEmblems.find((x) => x.id === emblemId)
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
        s.currentScreen = 'map'
      }),

    deposit: (amount) => {
      set((s) => {
        s.wallet.balance += amount
        // Recalculate yield rate (boostPercentage IS total effective APY when boost active)
        const effectiveApy = s.wallet.activeBoost?.boostPercentage ?? s.wallet.baseAPY
        const cappedBalance = s.wallet.activeBoost ? Math.min(s.wallet.balance, s.wallet.activeBoost.depositCap) : s.wallet.balance
        s.wallet.yieldRatePerSecond = (cappedBalance * (effectiveApy / 100)) / 31536000
      })
      get().addActivity({ type: 'deposit', description: `Deposited ${amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`, amount })
    },

    withdraw: (amount) => {
      set((s) => {
        s.wallet.balance = Math.max(0, s.wallet.balance - amount)
        const effectiveApy = s.wallet.activeBoost?.boostPercentage ?? s.wallet.baseAPY
        const cappedBalance = s.wallet.activeBoost ? Math.min(s.wallet.balance, s.wallet.activeBoost.depositCap) : s.wallet.balance
        s.wallet.yieldRatePerSecond = (cappedBalance * (effectiveApy / 100)) / 31536000
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
            const emblemIdx = s.collectedEmblems.findIndex(
              (p) => p.id === s.wallet.activeBoost?.emblemId
            )
            if (emblemIdx !== -1) s.collectedEmblems[emblemIdx].isActive = false
          }
          s.wallet.activeBoost = null
          s.wallet.yieldRatePerSecond = (s.wallet.balance * (s.wallet.baseAPY / 100)) / 31536000
        })
        get().addActivity({ type: 'boost_expired', description: 'Yield boost expired', amount: null })
        get().showToast('Your boost has expired. Explore for more!', 'info')
      }
    },

    setBoostFromChain: ({ balance, activeBoost }) =>
      set((s) => {
        // Only update balance if meaningful change (avoid overriding optimistic UI mid-tx)
        const diff = Math.abs(s.wallet.balance - balance)
        if (diff > 0.01) s.wallet.balance = balance

        s.wallet.activeBoost = activeBoost

        // Recalculate yield rate from boost's APY (boostPercentage IS the total effective APY)
        const effectiveApy = activeBoost?.boostPercentage ?? s.wallet.baseAPY
        const cappedBalance = activeBoost ? Math.min(balance, activeBoost.depositCap) : balance
        s.wallet.yieldRatePerSecond = (cappedBalance * (effectiveApy / 100)) / 31536000
      }),

    setEmblemsFromChain: (emblems) =>
      set((s) => {
        // Replace collection with on-chain data (source of truth)
        // Preserve local-only fields (isHidden) by merging
        const hiddenSet = new Set(
          s.collectedEmblems.filter((e) => e.isHidden).map((e) => e.id)
        )
        s.collectedEmblems = emblems.map((e) => ({
          ...e,
          isHidden: hiddenSet.has(e.id),
          depositAtClaim: 0,
          expectedEarnings: 0,
        }))
        s.user.totalEmblemsClaimed = emblems.length
      }),

    // ── Profile ─────────────────────────────────────────────────────────────

    setUsername: (name) => set((s) => { s.user.username = name }),
    setAvatar:   (avatar) => set((s) => { s.user.avatar = avatar }),

    completeOnboarding: (username, avatar) => set((s) => {
      s.user.username = username
      s.user.avatar = avatar
      s.hasOnboarded = true
      s.currentScreen = 'map'
    }),

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
        const pos = get().currentPosition
        const params = pos ? `?lat=${pos.lat}&lng=${pos.lng}` : ''
        const res = await fetch(`/api/locations${params}`)
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
      hasOnboarded: state.hasOnboarded,
    }),
    merge: (persisted, current) => ({
      ...current,
      user: { ...(current as AppState).user, ...(persisted as any)?.user },
      hasOnboarded: (persisted as any)?.hasOnboarded ?? false,
    }),
  },
  )
)

// ── Selectors ─────────────────────────────────────────────────────────────────

export const selectClaimedLocationIds = (state: AppState) =>
  new Set(state.collectedEmblems.map((p) => p.locationId))

/** Maps locationId → artwork path for claimed emblems (used by map markers) */
export const selectClaimedEmblemArtwork = (state: AppState) => {
  const map = new Map<string, string>()
  for (const e of state.collectedEmblems) {
    map.set(e.locationId, e.artwork)
  }
  return map
}

export const selectFilteredEmblems = (state: AppState) => {
  const { collectedEmblems, selectedFilter } = state
  const now = Date.now()
  return collectedEmblems.filter((p) => {
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
    active:  state.collectedEmblems.filter((p) => new Date(p.expiresAt).getTime() > now && !p.isHidden).length,
    expired: state.collectedEmblems.filter((p) => new Date(p.expiresAt).getTime() <= now && !p.isHidden).length,
    hidden:  state.collectedEmblems.filter((p) => p.isHidden).length,
  }
}
