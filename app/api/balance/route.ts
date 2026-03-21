export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getProvider, getLendingContract, getIncentivePoolContract, getStgUsdcContract, getEmblemContract, locationIdToBytes32 } from '@/lib/flowEvm'
import { ethers } from 'ethers'

// Rarity enum: 0=special, 1=rare, 2=epic, 3=legendary, 4=mythical
const RARITY_NAMES = ['special', 'rare', 'epic', 'legendary', 'mythical'] as const

// All known location IDs — checked on-chain for claimed emblems
const ALL_LOCATION_IDS = [
  'loc-marina-bay', 'loc-supertree', 'loc-merlion', 'loc-cafe',
  'loc-nearby-0', 'loc-nearby-1', 'loc-nearby-2', 'loc-nearby-3',
]

// Location ID → emblem artwork + name mapping
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

/**
 * GET /api/balance?address=0x...
 * Returns on-chain deposit balance (MockLending), earned yield,
 * and active boost state (IncentivePool).
 * Frontend polls this on screen focus to keep state in sync.
 */
export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get('address')

  if (!address) {
    return NextResponse.json({ error: 'address required' }, { status: 400 })
  }

  // Return zeros when contracts not yet deployed
  if (!process.env.NEXT_PUBLIC_LENDING_CONTRACT) {
    return NextResponse.json({
      depositBalance: 0,
      earned: 0,
      baseAPY: 3,
      stgUsdcWallet: 0,
      activeBoost: null,
      isBoostActive: false,
      effectiveBoostAPY: 0,
      mock: true,
      claimedEmblems: [],
    })
  }

  const provider = getProvider()

  // ── Read claimed emblems on-chain (independent of lending) ───────────
  const claimedEmblems: Array<{
    id: string
    locationId: string
    locationName: string
    partnerName: string
    artwork: string
    artTitle: string
    rarity: string
    boostPercentage: number
    depositCap: number
    claimedAt: string
    expiresAt: string
    isActive: boolean
  }> = []

  if (process.env.NEXT_PUBLIC_EMBLEM_CONTRACT) {
    try {
      const emblemContract = getEmblemContract(provider)

      // Check each location for a claimed emblem
      const claimChecks = await Promise.all(
        ALL_LOCATION_IDS.map(async (locId) => {
          const locBytes = locationIdToBytes32(locId)
          try {
            const tokenId = await emblemContract.claimRecord(locBytes, address)
            if (tokenId === BigInt(0)) return null
            return { locId, tokenId }
          } catch {
            return null
          }
        })
      )

      // Fetch metadata for claimed tokens
      const claimed = claimChecks.filter(Boolean) as { locId: string; tokenId: bigint }[]
      if (claimed.length > 0) {
        const metas = await Promise.all(
          claimed.map(async ({ locId, tokenId }) => {
            try {
              const meta = await emblemContract.getEmblemMeta(tokenId)
              const rarityIndex = Number(meta.rarity)
              const rarityName = RARITY_NAMES[rarityIndex] ?? 'special'
              const info = LOCATION_INFO[locId]
              const claimedAtSec = Number(meta.claimedAt)
              const expiresAtSec = Number(meta.expiresAt)
              const now = Math.floor(Date.now() / 1000)
              return {
                id: `emblem-${tokenId.toString()}`,
                tokenId: tokenId.toString(),
                locationId: locId,
                locationName: info?.name ?? locId,
                partnerName: info?.partner ?? 'Flow',
                artwork: info?.artwork ?? '/emblems/emblem-1-transparent.png',
                artTitle: info?.artTitle ?? 'Emblem',
                rarity: rarityName,
                boostPercentage: Number(meta.boostAPY),
                depositCap: Number(meta.depositCap) / 1e6,
                claimedAt: new Date(claimedAtSec * 1000).toISOString(),
                expiresAt: new Date(expiresAtSec * 1000).toISOString(),
                isActive: expiresAtSec > now,
              }
            } catch {
              return null
            }
          })
        )
        for (const m of metas) {
          if (m) claimedEmblems.push(m)
        }
      }
    } catch (err) {
      console.warn('[balance] Emblem read failed:', (err as Error).message)
    }
  }

  // ── Read lending / boost / wallet data ─────────────────────────────────

  let depositBalance = 0
  let earned = 0
  let baseAPY = 3
  let stgUsdcWallet = 0
  let activeBoost = null
  let isBoostActive = false
  let effectiveBoostAPY = 0

  try {
    if (process.env.NEXT_PUBLIC_LENDING_CONTRACT) {
      const lendingContract = getLendingContract(provider)
      const [depositBalRaw, earnedRaw, baseAPYRaw] = await Promise.all([
        lendingContract.deposits(address),
        lendingContract.earned(address),
        lendingContract.baseAPY(),
      ])
      depositBalance = parseFloat(ethers.formatUnits(depositBalRaw, 6))
      earned = parseFloat(ethers.formatUnits(earnedRaw, 6))
      baseAPY = Number(baseAPYRaw) / 100
    }

    if (process.env.NEXT_PUBLIC_INCENTIVE_POOL_CONTRACT) {
      const incentivePool = getIncentivePoolContract(provider)
      const [boostData, boostActive, boostAPYRaw] = await Promise.all([
        incentivePool.getActiveBoost(address),
        incentivePool.isBoostActive(address),
        incentivePool.getEffectiveBoostAPY(address),
      ])
      isBoostActive = boostActive
      effectiveBoostAPY = Number(boostAPYRaw)

      if (boostData.emblemTokenId !== BigInt(0)) {
        const rarityIndex = Number(boostData.rarity)
        const rarityName = RARITY_NAMES[rarityIndex] ?? 'special'
        const expiresAtSec = Number(boostData.expiresAt)
        activeBoost = {
          emblemId:         boostData.emblemTokenId.toString(),
          rarity:           rarityName,
          boostPercentage:  Number(boostData.boostAPY),
          depositCap:       parseFloat(ethers.formatUnits(boostData.depositCap, 6)),
          startedAt:        new Date(Number(boostData.startedAt) * 1000).toISOString(),
          expiresAt:        new Date(expiresAtSec * 1000).toISOString(),
          remainingSeconds: Math.max(0, expiresAtSec - Math.floor(Date.now() / 1000)),
        }
      }
    }

    if (process.env.NEXT_PUBLIC_STGUSDC_ADDRESS) {
      const stgUsdc = getStgUsdcContract(provider)
      const [rawBal, decimals] = await Promise.all([
        stgUsdc.balanceOf(address),
        stgUsdc.decimals(),
      ])
      stgUsdcWallet = parseFloat(ethers.formatUnits(rawBal, decimals))
    }
  } catch (err) {
    console.warn('[balance] Lending/boost read failed:', (err as Error).message)
  }

  return NextResponse.json({
    depositBalance,
    earned,
    baseAPY,
    stgUsdcWallet,
    activeBoost,
    isBoostActive,
    effectiveBoostAPY,
    claimedEmblems,
  })
}
