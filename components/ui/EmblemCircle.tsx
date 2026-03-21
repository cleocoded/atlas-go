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

export function EmblemCircle({ src, alt, size, rarity, isActive, className = '' }: EmblemCircleProps) {
  const borderClass = isActive
    ? rarity === 'mythical'
      ? 'border-rainbow'
      : rarity === 'legendary'
      ? 'border-gold-shimmer'
      : rarity === 'epic'
      ? 'border-2 border-[#7B68EE]'
      : rarity === 'rare'
      ? 'border-2 border-[#00E5A0]'
      : 'border-2 border-[#A0A0B8]'
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
