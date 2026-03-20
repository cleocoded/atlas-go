'use client'
import Image from 'next/image'
import { RarityTier } from '@/types'

interface EmblemCircleProps {
  src: string
  alt: string
  size: number
  rarity: RarityTier
  isActive: boolean
  className?: string
}

const BORDER_CLASS: Record<RarityTier, string> = {
  common:    'rarity-common',
  uncommon:  'rarity-uncommon',
  rare:      'rarity-rare',
  legendary: 'rarity-legendary',
}

export function EmblemCircle({ src, alt, size, rarity, isActive, className = '' }: EmblemCircleProps) {
  const borderClass = isActive
    ? rarity === 'legendary'
      ? 'border-rainbow'
      : 'border-gold-shimmer'
    : 'border-2 border-border-expired'

  const grayscaleClass = !isActive ? 'grayscale-[20%]' : ''

  return (
    <div
      className={`relative rounded-circle overflow-hidden flex-shrink-0 ${borderClass} ${grayscaleClass} ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover rounded-circle"
        sizes={`${size}px`}
        onError={(e) => {
          // Fallback to placeholder gradient
          const el = e.currentTarget as HTMLImageElement
          el.style.display = 'none'
        }}
      />
      {/* Fallback gradient shown when image fails */}
      <div
        className="absolute inset-0 rounded-circle bg-gradient-to-br from-accent-secondary/40 to-accent-primary/40 flex items-center justify-center"
        aria-hidden="true"
      >
        <span className="text-text-tertiary text-2xl">✦</span>
      </div>
    </div>
  )
}
