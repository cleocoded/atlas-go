'use client'
import { useAppStore, selectFilteredEmblems, selectFilterCounts } from '@/store/appStore'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { FilterTabs }   from '@/components/ui/FilterTabs'
import { EmblemCircle } from '@/components/ui/EmblemCircle'
import { formatDate }   from '@/types'

export function CollectionScreen() {
  const selectedFilter = useAppStore((s) => s.selectedFilter)
  const setFilter      = useAppStore((s) => s.setFilter)
  const openDetail     = useAppStore((s) => s.openEmblemDetail)
  const emblems        = useAppStore(selectFilteredEmblems)
  const counts         = useAppStore(selectFilterCounts)

  return (
    <div className="flex flex-col w-full h-full bg-bg-primary screen-enter">
      <ScreenHeader title="My Collection" />

      <FilterTabs
        active={selectedFilter}
        counts={counts}
        onChange={setFilter}
      />

      {emblems.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8 text-center">
          <span className="text-5xl opacity-40">✦</span>
          <p className="text-body-md text-text-tertiary">
            {selectedFilter === 'active'
              ? 'No active emblems — explore the map!'
              : selectedFilter === 'expired'
              ? 'No expired emblems yet.'
              : 'No hidden emblems.'}
          </p>
        </div>
      ) : (
        <div
          className="flex-1 overflow-y-auto scrollbar-hide px-4 py-3"
        >
          <div
            className="grid gap-x-4 gap-y-5"
            style={{ gridTemplateColumns: '1fr 1fr' }}
          >
            {emblems.map((emblem) => {
              const isActive = new Date(emblem.expiresAt).getTime() > Date.now()
              return (
                <button
                  key={emblem.id}
                  className="flex flex-col items-center gap-2 active:scale-[0.96] transition-transform duration-100 ease-out"
                  onClick={() => openDetail(emblem.id)}
                >
                  <EmblemCircle
                    src={emblem.artwork}
                    alt={emblem.artTitle ?? emblem.locationName}
                    size={Math.round((375 - 48) / 2)} // Approximates spec formula
                    rarity={emblem.rarity}
                    isActive={isActive}
                    className="w-full aspect-square"
                  />
                  <div className="text-center w-full px-1">
                    <p className="text-label text-text-primary truncate">{emblem.partnerName}</p>
                    <p className="text-body-sm text-text-tertiary">{formatDate(emblem.claimedAt)}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
