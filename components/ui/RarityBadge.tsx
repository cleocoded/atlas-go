import { RarityTier, RARITY_CONFIG } from '@/types'

export function RarityBadge({ rarity }: { rarity: RarityTier }) {
  const config = RARITY_CONFIG[rarity]

  return (
    <span
      className="inline-block px-3 py-0.5 rounded-pill text-body-sm font-semibold uppercase tracking-wide border"
      style={{
        backgroundColor: `${config.color}20`,
        color: config.color,
        borderColor: `${config.color}66`,
      }}
    >
      {config.label}
    </span>
  )
}
