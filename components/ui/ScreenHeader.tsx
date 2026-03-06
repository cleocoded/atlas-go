'use client'
import { ReactNode } from 'react'
import { useAppStore } from '@/store/appStore'

interface ScreenHeaderProps {
  title: string
  onBack?: () => void
  right?: ReactNode
}

export function ScreenHeader({ title, onBack, right }: ScreenHeaderProps) {
  const goBack = useAppStore((s) => s.goBack)

  return (
    <div className="flex items-center justify-between h-14 px-4 border-b border-border-default bg-bg-primary">
      <button
        onClick={onBack ?? goBack}
        className="w-11 h-11 flex items-center justify-center -ml-2 text-text-primary active:scale-95 transition-transform"
        aria-label="Back"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      <span className="text-heading font-bold text-text-primary">{title}</span>
      <div className="w-11 h-11 flex items-center justify-center">{right ?? null}</div>
    </div>
  )
}
