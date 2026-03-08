'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useAppStore } from '@/store/appStore'
import { privyLogoutRef } from '@/components/App'
import { Button } from '@/components/ui/Button'
import { AvatarType } from '@/types'

const AVATARS: { type: AvatarType; label: string }[] = [
  { type: 'male', label: 'Male' },
  { type: 'female', label: 'Female' },
]

function getDefaultName(email?: string | null): string {
  if (!email) return ''
  return email.split('@')[0].replace(/[._+]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

interface Props {
  email?: string | null
}

export function OnboardingScreen({ email }: Props) {
  const completeOnboarding = useAppStore((s) => s.completeOnboarding)

  const [selectedAvatar, setSelectedAvatar] = useState<AvatarType>('female')
  const [username, setUsername] = useState(() => getDefaultName(email))

  // Update default name if email arrives after login
  useEffect(() => {
    if (email && !username) {
      setUsername(getDefaultName(email))
    }
  }, [email])

  const handleComplete = () => {
    const finalName = username.trim() || 'Explorer'
    completeOnboarding(finalName, selectedAvatar)
  }

  return (
    <div className="absolute inset-0 z-10 flex flex-col bg-bg-primary/95 backdrop-blur-sm overflow-auto">
      {/* Sign out */}
      <button
        onClick={() => privyLogoutRef.current?.()}
        className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-bg-elevated/80 border border-border-default flex items-center justify-center active:scale-95 transition-transform"
        style={{ marginTop: 'env(safe-area-inset-top, 0px)' }}
        aria-label="Sign out"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-text-tertiary">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      </button>

      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6 py-8">
        <div className="text-center">
          <h2 className="text-heading-md font-bold text-text-primary font-nunito">
            Set up your profile
          </h2>
          <p className="text-body-sm text-text-secondary mt-2">
            Choose your explorer and pick a name
          </p>
        </div>

        {/* Avatar selection */}
        <div className="flex gap-5 items-end justify-center w-full">
          {AVATARS.map((opt) => {
            const isSelected = selectedAvatar === opt.type
            return (
              <button
                key={opt.type}
                onClick={() => setSelectedAvatar(opt.type)}
                className={`
                  relative flex flex-col items-center gap-3 transition-all duration-200 ease-out active:scale-[0.97]
                  ${isSelected ? 'scale-105' : 'scale-100 opacity-60'}
                `}
              >
                <div
                  className={`
                    w-32 h-48 rounded-card overflow-hidden bg-bg-elevated
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
                    width={128}
                    height={192}
                    className="w-full h-full object-cover object-top"
                  />
                </div>

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

        {/* Name input */}
        <div className="w-full max-w-xs">
          <label className="text-label text-text-secondary mb-2 block">Display Name</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your name"
            maxLength={24}
            className="w-full px-4 py-3 rounded-xl bg-bg-elevated border border-border-default text-text-primary text-body-md font-nunito placeholder:text-text-tertiary focus:outline-none focus:border-accent-primary transition-colors"
          />
        </div>
      </div>

      <div className="shrink-0 px-4" style={{ paddingBottom: `max(32px, calc(32px + env(safe-area-inset-bottom, 0px)))` }}>
        <Button variant="primary" fullWidth size="lg" onClick={handleComplete}>
          Start Exploring
        </Button>
      </div>
    </div>
  )
}
