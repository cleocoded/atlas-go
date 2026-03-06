'use client'
import { useAppStore } from '@/store/appStore'

export function AvatarThumbnail() {
  const avatar   = useAppStore((s) => s.user.avatar)
  const navigate = useAppStore((s) => s.navigate)

  return (
    <button
      onClick={() => navigate('profile')}
      className="fixed left-4 z-[10] w-12 h-12 rounded-full overflow-hidden flex items-center justify-center active:scale-95 transition-transform"
      style={{ bottom: `calc(24px + env(safe-area-inset-bottom, 0px))` }}
      aria-label="Open profile"
    >
      {avatar === 'none' ? (
        <div className="w-full h-full rounded-full bg-text-disabled" />
      ) : (
        <div className="w-full h-full rounded-full bg-bg-elevated border-2 border-accent-primary/40 flex items-center justify-center">
          <span className="text-2xl">{avatar === 'female' ? '👩' : '👨'}</span>
        </div>
      )}
    </button>
  )
}
