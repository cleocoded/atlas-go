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

// Shared refs so components outside Privy tree can trigger sign-in/out
export const privyLoginRef: { current: (() => void) | null } = { current: null }
export const privyLogoutRef: { current: (() => Promise<void>) | null } = { current: null }
// Whether user is currently authenticated with Privy (updated by AppWithPrivy)
export const privyAuthRef: { current: boolean } = { current: false }

// ── AppWithPrivy ─────────────────────────────────────────────────────────────
// Only rendered once PrivyProvider is in the tree — safe to call usePrivy()

function AppWithPrivy({ onAuth }: { onAuth: (info: { authenticated: boolean; email: string | null; login: () => void }) => void }) {
  const connectWallet = useAppStore((s) => s.connectWallet)
  const { user: privyUser, authenticated, login, logout } = usePrivy()

  useEffect(() => {
    if (authenticated && privyUser?.wallet?.address) {
      connectWallet(privyUser.wallet.address)
    }
  }, [authenticated, privyUser, connectWallet])

  useEffect(() => {
    privyLoginRef.current = login
    privyLogoutRef.current = logout
    privyAuthRef.current = authenticated
  }, [login, logout, authenticated])

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
  const [authInfo, setAuthInfo] = useState<{ authenticated: boolean; email: string | null; login: () => void }>({ authenticated: false, email: null, login: () => {} })
  const handleAuth = useCallback((info: { authenticated: boolean; email: string | null; login: () => void }) => setAuthInfo(info), [])

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

      {/* Full-screen overlay / navigation screens — require both onboarded + authenticated */}
      {hasOnboarded && authInfo.authenticated && screen === 'claim'         && <ClaimScreen />}
      {hasOnboarded && authInfo.authenticated && screen === 'collection'    && <CollectionScreen />}
      {hasOnboarded && authInfo.authenticated && screen === 'poap-detail'   && <POAPDetailScreen />}
      {hasOnboarded && authInfo.authenticated && screen === 'wallet'        && <WalletScreen />}
      {hasOnboarded && authInfo.authenticated && screen === 'profile'       && <ProfileScreen />}
      {hasOnboarded && authInfo.authenticated && screen === 'avatar-select' && <AvatarSelectScreen />}
      {hasOnboarded && authInfo.authenticated && screen === 'settings'      && <SettingsScreen />}

      <Toast />
    </main>
  )
}
