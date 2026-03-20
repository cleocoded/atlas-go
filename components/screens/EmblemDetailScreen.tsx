'use client'
import { useAppStore } from '@/store/appStore'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { RarityBadge }  from '@/components/ui/RarityBadge'
import { EmblemCircle } from '@/components/ui/EmblemCircle'
import { formatDate, formatCurrency, formatCountdown } from '@/types'

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start py-3 border-b border-border-default last:border-0">
      <span className="text-body-md text-text-tertiary">{label}</span>
      <span className="text-label text-text-primary text-right max-w-[60%]">{value}</span>
    </div>
  )
}

export function EmblemDetailScreen() {
  const emblemId    = useAppStore((s) => s.activeEmblemDetailId)
  const emblems     = useAppStore((s) => s.collectedEmblems)
  const navigate    = useAppStore((s) => s.navigate)
  const hideEmblem  = useAppStore((s) => s.hideEmblem)
  const unhideEmblem = useAppStore((s) => s.unhideEmblem)

  const emblem = emblems.find((p) => p.id === emblemId)

  if (!emblem) return null

  const isActive = new Date(emblem.expiresAt).getTime() > Date.now()

  return (
    <div className="flex flex-col w-full h-full bg-bg-primary screen-enter">
      <ScreenHeader
        title=""
        onBack={() => navigate('collection')}
        right={
          <button
            onClick={() => emblem.isHidden ? unhideEmblem(emblem.id) : hideEmblem(emblem.id)}
            className="text-text-tertiary active:text-text-primary transition-colors text-body-sm"
          >
            {emblem.isHidden ? 'Unhide' : 'Hide'}
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {/* Artwork */}
        <div className="flex justify-center py-6">
          <EmblemCircle
            src={emblem.artwork}
            alt={emblem.artTitle ?? emblem.locationName}
            size={280}
            rarity={emblem.rarity}
            isActive={isActive}
          />
        </div>

        {/* Rarity badge */}
        <div className="flex justify-center mb-4">
          <RarityBadge rarity={emblem.rarity} />
        </div>

        {/* Detail card */}
        <div className="mx-4 bg-bg-card rounded-card p-5 shadow-card mb-8">
          <DetailRow label="Collected"       value={formatDate(emblem.claimedAt)} />
          <DetailRow label="Location"        value={emblem.locationName} />
          <DetailRow label="Partner"         value={emblem.partnerName} />
          <DetailRow label="Boost"           value={`+${emblem.boostPercentage}% APY`} />
          <DetailRow label="Duration"        value={formatCountdown(emblem.boostDurationHours * 3600)} />
          <DetailRow label="Expires"         value={formatDate(emblem.expiresAt)} />
          <DetailRow label="Status"          value={isActive ? 'Active' : 'Expired'} />
          <DetailRow label="Deposit at claim" value={formatCurrency(emblem.depositAtClaim)} />
          <DetailRow label="Expected yield"  value={formatCurrency(emblem.expectedEarnings)} />
          {emblem.artTitle && (
            <DetailRow label="Art title" value={emblem.artTitle} />
          )}
        </div>
      </div>
    </div>
  )
}
