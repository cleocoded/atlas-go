'use client'
import { useEffect, useRef } from 'react'
import { MapCanvas }      from '@/components/map/MapCanvas'
import { POAPMenuButton } from '@/components/map/POAPMenuButton'
import { AvatarThumbnail } from '@/components/map/AvatarThumbnail'
import { PartnerLogos }   from '@/components/map/PartnerLogos'
import { GPSBanner }      from '@/components/map/GPSBanner'
import { useAppStore }    from '@/store/appStore'

export function MapScreen() {
  const gpsEnabled      = useAppStore((s) => s.gpsEnabled)
  const setGpsEnabled   = useAppStore((s) => s.setGpsEnabled)
  const setCurrentPos   = useAppStore((s) => s.setCurrentPosition)
  const tickYield       = useAppStore((s) => s.tickYield)
  const checkBoostExpiry = useAppStore((s) => s.checkBoostExpiry)
  const intervalRef     = useRef<ReturnType<typeof setInterval> | null>(null)
  const geoWatchRef     = useRef<number | null>(null)

  // Start GPS polling
  useEffect(() => {
    if (!navigator.geolocation) return

    const success = (pos: GeolocationPosition) => {
      console.log('[GPS] Position fix:', pos.coords.latitude.toFixed(5), pos.coords.longitude.toFixed(5), 'accuracy:', pos.coords.accuracy, 'm')
      setGpsEnabled(true)
      setCurrentPos({ lat: pos.coords.latitude, lng: pos.coords.longitude })
    }

    let failCount = 0
    const error = (err: GeolocationPositionError) => {
      const reasons: Record<number, string> = { 1: 'PERMISSION_DENIED', 2: 'POSITION_UNAVAILABLE', 3: 'TIMEOUT' }
      console.warn('[GPS] Error:', reasons[err.code] || err.code, err.message)
      failCount++
      // After 2 failures, use fallback position for demo (Haji Lane area)
      if (failCount >= 2 && err.code !== 1) {
        console.log('[GPS] Using fallback position for demo')
        setGpsEnabled(true)
        setCurrentPos({ lat: 1.3010, lng: 103.8585 })
      } else {
        setGpsEnabled(false)
      }
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 30000,
      maximumAge: 10000,
    }

    // Get initial position immediately
    navigator.geolocation.getCurrentPosition(success, error, options)

    // Then watch every 5 seconds
    geoWatchRef.current = navigator.geolocation.watchPosition(success, error, options)

    return () => {
      if (geoWatchRef.current !== null) {
        navigator.geolocation.clearWatch(geoWatchRef.current)
      }
    }
  }, [setGpsEnabled, setCurrentPos])

  // Yield tick every 100ms
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      tickYield()
      checkBoostExpiry()
    }, 100)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [tickYield, checkBoostExpiry])

  return (
    <div className="relative w-full h-full overflow-hidden">
      {!gpsEnabled && <GPSBanner />}
      <MapCanvas />
      <PartnerLogos />
      <AvatarThumbnail />
      <POAPMenuButton />
    </div>
  )
}
