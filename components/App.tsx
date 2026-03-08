'use client'
import { useEffect, useState, useCallback } from 'react'
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
import { OnboardingScreen }  from '@/components/screens/OnboardingScreen'

// ── AppWithPrivy ─────────────────────────────────────────────────────────────
// Only rendered once PrivyProvider is in the tree — safe to call usePrivy()

function AppWithPrivy({ onEmail }: { onEmail: (email: string | null) => void }) {
  const connectWallet = useAppStore((s) => s.connectWallet)
  const { user: privyUser, authenticated } = usePrivy()

  useEffect(() => {
    if (authenticated && privyUser?.wallet?.address) {
      connectWallet(privyUser.wallet.address)
    }
  }, [authenticated, privyUser, connectWallet])

  // Forward email for onboarding default name
  useEffect(() => {
    const email = privyUser?.email?.address ?? privyUser?.google?.email ?? null
    onEmail(email)
  }, [privyUser, onEmail])

  useOnChainSync()

  return null
}

// ── App ───────────────────────────────────────────────────────────────────────

export function App() {
  const screen          = useAppStore((s) => s.currentScreen)
  const hasOnboarded    = useAppStore((s) => s.hasOnboarded)
  const privyReady      = usePrivyReady()
  const loadLocations   = useAppStore((s) => s.loadLocations)
  const [email, setEmail] = useState<string | null>(null)
  const handleEmail = useCallback((e: string | null) => setEmail(e), [])

  useEffect(() => { loadLocations() }, [loadLocations])

  return (
    <main
      className="relative w-full overflow-hidden bg-bg-primary"
      style={{ height: '100dvh', maxWidth: '480px', margin: '0 auto' }}
    >
      {/* Mount Privy-dependent logic only once PrivyProvider is in the tree */}
      {privyReady && <AppWithPrivy onEmail={handleEmail} />}

      {!hasOnboarded ? (
        <OnboardingScreen email={email} />
      ) : (
        <>
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
        </>
      )}

      <Toast />
    </main>
  )
}
