'use client'
import { useEffect, useRef, useCallback } from 'react'
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
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef          = useRef<mapboxgl.Map | null>(null)
  const markersRef      = useRef<Map<string, mapboxgl.Marker>>(new Map())
  const userMarkerRef   = useRef<mapboxgl.Marker | null>(null)

  const locations       = useAppStore((s) => s.locations)
  const currentPosition = useAppStore((s) => s.currentPosition)
  const avatar          = useAppStore((s) => s.user.avatar)
  const openClaim       = useAppStore((s) => s.openClaim)
  const showToast       = useAppStore((s) => s.showToast)
  const claimedIds      = useAppStore(selectClaimedLocationIds)
  const gpsEnabled      = useAppStore((s) => s.gpsEnabled)

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    mapboxgl.accessToken = MAPBOX_TOKEN

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: DARK_STYLE,
      center: [-122.4194, 37.7749], // San Francisco default
      zoom: 13,
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
        const state: MarkerState = claimedIds.has(location.id)
          ? 'claimed'
          : dist <= 100
          ? 'in-range'
          : 'out-of-range'

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
            if (state === 'in-range') {
              openClaim(location.id)
            } else if (state === 'claimed') {
              showToast('Already claimed this location!', 'info')
            } else {
              // Pan to location
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

    if (userMarkerRef.current) {
      userMarkerRef.current.setLngLat([lng, lat])
    } else {
      const el = document.createElement('div')
      el.style.cssText = `
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: #FFB84D;
        border: 3px solid #FFFFFF;
        box-shadow: 0 0 16px rgba(255,184,77,0.5);
        cursor: default;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
      `
      // Show avatar initials / icon
      el.innerHTML = `<span style="font-size:22px;">${avatar === 'female' ? '👩' : avatar === 'male' ? '👨' : '🧭'}</span>`

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
        transform: translate(-50%, -50%) scale(0.5);
        animation: proximity-pulse 2s ease-out infinite;
        pointer-events: none;
      `

      const wrapper = document.createElement('div')
      wrapper.style.cssText = 'position:relative;'
      wrapper.appendChild(pulse)
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
    <div
      ref={mapContainerRef}
      className="absolute inset-0 w-full h-full"
      style={{ zIndex: 0 }}
    />
  )
}
