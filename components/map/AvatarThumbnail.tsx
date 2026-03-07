'use client'
import Image from 'next/image'
import { useAppStore } from '@/store/appStore'

export function AvatarThumbnail() {
  const avatar   = useAppStore((s) => s.user.avatar)
  const navigate = useAppStore((s) => s.navigate)

  return (
    <button
      onClick={() => navigate('profile')}
      className="fixed left-4 z-[10] w-24 h-24 flex items-end justify-center active:scale-95 transition-transform"
      style={{ bottom: `calc(6px + env(safe-area-inset-bottom, 0px))` }}
      aria-label="Open profile"
    >
      {avatar === 'none' ? (
        <div className="w-full h-full rounded-full bg-text-disabled" />
      ) : (
        <Image
          src={`/avatars/thumbnail-${avatar}.png`}
          alt={avatar}
          width={96}
          height={96}
          className="w-full h-full object-contain"
        />
      )}
    </button>
  )
}
