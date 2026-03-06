import { RarityTier } from '@/types'

const RARITY_STYLES: Record<RarityTier, string> = {
  common:    'bg-text-secondary/20 text-text-secondary border border-text-secondary/40',
  uncommon:  'bg-accent-boost/20 text-accent-boost border border-accent-boost/40',
  rare:      'bg-accent-secondary/20 text-accent-secondary border border-accent-secondary/40',
  legendary: 'bg-accent-primary/20 text-accent-primary border border-accent-primary/40',
}

export function RarityBadge({ rarity }: { rarity: RarityTier }) {
  return (
    <span
      className={`inline-block px-3 py-0.5 rounded-pill text-body-sm font-semibold uppercase tracking-wide ${RARITY_STYLES[rarity]}`}
    >
      {rarity}
    </span>
  )
}
