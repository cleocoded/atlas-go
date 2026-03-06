'use client'
import { useState }     from 'react'
import { useAppStore }  from '@/store/appStore'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { Button }       from '@/components/ui/Button'
import { AvatarType }   from '@/types'

interface AvatarOption {
  type: AvatarType
  emoji: string
  label: string
}

const OPTIONS: AvatarOption[] = [
  { type: 'male',   emoji: '👨', label: 'Explorer' },
  { type: 'female', emoji: '👩', label: 'Explorer' },
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

      <div className="flex-1 flex flex-col items-center justify-center gap-8 px-8">
        <div className="flex gap-6 items-end justify-center w-full">
          {OPTIONS.map((opt) => {
            const isSelected = selected === opt.type
            return (
              <button
                key={opt.type}
                onClick={() => setSelected(opt.type)}
                className={`
                  flex flex-col items-center gap-3 transition-all duration-200 ease-out active:scale-[0.97]
                  ${isSelected ? 'scale-105' : 'scale-100 opacity-70'}
                `}
              >
                <div
                  className={`
                    w-40 h-72 rounded-card flex items-center justify-center bg-bg-elevated
                    transition-all duration-200
                    ${isSelected
                      ? 'border-2 border-accent-primary shadow-glow-accent'
                      : 'border border-border-default'
                    }
                  `}
                >
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-8xl">{opt.emoji}</span>
                    <span className="text-body-md text-text-secondary font-medium">{opt.label}</span>
                  </div>
                  {isSelected && (
                    <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-accent-primary flex items-center justify-center">
                      <span className="text-bg-primary text-xs font-bold">✓</span>
                    </div>
                  )}
                </div>
                <span
                  className={`text-label font-semibold capitalize ${isSelected ? 'text-accent-primary' : 'text-text-tertiary'}`}
                >
                  {opt.type}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="px-4 pb-safe" style={{ paddingBottom: `max(32px, calc(32px + env(safe-area-inset-bottom, 0px)))` }}>
        <Button variant="primary" fullWidth size="lg" onClick={handleConfirm}>
          Choose This Explorer
        </Button>
      </div>
    </div>
  )
}
