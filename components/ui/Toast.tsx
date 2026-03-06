'use client'
import { useEffect } from 'react'
import { useAppStore } from '@/store/appStore'

export function Toast() {
  const toast = useAppStore((s) => s.toast)
  const clearToast = useAppStore((s) => s.clearToast)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(clearToast, 4000)
    return () => clearTimeout(t)
  }, [toast, clearToast])

  if (!toast) return null

  const colors = {
    info:    'bg-bg-card border-border-default text-text-primary',
    success: 'bg-bg-card border-accent-boost text-accent-boost',
    warning: 'bg-bg-card border-accent-primary text-accent-primary',
    error:   'bg-bg-card border-accent-danger text-accent-danger',
  }

  return (
    <div className="fixed top-safe bottom-auto left-1/2 -translate-x-1/2 z-50 px-4 mt-16 w-full max-w-mobile pointer-events-none">
      <div
        key={toast.id}
        className={`animate-fade-in rounded-card border px-4 py-3 text-body-md shadow-elevated ${colors[toast.type]}`}
      >
        {toast.text}
      </div>
    </div>
  )
}
