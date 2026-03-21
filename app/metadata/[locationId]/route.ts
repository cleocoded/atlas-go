import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /metadata/<locationId>.json
 * Serves ERC-721 metadata for Atlas Go Emblem NFTs.
 * Image URLs are absolute so block explorers and wallets can resolve them.
 */

interface EmblemMetadata {
  name: string
  description: string
  image: string        // relative path — rewritten to absolute at response time
  partner: string
  location: string
  city?: string
}

const EMBLEM_METADATA: Record<string, EmblemMetadata> = {
  'loc-marina-bay': {
    name: 'Marina Bay Nights',
    description: 'An Atlas Go emblem earned by visiting Marina Bay Sands in Singapore. This collectible NFT unlocks a temporary yield boost on stgUSDC deposits.',
    image: '/emblems/emblem-1-transparent.png',
    partner: 'PayPal',
    location: 'Marina Bay Sands',
    city: 'Singapore',
  },
  'loc-supertree': {
    name: 'Garden of Light',
    description: 'An Atlas Go emblem earned by visiting Supertree Grove at Gardens by the Bay in Singapore. This collectible NFT unlocks a temporary yield boost on stgUSDC deposits.',
    image: '/emblems/emblem-2-transparent.png',
    partner: 'Flow',
    location: 'Supertree Grove',
    city: 'Singapore',
  },
  'loc-merlion': {
    name: 'Guardian of the Bay',
    description: 'An Atlas Go emblem earned by visiting Merlion Park in Singapore. This collectible NFT unlocks a temporary yield boost on stgUSDC deposits.',
    image: '/emblems/emblem-3-transparent.png',
    partner: 'PayPal',
    location: 'Merlion Park',
    city: 'Singapore',
  },
  'loc-cafe': {
    name: 'Cozy Corner',
    description: 'An Atlas Go emblem earned by visiting Flow Cafe in Singapore. This collectible NFT unlocks a temporary yield boost on stgUSDC deposits.',
    image: '/emblems/emblem-4-transparent.png',
    partner: 'Flow',
    location: 'Flow Cafe',
    city: 'Singapore',
  },
  'loc-nearby-0': {
    name: 'Sweet Discovery',
    description: 'An Atlas Go emblem earned by visiting a local bakery. This collectible NFT unlocks a temporary yield boost on stgUSDC deposits.',
    image: '/emblems/emblem-5-transparent.png',
    partner: 'Flow',
    location: 'Local Bakery',
  },
  'loc-nearby-1': {
    name: 'Street Discovery',
    description: 'An Atlas Go emblem earned by visiting Flow Pop-Up. This collectible NFT unlocks a temporary yield boost on stgUSDC deposits.',
    image: '/emblems/emblem-4-transparent.png',
    partner: 'Flow',
    location: 'Flow Pop-Up',
  },
  'loc-nearby-2': {
    name: 'Neighborhood Badge',
    description: 'An Atlas Go emblem earned by visiting Flow Lounge. This collectible NFT unlocks a temporary yield boost on stgUSDC deposits.',
    image: '/emblems/emblem-2-transparent.png',
    partner: 'Flow',
    location: 'Flow Lounge',
  },
  'loc-nearby-3': {
    name: 'Art District Pass',
    description: 'An Atlas Go emblem earned by visiting Flow Gallery. This collectible NFT unlocks a temporary yield boost on stgUSDC deposits.',
    image: '/emblems/emblem-1-transparent.png',
    partner: 'Flow',
    location: 'Flow Gallery',
  },
}

export async function GET(
  req: NextRequest,
  { params }: { params: { locationId: string } }
) {
  const { locationId } = params
  const id = locationId.replace(/\.json$/, '')
  const meta = EMBLEM_METADATA[id]

  if (!meta) {
    return NextResponse.json({ error: 'Metadata not found' }, { status: 404 })
  }

  const origin = req.nextUrl.origin
  const attributes = [
    { trait_type: 'Location', value: meta.location },
    { trait_type: 'Partner', value: meta.partner },
    { trait_type: 'Collection', value: 'Atlas Go Emblems' },
  ]
  if (meta.city) {
    attributes.splice(1, 0, { trait_type: 'City', value: meta.city })
  }

  return NextResponse.json(
    {
      name: meta.name,
      description: meta.description,
      image: `${origin}${meta.image}`,
      external_url: 'https://atlasgo.app',
      attributes,
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
        'Access-Control-Allow-Origin': '*',
      },
    }
  )
}
