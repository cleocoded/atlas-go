'use client'
import { useState } from 'react'
import { useAppStore } from '@/store/appStore'

export function GPSBanner() {
  const [requesting, setRequesting] = useState(false)
  const setGpsEnabled = useAppStore((s) => s.setGpsEnabled)
  const setCurrentPos = useAppStore((s) => s.setCurrentPosition)

  const requestLocation = () => {
    if (requesting || !navigator.geolocation) return
    setRequesting(true)
    console.log('[GPS] Retrying location request...')

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        console.log('[GPS] Retry success:', pos.coords.latitude.toFixed(5), pos.coords.longitude.toFixed(5))
        setGpsEnabled(true)
        setCurrentPos({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setRequesting(false)
      },
      (err) => {
        const reasons: Record<number, string> = { 1: 'PERMISSION_DENIED', 2: 'POSITION_UNAVAILABLE', 3: 'TIMEOUT' }
        console.warn('[GPS] Retry failed:', reasons[err.code] || err.code, err.message)
        setRequesting(false)

        if (err.code === 1) {
          alert('Location permission denied. Please enable it in your browser settings and reload.')
        }
      },
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 },
    )
  }

  return (
    <div
      className="fixed left-0 right-0 z-[15] flex items-center justify-center h-12 bg-accent-danger px-4 cursor-pointer"
      style={{ top: `env(safe-area-inset-top, 0px)` }}
      onClick={requestLocation}
      role="button"
      aria-label="Enable location"
    >
      <span className="text-white text-body-md font-semibold">
        {requesting ? 'Requesting location…' : 'Tap to enable location'}
      </span>
    </div>
  )
}
