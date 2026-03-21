'use client'
import { useState } from 'react'
import Image         from 'next/image'
import { usePrivy }     from '@privy-io/react-auth'
import { useAppStore }  from '@/store/appStore'
import { formatAddress, formatCurrency } from '@/types'

export function ProfileScreen() {
  const user         = useAppStore((s) => s.user)
  const wallet       = useAppStore((s) => s.wallet)
  const setUsername  = useAppStore((s) => s.setUsername)
  const navigate     = useAppStore((s) => s.navigate)
  const goBack       = useAppStore((s) => s.goBack)
  const connectWallet = useAppStore((s) => s.connectWallet)
  const disconnectWallet = useAppStore((s) => s.disconnectWallet)
  const showToast    = useAppStore((s) => s.showToast)
  const { login, logout, authenticated, user: privyUser } = usePrivy()

  // Background colors sampled from each avatar image
  const avatarColors: Record<string, { bg: string; glow1: string; glow2: string }> = {
    female: { bg: '#0e0c2b', glow1: 'rgba(140,100,180,0.25)', glow2: 'rgba(180,140,200,0.12)' },
    male:   { bg: '#0e0c2b', glow1: 'rgba(80,120,200,0.25)', glow2: 'rgba(100,150,230,0.12)' },
    none:   { bg: '#0D0D1A', glow1: 'rgba(123,104,238,0.20)', glow2: 'rgba(255,184,77,0.12)' },
  }
  const colors = avatarColors[user.avatar] ?? avatarColors.none

  const [editing, setEditing]   = useState(false)
  const [username, setUsernameLocal] = useState(user.username)

  const handleSaveName = () => {
    if (username.trim()) setUsername(username.trim())
    setEditing(false)
  }

  const copyAddress = () => {
    if (!wallet.address) return
    navigator.clipboard.writeText(wallet.address)
    showToast('Address copied', 'success')
  }

  return (
    <div className="flex flex-col w-full h-full bg-bg-primary screen-enter">
      {/* Minimal back button — no heavy header */}
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
        {/* Hero area — avatar-colored background */}
        <div className="relative flex flex-col items-center pt-8 pb-6">
          {/* Background wash — flat color fading into page bg */}
          <div
            className="absolute top-0 left-0 right-0 h-[360px] pointer-events-none"
            style={{
              background: `linear-gradient(to bottom, ${colors.bg} 0%, ${colors.bg} 40%, transparent 100%)`,
            }}
          />

          {/* Avatar — frameless, soft vignette edges */}
          <button
            onClick={() => navigate('avatar-select')}
            className="relative group active:scale-[0.97] transition-transform duration-150 z-[1]"
          >
            <div className="w-56 h-72">
              {user.avatar !== 'none' ? (
                <Image
                  src={`/avatars/profile-${user.avatar}.png`}
                  alt={user.avatar}
                  width={224}
                  height={288}
                  className="w-full h-full object-cover"
                  style={{
                    maskImage: 'radial-gradient(ellipse 80% 85% at 50% 40%, black 60%, transparent 100%)',
                    WebkitMaskImage: 'radial-gradient(ellipse 80% 85% at 50% 40%, black 60%, transparent 100%)',
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-6xl opacity-30">🧭</span>
                </div>
              )}
            </div>
          </button>

          {/* Username */}
          <div className="mt-6 flex flex-col items-center gap-2">
            {editing ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={username}
                  onChange={(e) => setUsernameLocal(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                  onBlur={handleSaveName}
                  className="h-9 bg-transparent rounded-lg px-3 text-text-primary text-heading font-bold text-center outline-none border-b-2 border-accent-primary w-40"
                  maxLength={20}
                />
              </div>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 active:opacity-70 transition-opacity"
              >
                <span className="text-heading font-bold text-text-primary">{user.username}</span>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-disabled mt-0.5">
                  <path d="M12 20h9"/>
                  <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
                </svg>
              </button>
            )}

            {/* Wallet address chip */}
            {wallet.address && (
              <button
                onClick={copyAddress}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-bg-elevated/60 active:bg-bg-elevated transition-colors"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-accent-boost" />
                <span className="text-body-sm text-text-tertiary font-mono">
                  {formatAddress(wallet.address)}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="flex gap-3 px-5 mb-8">
          <div className="flex-1 rounded-[14px] p-4 text-center border border-border-default/60 bg-gradient-to-b from-bg-card/80 to-bg-card/30">
            <p className="text-display-md text-text-primary tabular-nums">{user.totalEmblemsClaimed}</p>
            <p className="text-body-sm text-text-tertiary mt-1">Emblems</p>
          </div>
          <div className="flex-1 rounded-[14px] p-4 text-center border border-accent-boost/15 bg-gradient-to-b from-accent-boost/[0.06] to-transparent">
            <p className="text-display-md text-accent-boost tabular-nums">{formatCurrency(user.totalYieldEarned)}</p>
            <p className="text-body-sm text-text-tertiary mt-1">Yield</p>
          </div>
          <div className="flex-1 rounded-[14px] p-4 text-center border border-border-default/60 bg-gradient-to-b from-bg-card/80 to-bg-card/30">
            <p className="text-display-md text-text-primary tabular-nums">{user.locationsVisited}</p>
            <p className="text-body-sm text-text-tertiary mt-1">Places</p>
          </div>
        </div>

        {/* Menu-style actions */}
        <div className="px-5 space-y-1.5 mb-6">
          <button
            onClick={() => navigate('avatar-select')}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-[14px] bg-bg-card/50 border border-border-default/40 active:bg-bg-card active:border-border-default transition-colors"
          >
            <div className="w-9 h-9 rounded-[10px] bg-accent-secondary/15 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent-secondary">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <span className="text-body-lg text-text-primary flex-1 text-left">Change Avatar</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-disabled">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>

          <button
            onClick={() => navigate('settings')}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-[14px] bg-bg-card/50 border border-border-default/40 active:bg-bg-card active:border-border-default transition-colors"
          >
            <div className="w-9 h-9 rounded-[10px] bg-accent-primary/15 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent-primary">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.32 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
              </svg>
            </div>
            <span className="text-body-lg text-text-primary flex-1 text-left">Settings</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-disabled">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>

          {/* Logout row — same style, danger color */}
          {authenticated && (
            <button
              onClick={() => { disconnectWallet(); logout() }}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-[14px] bg-bg-card/50 border border-border-default/40 active:bg-accent-danger/10 active:border-accent-danger/30 transition-colors mt-3"
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
          )}

          {!authenticated && (
            <button
              onClick={login}
              className="w-full py-3.5 rounded-[14px] bg-accent-primary text-bg-primary text-label font-semibold active:scale-[0.97] transition-transform shadow-button mt-3"
            >
              Connect Wallet
            </button>
          )}
        </div>

        {/* Bottom breathing room */}
        <div className="h-6" />
      </div>
    </div>
  )
}
