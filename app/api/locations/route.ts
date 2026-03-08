import { NextResponse } from 'next/server'
import type { Location } from '@/types'
import { getRarity } from '@/types'

/**
 * GET /api/locations
 * Returns the full list of active partnership locations.
 * In production, this data lives in a DB / CMS / on-chain registry.
 */
const LOCATIONS: Omit<Location, 'rarity'>[] = [
  {
    id: 'loc-paypal-sf',
    name: 'PayPal Innovation Lab',
    partnerName: 'PayPal',
    partnerLogo: '/logos/paypal.svg',
    coordinates: { lat: 1.3007, lng: 103.8591 },  // Haji Lane
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
    coordinates: { lat: 1.3025, lng: 103.8565 },  // Arab Street
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
    coordinates: { lat: 1.2994, lng: 103.8555 },  // Bussorah Street
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
    coordinates: { lat: 1.3018, lng: 103.8612 },  // Beach Road
    poapArtwork: '/poap/flow-events.svg',
    poapArtTitle: 'Sunset District Badge',
    boostPercentage: 380,
    boostDurationHours: 96,
    isActive: true,
  },
]

export async function GET() {
  const locations: Location[] = LOCATIONS.map((l) => ({
    ...l,
    rarity: getRarity(l.boostPercentage),
  }))

  return NextResponse.json(locations, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  })
}
