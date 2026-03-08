'use client'
import { useEffect, useRef, useCallback, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { Location, MarkerState, haversineDistance } from '@/types'
import { useAppStore, selectClaimedLocationIds } from '@/store/appStore'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ''

// Dark map style matching spec
const DARK_STYLE = 'mapbox://styles/mapbox/dark-v11'

// Color for marker states
function getMarkerColor(state: MarkerState, rarity: string): string {
  if (state === 'out-of-range') return '#5A5A70'
  if (rarity === 'legendary')   return '#FFB84D'
  if (rarity === 'rare')        return '#7B68EE'
  if (rarity === 'uncommon')    return '#00E5A0'
  return '#A0A0B8'
}

function createMarkerEl(state: MarkerState, rarity: string): HTMLDivElement {
  const size = state === 'in-range' ? 48 : 40
  const el = document.createElement('div')
  el.style.cssText = `
    width: ${size}px;
    height: ${size}px;
    border-radius: 50%;
    background: ${getMarkerColor(state, rarity)};
    border: ${state === 'claimed' ? '2px solid #FFD700' : '2px solid rgba(255,255,255,0.2)'};
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 300ms ease-out, opacity 300ms ease-out;
    box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    ${state === 'in-range' ? 'animation: marker-pulse 1.5s ease-in-out infinite;' : ''}
    ${state === 'claimed'  ? 'animation: gold-shimmer 3s linear infinite;' : ''}
  `
  el.innerHTML = `<span style="font-size:18px;">✦</span>`
  return el
}

export function MapCanvas() {
  const mapContainerRef  = useRef<HTMLDivElement>(null)
  const mapRef           = useRef<mapboxgl.Map | null>(null)
  const markersRef       = useRef<Map<string, mapboxgl.Marker>>(new Map())
  const markerStateRef   = useRef<Map<string, MarkerState>>(new Map())
  const userMarkerRef    = useRef<mapboxgl.Marker | null>(null)
  const userAvatarRef    = useRef<string | null>(null)

  const locations       = useAppStore((s) => s.locations)
  const currentPosition = useAppStore((s) => s.currentPosition)
  const avatar          = useAppStore((s) => s.user.avatar)
  const openClaim       = useAppStore((s) => s.openClaim)
  const showToast       = useAppStore((s) => s.showToast)
  const claimedIds      = useAppStore(selectClaimedLocationIds)
  const gpsEnabled      = useAppStore((s) => s.gpsEnabled)
  const [userOffScreen, setUserOffScreen] = useState(false)

  // Check if user marker is visible in viewport
  useEffect(() => {
    const map = mapRef.current
    if (!map || !currentPosition) {
      setUserOffScreen(false)
      return
    }

    const checkVisibility = () => {
      const bounds = map.getBounds()
      if (!bounds) return
      const inView = bounds.contains([currentPosition.lng, currentPosition.lat])
      setUserOffScreen(!inView)
    }

    checkVisibility()
    map.on('moveend', checkVisibility)
    return () => { map.off('moveend', checkVisibility) }
  }, [currentPosition])

  const recenterOnUser = useCallback(() => {
    const map = mapRef.current
    if (!map || !currentPosition) return
    map.flyTo({ center: [currentPosition.lng, currentPosition.lat], zoom: 15, duration: 800 })
  }, [currentPosition])

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    mapboxgl.accessToken = MAPBOX_TOKEN

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: DARK_STYLE,
      center: [103.8580, 1.3012], // Haji Lane, Singapore
      zoom: 15,
      minZoom: 15,
      attributionControl: false,
      logoPosition: 'bottom-right',
    })

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Update location markers
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const updateMarkers = () => {
      locations.forEach((location) => {
        const dist = currentPosition
          ? haversineDistance(currentPosition, location.coordinates)
          : Infinity
        console.log('[Marker]', location.name, 'dist:', Math.round(dist), 'm')
        const state: MarkerState = claimedIds.has(location.id)
          ? 'claimed'
          : dist <= 2000
          ? 'in-range'
          : 'out-of-range'

        // Always store latest state so click handler reads current value
        markerStateRef.current.set(location.id, state)

        const existing = markersRef.current.get(location.id)
        if (existing) {
          // Update marker element in place
          const el = existing.getElement()
          const size = state === 'in-range' ? 48 : 40
          el.style.width  = `${size}px`
          el.style.height = `${size}px`
          el.style.background = getMarkerColor(state, location.rarity)
          el.style.border = state === 'claimed' ? '2px solid #FFD700' : '2px solid rgba(255,255,255,0.2)'
          el.style.animation = state === 'in-range'
            ? 'marker-pulse 1.5s ease-in-out infinite'
            : state === 'claimed'
            ? 'gold-shimmer 3s linear infinite'
            : 'none'
        } else {
          const el = createMarkerEl(state, location.rarity)

          el.addEventListener('click', () => {
            const currentState = markerStateRef.current.get(location.id)
            console.log('[Marker] Clicked', location.name, 'state:', currentState)
            if (currentState === 'in-range') {
              openClaim(location.id)
            } else if (currentState === 'claimed') {
              showToast('Already claimed this location!', 'info')
            } else {
              mapRef.current?.flyTo({
                center: [location.coordinates.lng, location.coordinates.lat],
                zoom: 15,
                duration: 800,
              })
            }
          })

          const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
            .setLngLat([location.coordinates.lng, location.coordinates.lat])
            .addTo(map)

          markersRef.current.set(location.id, marker)
        }
      })
    }

    if (map.isStyleLoaded()) {
      updateMarkers()
    } else {
      map.once('load', updateMarkers)
    }
  }, [locations, currentPosition, claimedIds, openClaim, showToast])

  // Update user position marker
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (!currentPosition) {
      userMarkerRef.current?.remove()
      userMarkerRef.current = null
      return
    }

    const { lat, lng } = currentPosition

    // Recreate marker if avatar changed
    if (userMarkerRef.current && userAvatarRef.current !== avatar) {
      userMarkerRef.current.remove()
      userMarkerRef.current = null
    }

    if (userMarkerRef.current) {
      userMarkerRef.current.setLngLat([lng, lat])
    } else {
      userAvatarRef.current = avatar
      const avatarSize = (avatar === 'male' || avatar === 'female') ? 64 : 48

      const wrapper = document.createElement('div')
      wrapper.style.cssText = `
        position: relative;
        width: ${avatarSize}px;
        height: ${avatarSize}px;
      `

      // Proximity pulse ring
      const pulse = document.createElement('div')
      pulse.style.cssText = `
        position: absolute;
        width: 200px;
        height: 200px;
        border-radius: 50%;
        background: rgba(255,184,77,0.15);
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        animation: proximity-pulse 2s ease-out infinite;
        pointer-events: none;
      `
      wrapper.appendChild(pulse)

      // Avatar element (absolutely positioned to center on wrapper)
      const el = document.createElement('div')
      el.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: ${avatarSize}px;
        height: ${avatarSize}px;
        cursor: default;
        z-index: 1;
      `
      if (avatar === 'male' || avatar === 'female') {
        const img = document.createElement('img')
        img.src = `/avatars/position-${avatar}.png`
        img.alt = avatar
        img.style.cssText = `width: 100%; height: 100%; object-fit: contain; pointer-events: none;`
        el.appendChild(img)
      } else {
        el.style.cssText += `
          border-radius: 50%;
          background: #FFB84D;
          border: 3px solid #FFFFFF;
          box-shadow: 0 0 16px rgba(255,184,77,0.5);
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        `
        el.innerHTML = `<span style="font-size:22px;">🧭</span>`
      }
      wrapper.appendChild(el)

      const marker = new mapboxgl.Marker({ element: wrapper, anchor: 'center' })
        .setLngLat([lng, lat])
        .addTo(map)

      userMarkerRef.current = marker

      // Pan to user on first fix
      map.flyTo({ center: [lng, lat], zoom: 15, duration: 1000 })
    }
  }, [currentPosition, avatar])

  return (
    <>
      <div
        ref={mapContainerRef}
        className="absolute inset-0 w-full h-full"
        style={{ zIndex: 0 }}
      />
      {userOffScreen && (
        <button
          onClick={recenterOnUser}
          className="fixed z-[10] flex items-center gap-2 px-4 py-2 rounded-full bg-bg-secondary/90 backdrop-blur-sm border border-border-subtle shadow-lg transition-all active:scale-95"
          style={{ bottom: 'calc(100px + env(safe-area-inset-bottom, 0px))', left: '50%', transform: 'translateX(-50%)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent-primary">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="3" />
            <line x1="12" y1="2" x2="12" y2="6" />
            <line x1="12" y1="18" x2="12" y2="22" />
            <line x1="2" y1="12" x2="6" y2="12" />
            <line x1="18" y1="12" x2="22" y2="12" />
          </svg>
          <span className="text-text-primary text-sm font-semibold font-nunito">Re-center</span>
        </button>
      )}
    </>
  )
}
