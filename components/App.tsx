'use client'
import { useEffect } from 'react'
import { usePrivy }          from '@privy-io/react-auth'
import { useAppStore }       from '@/store/appStore'
import { useOnChainSync }    from '@/lib/useOnChainSync'
import { usePrivyReady }     from '@/app/providers'
import { Toast }             from '@/components/ui/Toast'
import { MapScreen }         from '@/components/screens/MapScreen'
import { ClaimScreen }       from '@/components/screens/ClaimScreen'
import { CollectionScreen }  from '@/components/screens/CollectionScreen'
import { POAPDetailScreen }  from '@/components/screens/POAPDetailScreen'
import { WalletScreen }      from '@/components/screens/WalletScreen'
import { ProfileScreen }     from '@/components/screens/ProfileScreen'
import { AvatarSelectScreen } from '@/components/screens/AvatarSelectScreen'
import { SettingsScreen }    from '@/components/screens/SettingsScreen'

// ── AppWithPrivy ─────────────────────────────────────────────────────────────
// Only rendered once PrivyProvider is in the tree — safe to call usePrivy()

function AppWithPrivy() {
  const connectWallet = useAppStore((s) => s.connectWallet)
  const { user: privyUser, authenticated } = usePrivy()

  useEffect(() => {
    if (authenticated && privyUser?.wallet?.address) {
      connectWallet(privyUser.wallet.address)
    }
  }, [authenticated, privyUser, connectWallet])

  useOnChainSync()

  return null // rendering is handled by App below
}

// ── App ───────────────────────────────────────────────────────────────────────

export function App() {
  const screen          = useAppStore((s) => s.currentScreen)
  const privyReady      = usePrivyReady()
  const loadLocations   = useAppStore((s) => s.loadLocations)

  useEffect(() => { loadLocations() }, [loadLocations])

  return (
    <main
      className="relative w-full overflow-hidden bg-bg-primary"
      style={{ height: '100dvh', maxWidth: '480px', margin: '0 auto' }}
    >
      {/* Mount Privy-dependent logic only once PrivyProvider is in the tree */}
      {privyReady && <AppWithPrivy />}

      {/* Map always rendered underneath — persists GPS + tiles across screens */}
      <div
        className="absolute inset-0"
        style={{ display: screen === 'map' || screen === 'claim' ? 'block' : 'none' }}
      >
        <MapScreen />
      </div>

      {/* Full-screen overlay / navigation screens */}
      {screen === 'claim'         && <ClaimScreen />}
      {screen === 'collection'    && <CollectionScreen />}
      {screen === 'poap-detail'   && <POAPDetailScreen />}
      {screen === 'wallet'        && <WalletScreen />}
      {screen === 'profile'       && <ProfileScreen />}
      {screen === 'avatar-select' && <AvatarSelectScreen />}
      {screen === 'settings'      && <SettingsScreen />}

      <Toast />
    </main>
  )
}
