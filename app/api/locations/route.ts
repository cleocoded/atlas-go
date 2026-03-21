import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/locations?lat=...&lng=...
 * Returns partnership locations. Rarity is now determined on-chain at claim time,
 * so locations no longer carry boostPercentage/boostDurationHours/rarity.
 * mythicalClaimed indicates if the one mythical emblem has already been minted.
 */

interface LocationData {
  id: string
  name: string
  partnerName: string
  partnerLogo: string
  coordinates: { lat: number; lng: number }
  emblemArtwork: string
  emblemArtTitle: string | null
  isActive: boolean
  mythicalClaimed: boolean
}

const SINGAPORE_LOCATIONS: LocationData[] = [
  {
    id: 'loc-paypal-sf',
    name: 'PayPal Innovation Lab',
    partnerName: 'PayPal',
    partnerLogo: '/logos/paypal.svg',
    coordinates: { lat: 1.3007, lng: 103.8591 },
    emblemArtwork: '/emblems/paypal-sf.svg',
    emblemArtTitle: 'Golden Gate Sunrise',
    isActive: true,
    mythicalClaimed: false,
  },
  {
    id: 'loc-flow-hq',
    name: 'Flow Foundation HQ',
    partnerName: 'Flow',
    partnerLogo: '/logos/flow.svg',
    coordinates: { lat: 1.3025, lng: 103.8565 },
    emblemArtwork: '/emblems/flow-hq.svg',
    emblemArtTitle: 'Bay Bridge Blaze',
    isActive: true,
    mythicalClaimed: false,
  },
  {
    id: 'loc-paypal-downtown',
    name: 'PayPal Downtown',
    partnerName: 'PayPal',
    partnerLogo: '/logos/paypal.svg',
    coordinates: { lat: 1.2994, lng: 103.8555 },
    emblemArtwork: '/emblems/paypal-downtown.svg',
    emblemArtTitle: null,
    isActive: true,
    mythicalClaimed: false,
  },
  {
    id: 'loc-flow-events',
    name: 'Flow Hackathon Space',
    partnerName: 'Flow',
    partnerLogo: '/logos/flow.svg',
    coordinates: { lat: 1.3018, lng: 103.8612 },
    emblemArtwork: '/emblems/flow-events.svg',
    emblemArtTitle: 'Sunset District Badge',
    isActive: true,
    mythicalClaimed: false,
  },
]

/** Generate demo locations near a given position */
function generateNearbyLocations(lat: number, lng: number): LocationData[] {
  const nearby = [
    { dlat: 0.0003, dlng: 0.0004, name: 'Flow Cafe', title: 'Local Explorer' },
    { dlat: -0.0005, dlng: 0.0002, name: 'Flow Pop-Up', title: 'Street Discovery' },
    { dlat: 0.0002, dlng: -0.0006, name: 'Flow Lounge', title: 'Neighborhood Badge' },
    { dlat: -0.0008, dlng: -0.0003, name: 'Flow Gallery', title: 'Art District Pass' },
  ]

  return nearby.map((n, i) => ({
    id: `loc-nearby-${i}`,
    name: n.name,
    partnerName: 'Flow',
    partnerLogo: '/logos/flow.svg',
    coordinates: { lat: lat + n.dlat, lng: lng + n.dlng },
    emblemArtwork: '/emblems/flow-hq.svg',
    emblemArtTitle: n.title,
    isActive: true,
    mythicalClaimed: false,
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

  // If user position provided and they're NOT already near Singapore, add nearby emblems
  if (lat && lng) {
    const userLat = parseFloat(lat)
    const userLng = parseFloat(lng)
    if (!isNaN(userLat) && !isNaN(userLng) && !isNearSingapore(userLat, userLng)) {
      allLocations = [...allLocations, ...generateNearbyLocations(userLat, userLng)]
    }
  }

  // TODO: When contracts are deployed, query isMythicalClaimed for each location
  // and set mythicalClaimed accordingly

  return NextResponse.json(allLocations, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  })
}
