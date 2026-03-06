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
      setGpsEnabled(true)
      setCurrentPos({ lat: pos.coords.latitude, lng: pos.coords.longitude })
    }

    const error = () => {
      setGpsEnabled(false)
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 5000,
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
