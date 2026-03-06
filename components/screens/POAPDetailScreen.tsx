'use client'
import { useAppStore } from '@/store/appStore'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { RarityBadge }  from '@/components/ui/RarityBadge'
import { POAPCircle }   from '@/components/ui/POAPCircle'
import { formatDate, formatCurrency, formatCountdown } from '@/types'

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start py-3 border-b border-border-default last:border-0">
      <span className="text-body-md text-text-tertiary">{label}</span>
      <span className="text-label text-text-primary text-right max-w-[60%]">{value}</span>
    </div>
  )
}

export function POAPDetailScreen() {
  const poapId    = useAppStore((s) => s.activePoapDetailId)
  const poaps     = useAppStore((s) => s.collectedPOAPs)
  const navigate  = useAppStore((s) => s.navigate)
  const hidePOAP  = useAppStore((s) => s.hidePOAP)
  const unhidePOAP = useAppStore((s) => s.unhidePOAP)

  const poap = poaps.find((p) => p.id === poapId)

  if (!poap) return null

  const isActive = new Date(poap.expiresAt).getTime() > Date.now()

  return (
    <div className="flex flex-col w-full h-full bg-bg-primary screen-enter">
      <ScreenHeader
        title=""
        onBack={() => navigate('collection')}
        right={
          <button
            onClick={() => poap.isHidden ? unhidePOAP(poap.id) : hidePOAP(poap.id)}
            className="text-text-tertiary active:text-text-primary transition-colors text-body-sm"
          >
            {poap.isHidden ? 'Unhide' : 'Hide'}
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {/* Artwork */}
        <div className="flex justify-center py-6">
          <POAPCircle
            src={poap.artwork}
            alt={poap.artTitle ?? poap.locationName}
            size={280}
            rarity={poap.rarity}
            isActive={isActive}
          />
        </div>

        {/* Rarity badge */}
        <div className="flex justify-center mb-4">
          <RarityBadge rarity={poap.rarity} />
        </div>

        {/* Detail card */}
        <div className="mx-4 bg-bg-card rounded-card p-5 shadow-card mb-8">
          <DetailRow label="Collected"       value={formatDate(poap.claimedAt)} />
          <DetailRow label="Location"        value={poap.locationName} />
          <DetailRow label="Partner"         value={poap.partnerName} />
          <DetailRow label="Boost"           value={`+${poap.boostPercentage}% APY`} />
          <DetailRow label="Duration"        value={formatCountdown(poap.boostDurationHours * 3600)} />
          <DetailRow label="Expires"         value={formatDate(poap.expiresAt)} />
          <DetailRow label="Status"          value={isActive ? 'Active' : 'Expired'} />
          <DetailRow label="Deposit at claim" value={formatCurrency(poap.depositAtClaim)} />
          <DetailRow label="Expected yield"  value={formatCurrency(poap.expectedEarnings)} />
          {poap.artTitle && (
            <DetailRow label="Art title" value={poap.artTitle} />
          )}
        </div>
      </div>
    </div>
  )
}
