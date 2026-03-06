'use client'
import { useEffect } from 'react'
import { usePrivy }        from '@privy-io/react-auth'
import { useAppStore }     from '@/store/appStore'
import { useOnChainSync }  from '@/lib/useOnChainSync'
import { Toast }           from '@/components/ui/Toast'
import { MapScreen }      from '@/components/screens/MapScreen'
import { ClaimScreen }    from '@/components/screens/ClaimScreen'
import { CollectionScreen }  from '@/components/screens/CollectionScreen'
import { POAPDetailScreen }  from '@/components/screens/POAPDetailScreen'
import { WalletScreen }      from '@/components/screens/WalletScreen'
import { ProfileScreen }     from '@/components/screens/ProfileScreen'
import { AvatarSelectScreen } from '@/components/screens/AvatarSelectScreen'
import { SettingsScreen }    from '@/components/screens/SettingsScreen'

export function App() {
  const screen      = useAppStore((s) => s.currentScreen)
  const connectWallet = useAppStore((s) => s.connectWallet)
  const { user: privyUser, authenticated } = usePrivy()

  // Sync Privy wallet to app store
  useEffect(() => {
    if (authenticated && privyUser?.wallet?.address) {
      connectWallet(privyUser.wallet.address)
    }
  }, [authenticated, privyUser, connectWallet])

  // Sync on-chain balance + boost state every 30s
  useOnChainSync()

  return (
    <main
      className="relative w-full overflow-hidden bg-bg-primary"
      style={{ height: '100dvh', maxWidth: '480px', margin: '0 auto' }}
    >
      {/* Map is always rendered underneath (persists for GPS + tiles) */}
      <div
        className="absolute inset-0"
        style={{ display: screen === 'map' || screen === 'claim' ? 'block' : 'none' }}
      >
        <MapScreen />
      </div>

      {/* Full-screen overlays / screens */}
      {screen === 'claim'        && <ClaimScreen />}
      {screen === 'collection'   && <CollectionScreen />}
      {screen === 'poap-detail'  && <POAPDetailScreen />}
      {screen === 'wallet'       && <WalletScreen />}
      {screen === 'profile'      && <ProfileScreen />}
      {screen === 'avatar-select'&& <AvatarSelectScreen />}
      {screen === 'settings'     && <SettingsScreen />}

      {/* Global toast */}
      <Toast />
    </main>
  )
}
