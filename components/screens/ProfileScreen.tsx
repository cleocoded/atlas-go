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
        {/* Hero area — avatar with ambient glow */}
        <div className="relative flex flex-col items-center pt-14 pb-6">
          {/* Ambient glow behind avatar */}
          <div className="absolute top-20 w-40 h-40 rounded-full bg-accent-secondary/20 blur-[60px] pointer-events-none" />
          <div className="absolute top-28 w-28 h-28 rounded-full bg-accent-primary/15 blur-[40px] pointer-events-none" />

          {/* Avatar — tappable to change */}
          <button
            onClick={() => navigate('avatar-select')}
            className="relative group active:scale-[0.97] transition-transform duration-150"
          >
            <div className="w-44 h-64 rounded-[20px] overflow-hidden ring-2 ring-white/10 shadow-elevated">
              {user.avatar !== 'none' ? (
                <Image
                  src={`/avatars/profile-${user.avatar}.png`}
                  alt={user.avatar}
                  width={176}
                  height={256}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-bg-elevated flex items-center justify-center">
                  <span className="text-5xl opacity-30">🧭</span>
                </div>
              )}
            </div>
            {/* Edit overlay hint */}
            <div className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-bg-primary/80 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/10 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-secondary">
                <path d="M12 20h9"/>
                <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
              </svg>
            </div>
          </button>

          {/* Username */}
          <div className="mt-5 flex flex-col items-center gap-1">
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
        <div className="flex gap-3 px-5 mb-6">
          <div className="flex-1 bg-bg-card/60 rounded-[14px] p-4 text-center">
            <p className="text-display-md text-text-primary tabular-nums">{user.totalEmblemsClaimed}</p>
            <p className="text-body-sm text-text-tertiary mt-0.5">Emblems</p>
          </div>
          <div className="flex-1 bg-bg-card/60 rounded-[14px] p-4 text-center">
            <p className="text-display-md text-accent-boost tabular-nums">{formatCurrency(user.totalYieldEarned)}</p>
            <p className="text-body-sm text-text-tertiary mt-0.5">Yield</p>
          </div>
          <div className="flex-1 bg-bg-card/60 rounded-[14px] p-4 text-center">
            <p className="text-display-md text-text-primary tabular-nums">{user.locationsVisited}</p>
            <p className="text-body-sm text-text-tertiary mt-0.5">Places</p>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-5 h-px bg-border-default/50 mb-6" />

        {/* Menu-style actions */}
        <div className="px-5 space-y-2 mb-8">
          <button
            onClick={() => navigate('avatar-select')}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-[14px] bg-bg-card/40 active:bg-bg-card transition-colors"
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
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-[14px] bg-bg-card/40 active:bg-bg-card transition-colors"
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
        </div>

        {/* Logout — subtle, at the bottom */}
        <div className="px-5 pb-10">
          {authenticated ? (
            <button
              onClick={() => { disconnectWallet(); logout() }}
              className="w-full py-3 text-body-md text-accent-danger/70 active:text-accent-danger transition-colors"
            >
              Log Out
            </button>
          ) : (
            <button
              onClick={login}
              className="w-full py-3.5 rounded-[14px] bg-accent-primary text-bg-primary text-label font-semibold active:scale-[0.97] transition-transform shadow-button"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
