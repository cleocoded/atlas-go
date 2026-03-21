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
    id: 'loc-marina-bay',
    name: 'Marina Bay Sands',
    partnerName: 'PayPal',
    partnerLogo: '/logos/paypal.svg',
    coordinates: { lat: 1.2834, lng: 103.8607 },
    emblemArtwork: '/emblems/emblem-1-transparent.png',
    emblemArtTitle: 'Marina Bay Nights',
    isActive: true,
    mythicalClaimed: false,
  },
  {
    id: 'loc-supertree',
    name: 'Supertree Grove',
    partnerName: 'Flow',
    partnerLogo: '/logos/flow.svg',
    coordinates: { lat: 1.2816, lng: 103.8636 },
    emblemArtwork: '/emblems/emblem-2-transparent.png',
    emblemArtTitle: 'Garden of Light',
    isActive: true,
    mythicalClaimed: false,
  },
  {
    id: 'loc-merlion',
    name: 'Merlion Park',
    partnerName: 'PayPal',
    partnerLogo: '/logos/paypal.svg',
    coordinates: { lat: 1.2868, lng: 103.8545 },
    emblemArtwork: '/emblems/emblem-3-transparent.png',
    emblemArtTitle: 'Guardian of the Bay',
    isActive: true,
    mythicalClaimed: false,
  },
  {
    id: 'loc-cafe',
    name: 'Flow Cafe',
    partnerName: 'Flow',
    partnerLogo: '/logos/flow.svg',
    coordinates: { lat: 1.2850, lng: 103.8570 },
    emblemArtwork: '/emblems/emblem-4-transparent.png',
    emblemArtTitle: 'Cozy Corner',
    isActive: true,
    mythicalClaimed: false,
  },
]

// Emblem artwork pool — nearby locations cycle through these
const EMBLEM_ARTWORK_POOL = [
  '/emblems/emblem-5-transparent.png',
  '/emblems/emblem-4-transparent.png',
  '/emblems/emblem-2-transparent.png',
  '/emblems/emblem-1-transparent.png',
]

/** Generate demo locations near a given position */
function generateNearbyLocations(lat: number, lng: number): LocationData[] {
  const nearby = [
    { dlat: 0.0003, dlng: 0.0004, name: 'Local Bakery', title: 'Sweet Discovery' },
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
    emblemArtwork: EMBLEM_ARTWORK_POOL[i % EMBLEM_ARTWORK_POOL.length],
    emblemArtTitle: n.title,
    isActive: true,
    mythicalClaimed: false,
  }))
}

/** Check if a position is near the Singapore demo cluster */
function isNearSingapore(lat: number, lng: number): boolean {
  return Math.abs(lat - 1.2842) < 0.05 && Math.abs(lng - 103.859) < 0.05
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
