'use client'
import { useAppStore } from '@/store/appStore'
import { privyLoginRef, privyAuthRef } from '@/components/App'
import { Screen } from '@/types'

const MENU_ITEMS: { label: string; icon: string; screen: Screen }[] = [
  { label: 'Collection', icon: '/icons/icon-collection.png', screen: 'collection' },
  { label: 'Wallet',     icon: '/icons/icon-wallet.png',     screen: 'wallet'     },
  { label: 'Settings',   icon: '/icons/icon-settings.png',   screen: 'settings'   },
]

export function POAPMenuButton() {
  const menuOpen     = useAppStore((s) => s.menuOpen)
  const toggleMenu   = useAppStore((s) => s.toggleMenu)
  const closeMenu    = useAppStore((s) => s.closeMenu)
  const navigate     = useAppStore((s) => s.navigate)
  const hasOnboarded = useAppStore((s) => s.hasOnboarded)
  const walletConnected = useAppStore((s) => s.wallet.isConnected)

  const isFullyLoggedIn = hasOnboarded && (walletConnected || privyAuthRef.current)

  const handleNavigate = (screen: Screen) => {
    closeMenu()
    if (!isFullyLoggedIn) {
      privyLoginRef.current?.()
    } else {
      navigate(screen)
    }
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(15)
    }
  }

  const handleToggle = () => {
    toggleMenu()
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(15)
    }
  }

  return (
    <>
      {/* Scrim */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[9]"
          onClick={closeMenu}
          aria-hidden="true"
        />
      )}

      {/* Menu items — stagger upward */}
      {menuOpen && (
        <div
          className="fixed z-[10] flex flex-col-reverse gap-0 items-center"
          style={{ bottom: `calc(24px + env(safe-area-inset-bottom, 0px) + 72px)`, right: '24px', width: '56px' }}
        >
          {MENU_ITEMS.map((item, i) => (
            <button
              key={item.screen}
              onClick={() => handleNavigate(item.screen)}
              className="animate-menu-item-in bg-transparent rounded-card px-3 py-1 flex flex-col items-center gap-0 min-w-[56px] active:scale-95 transition-transform"
              style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'both' }}
            >
              <img src={item.icon} alt={item.label} className="w-12 h-12 object-contain" />
              <span className="text-[10px] text-text-secondary font-bold uppercase">{item.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Main button */}
      <button
        onClick={handleToggle}
        className="fixed right-6 z-[10] w-14 h-14 rounded-full bg-accent-primary shadow-glow-gold flex items-center justify-center active:scale-[0.93] transition-all duration-[120ms] ease-out"
        style={{ bottom: `calc(24px + env(safe-area-inset-bottom, 0px))` }}
        aria-label="Open menu"
      >
        <span
          className="text-2xl text-bg-primary transition-transform duration-200 ease-out"
          style={{ transform: menuOpen ? 'rotate(45deg)' : 'rotate(0deg)', display: 'inline-block' }}
        >
          {menuOpen ? '✕' : '✦'}
        </span>
      </button>
    </>
  )
}
