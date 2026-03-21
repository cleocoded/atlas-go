'use client'
import { useAppStore, selectFilteredEmblems, selectFilterCounts } from '@/store/appStore'
import { EmblemCircle } from '@/components/ui/EmblemCircle'
import { formatDate, CollectionFilter }   from '@/types'

const TABS: { key: CollectionFilter; label: string }[] = [
  { key: 'active',  label: 'Active'  },
  { key: 'expired', label: 'Expired' },
  { key: 'hidden',  label: 'Hidden'  },
]

export function CollectionScreen() {
  const selectedFilter = useAppStore((s) => s.selectedFilter)
  const setFilter      = useAppStore((s) => s.setFilter)
  const openDetail     = useAppStore((s) => s.openEmblemDetail)
  const goBack         = useAppStore((s) => s.goBack)
  const emblems        = useAppStore(selectFilteredEmblems)
  const counts         = useAppStore(selectFilterCounts)

  return (
    <div className="flex flex-col w-full h-full bg-bg-primary screen-enter">
      {/* Floating back button */}
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

      {/* Title + Filter tabs */}
      <div className="pt-16 pb-2 px-5">
        <h1 className="text-display-md text-text-primary mb-4">My Collection</h1>
        <div className="flex gap-2">
          {TABS.map(({ key, label }) => {
            const isActive = selectedFilter === key
            const count = counts[key]
            return (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`
                  h-9 px-4 rounded-full text-body-sm font-semibold transition-all duration-150 active:scale-[0.96]
                  ${isActive
                    ? 'bg-accent-primary text-bg-primary'
                    : 'bg-bg-card/50 text-text-tertiary border border-border-default/40'
                  }
                `}
              >
                {label} ({count})
              </button>
            )
          })}
        </div>
      </div>

      {emblems.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-8 text-center">
          <span className="text-5xl opacity-30">✦</span>
          <p className="text-body-md text-text-disabled">
            {selectedFilter === 'active'
              ? 'No active emblems — explore the map!'
              : selectedFilter === 'expired'
              ? 'No expired emblems yet.'
              : 'No hidden emblems.'}
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto scrollbar-hide px-5 py-4">
          <div
            className="grid gap-x-4 gap-y-6"
            style={{ gridTemplateColumns: '1fr 1fr' }}
          >
            {emblems.map((emblem) => {
              const isActive = new Date(emblem.expiresAt).getTime() > Date.now()
              return (
                <button
                  key={emblem.id}
                  className="flex flex-col items-center gap-2.5 active:scale-[0.96] transition-transform duration-100 ease-out"
                  onClick={() => openDetail(emblem.id)}
                >
                  <EmblemCircle
                    src={emblem.artwork}
                    alt={emblem.artTitle ?? emblem.locationName}
                    size={Math.round((375 - 48) / 2)}
                    rarity={emblem.rarity}
                    isActive={isActive}
                    className="w-full aspect-square"
                  />
                  <div className="text-center w-full px-1">
                    <p className="text-label text-text-primary truncate">{emblem.partnerName}</p>
                    <p className="text-body-sm text-text-disabled mt-0.5">{formatDate(emblem.claimedAt)}</p>
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
