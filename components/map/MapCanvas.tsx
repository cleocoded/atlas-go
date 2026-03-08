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
      minZoom: 13,
      attributionControl: false,
      logoPosition: 'bottom-right',
    })

    // Soft zoom-out limit: ease back to 15 if user zooms out past it
    map.on('zoomend', () => {
      if (map.getZoom() < 15) {
        map.easeTo({ zoom: 15, duration: 300 })
      }
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

  // Geo-accurate range circle (scales with map zoom)
  useEffect(() => {
    const map = mapRef.current
    if (!map || !currentPosition) return

    const RANGE_METERS = 500
    const point = [currentPosition.lng, currentPosition.lat] as [number, number]

    // Generate a GeoJSON circle polygon from center + radius in meters
    const toCircleGeoJSON = (center: [number, number], meters: number, steps = 64) => {
      const coords: [number, number][] = []
      const km = meters / 1000
      for (let i = 0; i <= steps; i++) {
        const angle = (i / steps) * 2 * Math.PI
        const dx = km / (111.32 * Math.cos((center[1] * Math.PI) / 180))
        const dy = km / 110.574
        coords.push([center[0] + dx * Math.cos(angle), center[1] + dy * Math.sin(angle)])
      }
      return { type: 'Feature' as const, geometry: { type: 'Polygon' as const, coordinates: [coords] }, properties: {} }
    }

    const geoJSON = toCircleGeoJSON(point, RANGE_METERS)

    const addOrUpdate = () => {
      const source = map.getSource('user-range') as mapboxgl.GeoJSONSource | undefined
      if (source) {
        source.setData(geoJSON as any)
      } else {
        map.addSource('user-range', { type: 'geojson', data: geoJSON as any })
        map.addLayer({
          id: 'user-range-fill',
          type: 'fill',
          source: 'user-range',
          paint: { 'fill-color': '#FFB84D', 'fill-opacity': 0.08 },
        })
        map.addLayer({
          id: 'user-range-border',
          type: 'line',
          source: 'user-range',
          paint: { 'line-color': '#FFB84D', 'line-opacity': 0.25, 'line-width': 1.5 },
        })
      }
    }

    if (map.isStyleLoaded()) {
      addOrUpdate()
    } else {
      map.once('load', addOrUpdate)
    }
  }, [currentPosition])

  // Helper: create and add user marker to map
  const addUserMarker = useCallback((map: mapboxgl.Map, lat: number, lng: number) => {
    const av = userAvatarRef.current ?? 'none'
    const avatarSize = (av === 'male' || av === 'female') ? 64 : 48

    const el = document.createElement('div')
    el.style.cssText = `
      width: ${avatarSize}px;
      height: ${avatarSize}px;
      cursor: default;
    `
    if (av === 'male' || av === 'female') {
      const img = document.createElement('img')
      img.src = `/avatars/position-${av}.png`
      img.alt = av
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
      el.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M5.5 21a6.5 6.5 0 0 1 13 0"/></svg>`
    }

    const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
      .setLngLat([lng, lat])
      .addTo(map)

    userMarkerRef.current = marker
    console.log('[UserMarker] Added to map at', lat, lng, 'avatar:', av)
  }, [])

  // Ensure user marker is alive — checks DOM attachment, recreates if needed
  const ensureUserMarker = useCallback((map: mapboxgl.Map, lat: number, lng: number) => {
    if (userMarkerRef.current) {
      const el = userMarkerRef.current.getElement()
      const detached = !el.parentElement || !el.isConnected
      const avatarChanged = userAvatarRef.current !== avatar
      if (detached || avatarChanged) {
        console.log('[UserMarker] Recovering — detached:', detached, 'avatarChanged:', avatarChanged)
        userMarkerRef.current.remove()
        userMarkerRef.current = null
      }
    }

    if (userMarkerRef.current) {
      userMarkerRef.current.setLngLat([lng, lat])
    } else {
      userAvatarRef.current = avatar
      addUserMarker(map, lat, lng)
    }
  }, [avatar, addUserMarker])

  // Update user position marker (avatar only, no CSS pulse)
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (!currentPosition) {
      console.log('[UserMarker] No position, removing marker')
      userMarkerRef.current?.remove()
      userMarkerRef.current = null
      return
    }

    const { lat, lng } = currentPosition
    const isFirstCreate = !userMarkerRef.current

    ensureUserMarker(map, lat, lng)

    // Pan to user on first fix
    if (isFirstCreate && userMarkerRef.current) {
      map.flyTo({ center: [lng, lat], zoom: 15, duration: 1000 })
    }

    // Periodic health check — detect detachment between GPS updates
    const interval = setInterval(() => {
      if (userMarkerRef.current) {
        const el = userMarkerRef.current.getElement()
        if (!el.parentElement || !el.isConnected) {
          console.log('[UserMarker] Health check: marker detached, recovering')
          userMarkerRef.current.remove()
          userMarkerRef.current = null
          const pos = useAppStore.getState().currentPosition
          if (pos) {
            userAvatarRef.current = useAppStore.getState().user.avatar
            addUserMarker(map, pos.lat, pos.lng)
          }
        }
      }
    }, 2000)

    // Also recover after Mapbox style reload (can wipe DOM markers)
    const onStyleLoad = () => {
      console.log('[UserMarker] Style reloaded, recovering marker')
      userMarkerRef.current?.remove()
      userMarkerRef.current = null
      const pos = useAppStore.getState().currentPosition
      if (pos) {
        userAvatarRef.current = useAppStore.getState().user.avatar
        addUserMarker(map, pos.lat, pos.lng)
      }
    }
    map.on('style.load', onStyleLoad)

    return () => {
      clearInterval(interval)
      map.off('style.load', onStyleLoad)
    }
  }, [currentPosition, avatar, ensureUserMarker, addUserMarker])

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
