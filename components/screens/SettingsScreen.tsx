'use client'
import { usePrivy }     from '@privy-io/react-auth'
import { useAppStore }  from '@/store/appStore'
import { formatAddress } from '@/types'

export function SettingsScreen() {
  const gpsEnabled = useAppStore((s) => s.gpsEnabled)
  const wallet     = useAppStore((s) => s.wallet)
  const goBack     = useAppStore((s) => s.goBack)
  const disconnectWallet = useAppStore((s) => s.disconnectWallet)
  const { logout, authenticated } = usePrivy()

  const handleRequestGPS = () => {
    navigator.geolocation?.getCurrentPosition(
      () => {},
      () => alert('Please enable location access in your browser settings.')
    )
  }

  const handleLogout = () => {
    disconnectWallet()
    logout()
  }

  return (
    <div className="flex flex-col w-full h-full bg-bg-primary screen-enter">
      {/* Floating back button */}
      <div className="absolute top-0 left-0 z-10 p-3">
        <button
          onClick={goBack}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-bg-card/60 backdrop-blur-sm text-text-primary active:scale-95 transition-transform"
          aria-label="Back"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {/* Title */}
        <div className="pt-16 pb-6 px-5">
          <h1 className="text-display-md text-text-primary">Settings</h1>
        </div>

        {/* General section */}
        <div className="px-5 mb-6">
          <p className="text-body-sm text-text-tertiary uppercase tracking-wider mb-3 px-1">General</p>
          <div className="rounded-[14px] border border-border-default/40 bg-bg-card/30 overflow-hidden">
            <button
              onClick={handleRequestGPS}
              className="flex items-center justify-between w-full px-4 py-3.5 border-b border-border-default/30 active:bg-bg-card transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-[10px] bg-accent-boost/15 flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent-boost">
                    <circle cx="12" cy="12" r="10"/>
                    <circle cx="12" cy="12" r="3"/>
                    <line x1="12" y1="2" x2="12" y2="6"/>
                    <line x1="12" y1="18" x2="12" y2="22"/>
                    <line x1="2" y1="12" x2="6" y2="12"/>
                    <line x1="18" y1="12" x2="22" y2="12"/>
                  </svg>
                </div>
                <span className="text-body-lg text-text-primary">GPS Permissions</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-body-sm ${gpsEnabled ? 'text-accent-boost' : 'text-text-disabled'}`}>
                  {gpsEnabled ? 'Enabled' : 'Disabled'}
                </span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-disabled">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </div>
            </button>

            <div className="flex items-center justify-between w-full px-4 py-3.5 border-b border-border-default/30">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-[10px] bg-accent-secondary/15 flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent-secondary">
                    <rect x="2" y="6" width="20" height="12" rx="2"/>
                    <path d="M2 10h20"/>
                  </svg>
                </div>
                <span className="text-body-lg text-text-primary">Connected Wallet</span>
              </div>
              <span className="text-body-sm text-text-tertiary font-mono">
                {wallet.address ? formatAddress(wallet.address) : 'Not connected'}
              </span>
            </div>

            <div className="flex items-center justify-between w-full px-4 py-3.5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-[10px] bg-accent-primary/15 flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent-primary">
                    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                    <path d="M13.73 21a2 2 0 01-3.46 0"/>
                  </svg>
                </div>
                <span className="text-body-lg text-text-primary">Notifications</span>
              </div>
              <span className="text-body-sm text-text-disabled">Coming soon</span>
            </div>
          </div>
        </div>

        {/* About section */}
        <div className="px-5 mb-6">
          <p className="text-body-sm text-text-tertiary uppercase tracking-wider mb-3 px-1">About</p>
          <div className="rounded-[14px] border border-border-default/40 bg-bg-card/30 overflow-hidden">
            <button
              onClick={() => alert('Atlas Go v0.1.0\nFlow EVM · Privy · Mapbox\nBuilt on Flow')}
              className="flex items-center justify-between w-full px-4 py-3.5 active:bg-bg-card transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-[10px] bg-bg-elevated flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-tertiary">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="16" x2="12" y2="12"/>
                    <line x1="12" y1="8" x2="12.01" y2="8"/>
                  </svg>
                </div>
                <div className="text-left">
                  <span className="text-body-lg text-text-primary block">Atlas Go</span>
                  <span className="text-body-sm text-text-disabled">v0.1.0 · Flow EVM</span>
                </div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-disabled">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Logout */}
        {authenticated && (
          <div className="px-5 mb-8">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-[14px] bg-bg-card/50 border border-border-default/40 active:bg-accent-danger/10 active:border-accent-danger/30 transition-colors"
            >
              <div className="w-9 h-9 rounded-[10px] bg-accent-danger/10 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent-danger/70">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              </div>
              <span className="text-body-lg text-accent-danger/70 flex-1 text-left">Log Out</span>
            </button>
          </div>
        )}

        <div className="h-6" />
      </div>
    </div>
  )
}
