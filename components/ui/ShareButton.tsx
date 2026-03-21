'use client'
import { useAppStore } from '@/store/appStore'
import { RARITY_CONFIG } from '@/types'

const APP_URL = 'https://atlas-go-seven.vercel.app'

interface ShareButtonProps {
  /** On-chain token ID — links to /emblem/[tokenId] */
  tokenId: string | null
  rarity: string
  locationName: string
  boostPercentage: number
  variant?: 'button' | 'icon'
}

export function ShareButton({ tokenId, rarity, locationName, boostPercentage, variant = 'button' }: ShareButtonProps) {
  const showToast = useAppStore((s) => s.showToast)

  if (!tokenId) return null

  const handleShare = async () => {
    const label = RARITY_CONFIG[rarity as keyof typeof RARITY_CONFIG]?.label ?? rarity
    const url = `${APP_URL}/emblem/${tokenId}`
    const text = [
      `Just claimed a ${label} Emblem at ${locationName}!`,
      `+${boostPercentage}% yield boost for 3 days on Atlas Go`,
    ].join('\n')

    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({ title: 'Atlas Go', text, url })
        return
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return
      }
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(`${text}\n${url}`)
        showToast('Copied to clipboard!', 'success')
        return
      } catch { /* fall through */ }
    }
    showToast('Could not share', 'error')
  }

  const shareIcon = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )

  if (variant === 'icon') {
    return (
      <button
        onClick={handleShare}
        className="h-10 px-4 flex items-center justify-center rounded-full bg-bg-card/60 backdrop-blur-sm text-text-tertiary text-body-sm font-medium active:scale-95 transition-all active:text-text-primary"
      >
        {shareIcon}
        <span className="ml-1.5">Share</span>
      </button>
    )
  }

  return (
    <button
      onClick={handleShare}
      className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-button border border-border-default/50 bg-bg-card/40 text-text-secondary text-body-md font-medium active:scale-[0.97] transition-all hover:bg-bg-card/60"
    >
      {shareIcon}
      Share
    </button>
  )
}

/** Share a profile link */
export function ShareProfileButton({ address }: { address: string }) {
  const showToast = useAppStore((s) => s.showToast)

  const handleShare = async () => {
    const url = `${APP_URL}/profile/${address}`
    const text = 'Check out my Atlas Go profile!'

    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({ title: 'Atlas Go', text, url })
        return
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return
      }
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(url)
        showToast('Profile link copied!', 'success')
        return
      } catch { /* fall through */ }
    }
    showToast('Could not share', 'error')
  }

  return (
    <button
      onClick={handleShare}
      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-[14px] bg-bg-card/50 border border-border-default/40 active:bg-bg-card active:border-border-default transition-colors"
    >
      <div className="w-9 h-9 rounded-[10px] bg-accent-boost/15 flex items-center justify-center">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent-boost">
          <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/>
        </svg>
      </div>
      <span className="text-body-lg text-text-primary flex-1 text-left">Share Profile</span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-disabled">
        <path d="M9 18l6-6-6-6"/>
      </svg>
    </button>
  )
}
