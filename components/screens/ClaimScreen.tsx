'use client'
import { useState, useRef, useEffect } from 'react'
import { useAppStore }   from '@/store/appStore'
import { RarityBadge }   from '@/components/ui/RarityBadge'
import { Button }        from '@/components/ui/Button'
import { ClaimState, formatCurrency, formatCountdown } from '@/types'

export function ClaimScreen() {
  const locationId = useAppStore((s) => s.activeClaimLocationId)
  const locations  = useAppStore((s) => s.locations)
  const wallet     = useAppStore((s) => s.wallet)
  const closeClaim = useAppStore((s) => s.closeClaim)
  const claimPOAP  = useAppStore((s) => s.claimPOAP)
  const showToast  = useAppStore((s) => s.showToast)
  const activeBoost = wallet.activeBoost

  const location = locations.find((l) => l.id === locationId)

  const [claimState, setClaimState] = useState<ClaimState>('idle')
  const [showReplaceDialog, setShowReplaceDialog] = useState(false)
  const [spinning, setSpinning] = useState(false)
  const [showFlash, setShowFlash] = useState(false)
  const claimDebounceRef = useRef(false)

  // Close on escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && claimState === 'idle') closeClaim()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [claimState, closeClaim])

  if (!location) return null

  const handleClaimTap = () => {
    if (claimDebounceRef.current) return
    if (activeBoost) {
      setShowReplaceDialog(true)
      return
    }
    executeClaim()
  }

  const executeClaim = async () => {
    claimDebounceRef.current = true
    setTimeout(() => { claimDebounceRef.current = false }, 2000)

    setSpinning(true)
    setClaimState('spinning')

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([50, 30, 50])
    }

    // Wait for spin animation (2000ms) + bounce (300ms)
    await new Promise((r) => setTimeout(r, 2300))
    setSpinning(false)
    setClaimState('minting')

    if (location.rarity === 'legendary') {
      setShowFlash(true)
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([100, 50, 100])
      }
      setTimeout(() => setShowFlash(false), 600)
    }

    try {
      await claimPOAP(location.id)
      setClaimState('success')
    } catch {
      setClaimState('error')
      showToast('Something went wrong. Try again.', 'error')
    }
  }

  const buttonText = {
    idle:     'Spin to Claim',
    spinning: 'Spinning…',
    minting:  'Minting…',
    success:  'Claimed ✓',
    error:    'Try Again',
  }[claimState]

  const buttonState = claimState === 'spinning' || claimState === 'minting'
    ? 'loading' as const
    : claimState === 'success'
    ? 'disabled' as const
    : 'default' as const

  return (
    <>
      {/* Legendary flash */}
      {showFlash && (
        <div
          className="fixed inset-0 z-[25] bg-white pointer-events-none animate-screen-flash"
          aria-hidden="true"
        />
      )}

      {/* Main overlay */}
      <div className="fixed inset-0 z-[20] bg-bg-primary flex flex-col animate-slide-up">
        {/* Close button */}
        <div className="flex justify-end p-4 pt-safe">
          <button
            onClick={() => { if (claimState === 'idle' || claimState === 'error') closeClaim() }}
            className="w-11 h-11 flex items-center justify-center text-text-primary active:scale-90 transition-transform"
            aria-label="Close"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* POAP artwork */}
        <div className="flex-1 flex flex-col items-center justify-center px-8 gap-4">
          <div
            className={`
              w-60 h-60 rounded-full overflow-hidden relative border-2 transition-all duration-500
              ${spinning ? 'animate-spin-claim' : ''}
              ${claimState === 'success' ? 'border-gold-shimmer animate-bounce-claim' : 'border-border-default'}
              ${location.rarity === 'legendary' && claimState === 'success' ? 'border-rainbow' : ''}
            `}
          >
            {/* Artwork fallback */}
            <div className="absolute inset-0 bg-gradient-to-br from-accent-secondary/30 to-accent-primary/30 flex items-center justify-center">
              <span className="text-7xl">✦</span>
            </div>
          </div>

          {/* Particles — legendary only */}
          {location.rarity === 'legendary' && claimState === 'success' && (
            <div className="absolute pointer-events-none" aria-hidden="true">
              {Array.from({ length: 16 }).map((_, i) => {
                const angle = (i / 16) * 360
                const dx = Math.cos((angle * Math.PI) / 180) * 80
                const dy = Math.sin((angle * Math.PI) / 180) * 80
                return (
                  <div
                    key={i}
                    className="particle absolute w-2 h-2 rounded-full bg-accent-primary"
                    style={
                      {
                        '--dx': `${dx}px`,
                        '--dy': `${dy}px`,
                        animationDelay: `${i * 20}ms`,
                      } as React.CSSProperties
                    }
                  />
                )
              })}
            </div>
          )}

          {/* Info */}
          <div className="text-center flex flex-col gap-1 mt-2">
            <h2 className="text-heading font-bold text-text-primary">{location.name}</h2>
            <p className="text-body-md text-text-secondary">{location.partnerName}</p>
            <p className="text-body-lg font-semibold text-accent-boost mt-1">
              +{location.boostPercentage}% APY Boost
            </p>
            <p className="text-body-md text-text-secondary">
              Duration: {formatCountdown(location.boostDurationHours * 3600)}
            </p>
            <div className="mt-2">
              <RarityBadge rarity={location.rarity} />
            </div>
          </div>
        </div>

        {/* Claim button */}
        <div className="px-4 pb-safe" style={{ paddingBottom: `max(48px, calc(48px + env(safe-area-inset-bottom, 0px)))` }}>
          <Button
            fullWidth
            state={buttonState}
            variant={claimState === 'error' ? 'danger' : 'primary'}
            onClick={claimState === 'error' ? executeClaim : handleClaimTap}
          >
            {buttonText}
          </Button>
        </div>
      </div>

      {/* Replace boost dialog */}
      {showReplaceDialog && activeBoost && (
        <div className="fixed inset-0 z-[30] bg-black/70 flex items-center justify-center p-6">
          <div className="bg-bg-card rounded-card p-6 w-full max-w-sm shadow-elevated">
            <h3 className="text-heading font-bold text-text-primary mb-3">Replace Active Boost?</h3>
            <p className="text-body-md text-text-secondary mb-6">
              You already have an active boost (+{activeBoost.boostPercentage}% for{' '}
              {formatCountdown(activeBoost.remainingSeconds)} remaining). Claiming this POAP will replace your current boost.
            </p>
            <div className="flex gap-3">
              <Button
                variant="ghost"
                size="md"
                fullWidth
                onClick={() => setShowReplaceDialog(false)}
              >
                Keep Current
              </Button>
              <Button
                variant="primary"
                size="md"
                fullWidth
                onClick={() => {
                  setShowReplaceDialog(false)
                  executeClaim()
                }}
              >
                Replace Boost
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
