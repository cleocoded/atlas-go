import { NextRequest, NextResponse } from 'next/server'
import type { Location } from '@/types'
import { getRarity } from '@/types'

/**
 * GET /api/locations?lat=...&lng=...
 * Returns partnership locations. When lat/lng provided, always includes
 * a few nearby demo locations so there's always something to claim.
 */
const SINGAPORE_LOCATIONS: Omit<Location, 'rarity'>[] = [
  {
    id: 'loc-paypal-sf',
    name: 'PayPal Innovation Lab',
    partnerName: 'PayPal',
    partnerLogo: '/logos/paypal.svg',
    coordinates: { lat: 1.3007, lng: 103.8591 },
    poapArtwork: '/poap/paypal-sf.svg',
    poapArtTitle: 'Golden Gate Sunrise',
    boostPercentage: 300,
    boostDurationHours: 72,
    isActive: true,
  },
  {
    id: 'loc-flow-hq',
    name: 'Flow Foundation HQ',
    partnerName: 'Flow',
    partnerLogo: '/logos/flow.svg',
    coordinates: { lat: 1.3025, lng: 103.8565 },
    poapArtwork: '/poap/flow-hq.svg',
    poapArtTitle: 'Bay Bridge Blaze',
    boostPercentage: 450,
    boostDurationHours: 48,
    isActive: true,
  },
  {
    id: 'loc-paypal-downtown',
    name: 'PayPal Downtown',
    partnerName: 'PayPal',
    partnerLogo: '/logos/paypal.svg',
    coordinates: { lat: 1.2994, lng: 103.8555 },
    poapArtwork: '/poap/paypal-downtown.svg',
    poapArtTitle: null,
    boostPercentage: 220,
    boostDurationHours: 24,
    isActive: true,
  },
  {
    id: 'loc-flow-events',
    name: 'Flow Hackathon Space',
    partnerName: 'Flow',
    partnerLogo: '/logos/flow.svg',
    coordinates: { lat: 1.3018, lng: 103.8612 },
    poapArtwork: '/poap/flow-events.svg',
    poapArtTitle: 'Sunset District Badge',
    boostPercentage: 380,
    boostDurationHours: 96,
    isActive: true,
  },
]

/** Generate demo locations near a given position */
function generateNearbyLocations(lat: number, lng: number): Omit<Location, 'rarity'>[] {
  // Offsets in degrees (~50m each at most latitudes)
  const nearby = [
    { dlat: 0.0003, dlng: 0.0004, name: 'Flow Café', title: 'Local Explorer', boost: 250, hours: 48 },
    { dlat: -0.0005, dlng: 0.0002, name: 'Flow Pop-Up', title: 'Street Discovery', boost: 350, hours: 72 },
    { dlat: 0.0002, dlng: -0.0006, name: 'Flow Lounge', title: 'Neighborhood Badge', boost: 420, hours: 96 },
    { dlat: -0.0008, dlng: -0.0003, name: 'Flow Gallery', title: 'Art District Pass', boost: 180, hours: 24 },
  ]

  return nearby.map((n, i) => ({
    id: `loc-nearby-${i}`,
    name: n.name,
    partnerName: 'Flow',
    partnerLogo: '/logos/flow.svg',
    coordinates: { lat: lat + n.dlat, lng: lng + n.dlng },
    poapArtwork: '/poap/flow-hq.svg',
    poapArtTitle: n.title,
    boostPercentage: n.boost,
    boostDurationHours: n.hours,
    isActive: true,
  }))
}

/** Check if a position is near the Singapore demo cluster */
function isNearSingapore(lat: number, lng: number): boolean {
  return Math.abs(lat - 1.3010) < 0.05 && Math.abs(lng - 103.858) < 0.05
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')

  let allLocations = [...SINGAPORE_LOCATIONS]

  // If user position provided and they're NOT already near Singapore, add nearby POAPs
  if (lat && lng) {
    const userLat = parseFloat(lat)
    const userLng = parseFloat(lng)
    if (!isNaN(userLat) && !isNaN(userLng) && !isNearSingapore(userLat, userLng)) {
      allLocations = [...allLocations, ...generateNearbyLocations(userLat, userLng)]
    }
  }

  const locations: Location[] = allLocations.map((l) => ({
    ...l,
    rarity: getRarity(l.boostPercentage),
  }))

  return NextResponse.json(locations, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  })
}
