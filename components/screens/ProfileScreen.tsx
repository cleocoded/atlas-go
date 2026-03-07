'use client'
import { useState } from 'react'
import Image         from 'next/image'
import { usePrivy }     from '@privy-io/react-auth'
import { useAppStore }  from '@/store/appStore'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { Button }       from '@/components/ui/Button'
import { formatAddress, formatCurrency } from '@/types'

export function ProfileScreen() {
  const user         = useAppStore((s) => s.user)
  const wallet       = useAppStore((s) => s.wallet)
  const setUsername  = useAppStore((s) => s.setUsername)
  const navigate     = useAppStore((s) => s.navigate)
  const connectWallet = useAppStore((s) => s.connectWallet)
  const { login, logout, authenticated, user: privyUser } = usePrivy()

  const [editing, setEditing]   = useState(false)
  const [username, setUsernameLocal] = useState(user.username)

  const handleSaveName = () => {
    if (username.trim()) setUsername(username.trim())
    setEditing(false)
  }

  return (
    <div className="flex flex-col w-full h-full bg-bg-primary screen-enter">
      <ScreenHeader title="Profile" />

      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {/* Avatar */}
        <div className="flex justify-center py-8">
          <div className="w-48 h-72 bg-bg-elevated rounded-card overflow-hidden border border-border-default shadow-elevated flex items-center justify-center">
            {user.avatar !== 'none' ? (
              <Image
                src={`/avatars/profile-${user.avatar}.png`}
                alt={user.avatar}
                width={192}
                height={288}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-6xl opacity-40">🧭</span>
            )}
          </div>
        </div>

        {/* Username */}
        <div className="flex justify-center mb-2 px-8">
          {editing ? (
            <div className="flex gap-2 w-full">
              <input
                autoFocus
                value={username}
                onChange={(e) => setUsernameLocal(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                className="flex-1 h-10 bg-bg-elevated rounded-input px-3 text-text-primary text-heading font-bold text-center outline-none border border-accent-primary"
                maxLength={20}
              />
              <button
                onClick={handleSaveName}
                className="px-4 text-accent-primary font-semibold text-body-lg active:opacity-70"
              >
                Save
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-2 active:opacity-70"
            >
              <span className="text-heading font-bold text-text-primary">{user.username}</span>
              <span className="text-text-tertiary text-body-sm">✎</span>
            </button>
          )}
        </div>

        {/* Wallet address */}
        {wallet.address ? (
          <p className="text-center text-body-md text-text-tertiary font-mono mb-6">
            {formatAddress(wallet.address)}
          </p>
        ) : (
          <p className="text-center text-body-md text-text-tertiary mb-6">No wallet connected</p>
        )}

        {/* Change avatar */}
        <div className="px-4 mb-6">
          <Button variant="secondary" fullWidth onClick={() => navigate('avatar-select')}>
            Change Avatar
          </Button>
        </div>

        {/* Stats */}
        <div className="mx-4 mb-6 bg-bg-card rounded-card p-5 shadow-card">
          <p className="text-label text-text-secondary mb-3 uppercase tracking-wide text-body-sm">
            Stats
          </p>
          <div className="flex flex-col gap-0">
            <div className="flex justify-between py-3 border-b border-border-default">
              <span className="text-body-md text-text-tertiary">POAPs Collected</span>
              <span className="text-label text-text-primary">{user.totalPOAPsClaimed}</span>
            </div>
            <div className="flex justify-between py-3 border-b border-border-default">
              <span className="text-body-md text-text-tertiary">Total Yield Earned</span>
              <span className="text-label text-accent-boost">{formatCurrency(user.totalYieldEarned)}</span>
            </div>
            <div className="flex justify-between py-3">
              <span className="text-body-md text-text-tertiary">Locations Visited</span>
              <span className="text-label text-text-primary">{user.locationsVisited}</span>
            </div>
          </div>
        </div>

        {/* Auth */}
        <div className="px-4 mb-8">
          {authenticated ? (
            <Button variant="danger" fullWidth onClick={logout}>
              Log Out
            </Button>
          ) : (
            <Button variant="primary" fullWidth onClick={login}>
              Connect Wallet
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
