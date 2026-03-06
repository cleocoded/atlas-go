'use client'
import { CollectionFilter } from '@/types'

interface FilterTabsProps {
  active: CollectionFilter
  counts: { active: number; expired: number; hidden: number }
  onChange: (f: CollectionFilter) => void
}

const TABS: { key: CollectionFilter; label: string }[] = [
  { key: 'active',  label: 'Active'  },
  { key: 'expired', label: 'Expired' },
  { key: 'hidden',  label: 'Hidden'  },
]

export function FilterTabs({ active, counts, onChange }: FilterTabsProps) {
  return (
    <div className="flex gap-2 px-4 py-2">
      {TABS.map(({ key, label }) => {
        const isActive = active === key
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`
              h-8 px-3 rounded-pill text-body-sm font-semibold transition-all duration-150 ease-out active:scale-[0.96]
              ${isActive
                ? 'bg-accent-primary text-bg-primary'
                : 'bg-transparent text-text-tertiary border border-border-inactive'
              }
            `}
          >
            {label} ({counts[key]})
          </button>
        )
      })}
    </div>
  )
}
