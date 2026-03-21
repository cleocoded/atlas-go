'use client'
import { useAppStore } from '@/store/appStore'
import { RarityBadge }  from '@/components/ui/RarityBadge'
import { EmblemCircle } from '@/components/ui/EmblemCircle'
import { ShareButton }  from '@/components/ui/ShareButton'
import { formatDate, formatCurrency, RARITY_CONFIG } from '@/types'

export function EmblemDetailScreen() {
  const emblemId     = useAppStore((s) => s.activeEmblemDetailId)
  const emblems      = useAppStore((s) => s.collectedEmblems)
  const navigate     = useAppStore((s) => s.navigate)
  const hideEmblem   = useAppStore((s) => s.hideEmblem)
  const unhideEmblem = useAppStore((s) => s.unhideEmblem)

  const emblem = emblems.find((p) => p.id === emblemId)

  if (!emblem) return null

  const isActive    = new Date(emblem.expiresAt).getTime() > Date.now()
  const rarityColor = RARITY_CONFIG[emblem.rarity].color

  return (
    <div className="flex flex-col w-full h-full bg-bg-primary screen-enter">
      {/* Rarity color wash behind artwork */}
      <div
        className="absolute inset-x-0 top-0 h-[360px] pointer-events-none"
        style={{
          background: `linear-gradient(to bottom, ${rarityColor}12 0%, ${rarityColor}08 50%, transparent 100%)`,
        }}
      />

      {/* Floating back button */}
      <div className="absolute top-0 left-0 z-10 p-3">
        <button
          onClick={() => navigate('collection')}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-bg-card/60 backdrop-blur-sm text-text-primary active:scale-95 transition-transform"
          aria-label="Back"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* Floating share + hide/unhide buttons */}
      <div className="absolute top-0 right-0 z-10 p-3 flex gap-2">
        <ShareButton
          tokenId={emblem.tokenId}
          rarity={emblem.rarity}
          locationName={emblem.locationName}
          boostPercentage={emblem.boostPercentage}
          variant="icon"
        />
        <button
          onClick={() => emblem.isHidden ? unhideEmblem(emblem.id) : hideEmblem(emblem.id)}
          className="h-10 px-4 flex items-center justify-center rounded-full bg-bg-card/60 backdrop-blur-sm text-text-tertiary text-body-sm font-medium active:scale-95 transition-all active:text-text-primary"
        >
          {emblem.isHidden ? 'Unhide' : 'Hide'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {/* Artwork */}
        <div className="flex justify-center pt-16 pb-4">
          <EmblemCircle
            src={emblem.artwork}
            alt={emblem.artTitle ?? emblem.locationName}
            size={260}
            rarity={emblem.rarity}
            isActive={isActive}
          />
        </div>

        {/* Rarity + name */}
        <div className="flex flex-col items-center gap-2.5 mb-8 px-5">
          <RarityBadge rarity={emblem.rarity} />
          <h1 className="text-display-md text-text-primary text-center">{emblem.partnerName}</h1>
          <p className="text-body-md text-text-tertiary">{emblem.locationName}</p>
        </div>

        {/* Status pill */}
        <div className="flex justify-center mb-6">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${
            isActive
              ? 'bg-accent-boost/10 border-accent-boost/20'
              : 'bg-bg-card/50 border-border-default/40'
          }`}>
            <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-accent-boost animate-pulse' : 'bg-text-disabled'}`} />
            <span className={`text-body-sm font-semibold ${isActive ? 'text-accent-boost' : 'text-text-disabled'}`}>
              {isActive ? 'Active' : 'Expired'}
            </span>
          </div>
        </div>

        {/* Boost info */}
        <div className="px-5 mb-6">
          <p className="text-body-sm text-text-tertiary uppercase tracking-wider mb-3 px-1">Yield Boost</p>
          <div className="rounded-[14px] border border-border-default/40 bg-bg-card/30 overflow-hidden">
            <div className="flex justify-between px-4 py-3.5 border-b border-border-default/30">
              <span className="text-body-md text-text-tertiary">Boosted APY</span>
              <span className="text-label font-semibold" style={{ color: rarityColor }}>
                {emblem.boostPercentage}%
              </span>
            </div>
            <div className="flex justify-between px-4 py-3.5 border-b border-border-default/30">
              <span className="text-body-md text-text-tertiary">Deposit Cap</span>
              <span className="text-label text-text-primary">{formatCurrency(emblem.depositCap, 0)}</span>
            </div>
            <div className="flex justify-between px-4 py-3.5 border-b border-border-default/30">
              <span className="text-body-md text-text-tertiary">Duration</span>
              <span className="text-label text-text-primary">72 hours</span>
            </div>
            <div className="flex justify-between px-4 py-3.5">
              <span className="text-body-md text-text-tertiary">Expires</span>
              <span className={`text-label ${isActive ? 'text-text-primary' : 'text-text-disabled'}`}>
                {formatDate(emblem.expiresAt)}
              </span>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="px-5 mb-8">
          <p className="text-body-sm text-text-tertiary uppercase tracking-wider mb-3 px-1">Details</p>
          <div className="rounded-[14px] border border-border-default/40 bg-bg-card/30 overflow-hidden">
            <div className="flex justify-between px-4 py-3.5 border-b border-border-default/30">
              <span className="text-body-md text-text-tertiary">Collected</span>
              <span className="text-label text-text-primary">{formatDate(emblem.claimedAt)}</span>
            </div>
            <div className="flex justify-between px-4 py-3.5 border-b border-border-default/30">
              <span className="text-body-md text-text-tertiary">Location</span>
              <span className="text-label text-text-primary text-right max-w-[55%]">{emblem.locationName}</span>
            </div>
            <div className="flex justify-between px-4 py-3.5 border-b border-border-default/30">
              <span className="text-body-md text-text-tertiary">Partner</span>
              <span className="text-label text-text-primary">{emblem.partnerName}</span>
            </div>
            {emblem.artTitle && (
              <div className="flex justify-between px-4 py-3.5 border-b border-border-default/30">
                <span className="text-body-md text-text-tertiary">Art Title</span>
                <span className="text-label text-text-primary text-right max-w-[55%]">{emblem.artTitle}</span>
              </div>
            )}
            <div className="flex justify-between px-4 py-3.5">
              <span className="text-body-md text-text-tertiary">Rarity</span>
              <span className="text-label font-semibold capitalize" style={{ color: rarityColor }}>
                {RARITY_CONFIG[emblem.rarity].label}
              </span>
            </div>
          </div>
        </div>

        <div className="h-6" />
      </div>
    </div>
  )
}
