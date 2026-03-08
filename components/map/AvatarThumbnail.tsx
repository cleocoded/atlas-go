'use client'
import Image from 'next/image'
import { useAppStore } from '@/store/appStore'
import { privyLoginRef, privyAuthRef } from '@/components/App'

export function AvatarThumbnail() {
  const avatar       = useAppStore((s) => s.user.avatar)
  const navigate     = useAppStore((s) => s.navigate)
  const hasOnboarded = useAppStore((s) => s.hasOnboarded)
  const walletConnected = useAppStore((s) => s.wallet.isConnected)

  // Show full profile only when onboarded AND authenticated
  const isFullyLoggedIn = hasOnboarded && (walletConnected || privyAuthRef.current)

  const handleClick = () => {
    if (!isFullyLoggedIn) {
      privyLoginRef.current?.()
    } else {
      navigate('profile')
    }
  }

  // Not logged in — show sign-in icon matching nav button size
  if (!isFullyLoggedIn) {
    return (
      <button
        onClick={handleClick}
        className="fixed left-6 z-[10] w-14 h-14 rounded-full bg-bg-elevated border border-border-default shadow-button flex items-center justify-center active:scale-[0.93] transition-all duration-[120ms] ease-out"
        style={{ bottom: `calc(24px + env(safe-area-inset-bottom, 0px))` }}
        aria-label="Sign in"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-text-secondary">
          <circle cx="12" cy="8" r="4" />
          <path d="M5.5 21a6.5 6.5 0 0 1 13 0" />
        </svg>
      </button>
    )
  }

  return (
    <button
      onClick={handleClick}
      className="fixed left-4 z-[10] w-24 h-24 flex items-end justify-center active:scale-95 transition-transform"
      style={{ bottom: `calc(6px + env(safe-area-inset-bottom, 0px))` }}
      aria-label="Open profile"
    >
      {avatar === 'none' ? (
        <div className="w-full h-full rounded-full bg-text-disabled" />
      ) : (
        <div className="relative w-full h-full">
          <div className="sparkle-container">
            {[...Array(8)].map((_, i) => (
              <span key={i} className="sparkle" style={{
                left: `${15 + Math.random() * 70}%`,
                top: `${10 + Math.random() * 70}%`,
                animationDelay: `${i * 0.4}s`,
                animationDuration: `${1.5 + Math.random() * 1.5}s`,
              }} />
            ))}
          </div>
          <Image
            src={`/avatars/thumbnail-${avatar}.png`}
            alt={avatar}
            width={96}
            height={96}
            className="relative z-[1] w-full h-full object-contain"
          />
        </div>
      )}
    </button>
  )
}
