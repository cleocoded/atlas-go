'use client'
import { useState }    from 'react'
import Image           from 'next/image'
import { useAppStore } from '@/store/appStore'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { Button }       from '@/components/ui/Button'
import { AvatarType }   from '@/types'

const OPTIONS: { type: AvatarType; label: string }[] = [
  { type: 'male',   label: 'Male Explorer'   },
  { type: 'female', label: 'Female Explorer' },
]

export function AvatarSelectScreen() {
  const currentAvatar = useAppStore((s) => s.user.avatar)
  const setAvatar     = useAppStore((s) => s.setAvatar)
  const navigate      = useAppStore((s) => s.navigate)

  const [selected, setSelected] = useState<AvatarType>(
    currentAvatar === 'none' ? 'male' : currentAvatar
  )

  const handleConfirm = () => {
    setAvatar(selected)
    navigate('profile')
  }

  return (
    <div className="flex flex-col w-full h-full bg-bg-primary screen-enter">
      <ScreenHeader title="Choose Your Explorer" onBack={() => navigate('profile')} />

      <div className="flex-1 flex flex-col items-center justify-center gap-8 px-6">
        <div className="flex gap-5 items-end justify-center w-full">
          {OPTIONS.map((opt) => {
            const isSelected = selected === opt.type
            return (
              <button
                key={opt.type}
                onClick={() => setSelected(opt.type)}
                className={`
                  relative flex flex-col items-center gap-3 transition-all duration-200 ease-out active:scale-[0.97]
                  ${isSelected ? 'scale-105' : 'scale-100 opacity-60'}
                `}
              >
                <div
                  className={`
                    w-40 h-64 rounded-card overflow-hidden bg-bg-elevated
                    transition-all duration-200
                    ${isSelected
                      ? 'border-2 border-accent-primary shadow-glow-accent'
                      : 'border border-border-default'
                    }
                  `}
                >
                  <Image
                    src={`/avatars/profile-${opt.type}.png`}
                    alt={opt.label}
                    width={160}
                    height={256}
                    className="w-full h-full object-cover object-top"
                  />
                </div>

                {/* Checkmark badge */}
                {isSelected && (
                  <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-accent-primary flex items-center justify-center shadow-button">
                    <span className="text-bg-primary text-xs font-bold">✓</span>
                  </div>
                )}

                <span
                  className={`text-label font-semibold ${isSelected ? 'text-accent-primary' : 'text-text-tertiary'}`}
                >
                  {opt.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div
        className="px-4"
        style={{ paddingBottom: `max(32px, calc(32px + env(safe-area-inset-bottom, 0px)))` }}
      >
        <Button variant="primary" fullWidth size="lg" onClick={handleConfirm}>
          Choose This Explorer
        </Button>
      </div>
    </div>
  )
}
