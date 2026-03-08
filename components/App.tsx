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

function AppWithPrivy({ onAuth }: { onAuth: (info: { authenticated: boolean; email: string | null; login: () => void }) => void }) {
  const connectWallet = useAppStore((s) => s.connectWallet)
  const { user: privyUser, authenticated, login } = usePrivy()

  useEffect(() => {
    if (authenticated && privyUser?.wallet?.address) {
      connectWallet(privyUser.wallet.address)
    }
  }, [authenticated, privyUser, connectWallet])

  useEffect(() => {
    const email = privyUser?.email?.address ?? privyUser?.google?.email ?? null
    onAuth({ authenticated, email, login })
  }, [privyUser, authenticated, onAuth, login])

  useOnChainSync()

  return null
}

// ── App ───────────────────────────────────────────────────────────────────────

export function App() {
  const screen          = useAppStore((s) => s.currentScreen)
  const hasOnboarded    = useAppStore((s) => s.hasOnboarded)
  const privyReady      = usePrivyReady()
  const loadLocations   = useAppStore((s) => s.loadLocations)
  const [authInfo, setAuthInfo] = useState<{ authenticated: boolean; email: string | null; login: () => void }>({ authenticated: false, email: null, login: () => {} })
  const handleAuth = useCallback((info: { authenticated: boolean; email: string | null; login: () => void }) => setAuthInfo(info), [])

  useEffect(() => { loadLocations() }, [loadLocations])

  return (
    <main
      className="relative w-full overflow-hidden bg-bg-primary"
      style={{ height: '100dvh', maxWidth: '480px', margin: '0 auto' }}
    >
      {/* Mount Privy-dependent logic only once PrivyProvider is in the tree */}
      {privyReady && <AppWithPrivy onAuth={handleAuth} />}

      {/* Map always rendered underneath — persists GPS + tiles across screens */}
      <div
        className="absolute inset-0"
        style={{ display: screen === 'map' || screen === 'claim' || !hasOnboarded ? 'block' : 'none' }}
      >
        <MapScreen />
      </div>

      {/* Onboarding overlay — only after Privy login, before profile setup */}
      {authInfo.authenticated && !hasOnboarded && (
        <OnboardingScreen email={authInfo.email} />
      )}

      {/* Full-screen overlay / navigation screens */}
      {hasOnboarded && screen === 'claim'         && <ClaimScreen />}
      {hasOnboarded && screen === 'collection'    && <CollectionScreen />}
      {hasOnboarded && screen === 'poap-detail'   && <POAPDetailScreen />}
      {hasOnboarded && screen === 'wallet'        && <WalletScreen />}
      {hasOnboarded && screen === 'profile'       && <ProfileScreen />}
      {hasOnboarded && screen === 'avatar-select' && <AvatarSelectScreen />}
      {hasOnboarded && screen === 'settings'      && <SettingsScreen />}

      <Toast />
    </main>
  )
}
