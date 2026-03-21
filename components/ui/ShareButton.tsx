'use client'
import { useAppStore } from '@/store/appStore'
import { CollectedEmblem, RARITY_CONFIG } from '@/types'

interface ShareButtonProps {
  emblem: Pick<CollectedEmblem, 'rarity' | 'locationName' | 'boostPercentage'>
  variant?: 'button' | 'icon'
}

function buildShareText(emblem: ShareButtonProps['emblem']): string {
  const label = RARITY_CONFIG[emblem.rarity].label
  return [
    `Just claimed a ${label} Emblem at ${emblem.locationName}!`,
    `+${emblem.boostPercentage}% yield boost for 3 days on Atlas Go`,
    `Explore. Claim. Earn.`,
  ].join('\n')
}

export function ShareButton({ emblem, variant = 'button' }: ShareButtonProps) {
  const showToast = useAppStore((s) => s.showToast)

  const handleShare = async () => {
    const text = buildShareText(emblem)

    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({ title: 'Atlas Go', text })
        return
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return
      }
    }

    // Fallback: copy to clipboard
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(text)
        showToast('Copied to clipboard!', 'success')
        return
      } catch { /* fall through */ }
    }
    showToast('Could not share', 'error')
  }

  if (variant === 'icon') {
    return (
      <button
        onClick={handleShare}
        className="h-10 px-4 flex items-center justify-center rounded-full bg-bg-card/60 backdrop-blur-sm text-text-tertiary text-body-sm font-medium active:scale-95 transition-all active:text-text-primary"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="mr-1.5">
          <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Share
      </button>
    )
  }

  return (
    <button
      onClick={handleShare}
      className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-button border border-border-default/50 bg-bg-card/40 text-text-secondary text-body-md font-medium active:scale-[0.97] transition-all hover:bg-bg-card/60"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      Share
    </button>
  )
}
