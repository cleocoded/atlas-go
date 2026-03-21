export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getProvider, getEmblemContract } from '@/lib/flowEvm'

const RARITY_NAMES = ['special', 'rare', 'epic', 'legendary', 'mythical'] as const

const RARITY_COLORS: Record<string, string> = {
  special: '#A0A0B8',
  rare: '#00E5A0',
  epic: '#7B68EE',
  legendary: '#FFD700',
  mythical: '#FF6BA0',
}

// Reverse-lookup: locationId bytes32 → location info
const LOCATION_INFO: Record<string, { artwork: string; name: string; artTitle: string; partner: string }> = {
  'loc-marina-bay': { artwork: '/emblems/emblem-1-transparent.png', name: 'Marina Bay Sands', artTitle: 'Marina Bay Nights', partner: 'PayPal' },
  'loc-supertree':  { artwork: '/emblems/emblem-2-transparent.png', name: 'Supertree Grove', artTitle: 'Garden of Light', partner: 'Flow' },
  'loc-merlion':    { artwork: '/emblems/emblem-3-transparent.png', name: 'Merlion Park', artTitle: 'Guardian of the Bay', partner: 'PayPal' },
  'loc-cafe':       { artwork: '/emblems/emblem-4-transparent.png', name: 'Flow Cafe', artTitle: 'Cozy Corner', partner: 'Flow' },
  'loc-nearby-0':   { artwork: '/emblems/emblem-5-transparent.png', name: 'Local Bakery', artTitle: 'Sweet Discovery', partner: 'Flow' },
  'loc-nearby-1':   { artwork: '/emblems/emblem-4-transparent.png', name: 'Flow Pop-Up', artTitle: 'Street Discovery', partner: 'Flow' },
  'loc-nearby-2':   { artwork: '/emblems/emblem-2-transparent.png', name: 'Flow Lounge', artTitle: 'Neighborhood Badge', partner: 'Flow' },
  'loc-nearby-3':   { artwork: '/emblems/emblem-1-transparent.png', name: 'Flow Gallery', artTitle: 'Art District Pass', partner: 'Flow' },
}

// Build bytes32→locId lookup from known locations
import { ethers } from 'ethers'
const LOCATION_BYTES_TO_ID: Record<string, string> = {}
for (const locId of Object.keys(LOCATION_INFO)) {
  LOCATION_BYTES_TO_ID[ethers.keccak256(ethers.toUtf8Bytes(locId))] = locId
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tokenId: string }> }
) {
  const { tokenId } = await params

  if (!process.env.NEXT_PUBLIC_EMBLEM_CONTRACT) {
    return NextResponse.json({ error: 'Contracts not deployed' }, { status: 503 })
  }

  try {
    const provider = getProvider()
    const emblem = getEmblemContract(provider)

    const meta = await emblem.getEmblemMeta(BigInt(tokenId))
    const owner = await emblem.ownerOf(BigInt(tokenId))

    const rarityIndex = Number(meta.rarity)
    const rarityName = RARITY_NAMES[rarityIndex] ?? 'special'
    const locationBytes = meta.locationId
    const locId = LOCATION_BYTES_TO_ID[locationBytes]
    const info = locId ? LOCATION_INFO[locId] : null

    return NextResponse.json({
      tokenId,
      owner,
      rarity: rarityName,
      rarityColor: RARITY_COLORS[rarityName],
      boostAPY: Number(meta.boostAPY),
      depositCap: Number(meta.depositCap) / 1e6,
      claimedAt: new Date(Number(meta.claimedAt) * 1000).toISOString(),
      expiresAt: new Date(Number(meta.expiresAt) * 1000).toISOString(),
      isActive: Number(meta.expiresAt) > Math.floor(Date.now() / 1000),
      locationName: info?.name ?? 'Unknown Location',
      partnerName: info?.partner ?? 'Flow',
      artwork: info?.artwork ?? '/emblems/emblem-1-transparent.png',
      artTitle: info?.artTitle ?? 'Emblem',
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
    })
  } catch {
    return NextResponse.json({ error: 'Emblem not found' }, { status: 404 })
  }
}
