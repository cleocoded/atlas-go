export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getProvider, getLendingContract, getIncentivePoolContract, getStgUsdcContract } from '@/lib/flowEvm'
import { ethers } from 'ethers'

// Rarity enum: 0=special, 1=rare, 2=epic, 3=legendary, 4=mythical
const RARITY_NAMES = ['special', 'rare', 'epic', 'legendary', 'mythical'] as const

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
    })
  }

  try {
    const provider = getProvider()
    const lendingContract = getLendingContract(provider)

    const [depositBalRaw, earnedRaw, baseAPYRaw] = await Promise.all([
      lendingContract.deposits(address),
      lendingContract.earned(address),
      lendingContract.baseAPY(),
    ])

    // Read boost state from IncentivePool if configured
    let activeBoost = null
    let isBoostActive = false
    let effectiveBoostAPY = 0

    if (process.env.NEXT_PUBLIC_INCENTIVE_POOL_CONTRACT) {
      const incentivePool = getIncentivePoolContract(provider)
      const [boostData, boostActive, boostAPYRaw] = await Promise.all([
        incentivePool.getActiveBoost(address),
        incentivePool.isBoostActive(address),
        incentivePool.getEffectiveBoostAPY(address),
      ])
      isBoostActive = boostActive
      effectiveBoostAPY = Number(boostAPYRaw) // already whole percent (5, 10, 50, 200, 500)

      if (boostData.emblemTokenId !== BigInt(0)) {
        const rarityIndex = Number(boostData.rarity)
        const rarityName = RARITY_NAMES[rarityIndex] ?? 'special'
        const expiresAtSec = Number(boostData.expiresAt)
        // Return shape matching the store's ActiveBoost type
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

    // stgUSDC wallet balance (user's EOA, not deposited)
    let stgUsdcWallet = 0
    if (process.env.NEXT_PUBLIC_STGUSDС_ADDRESS) {
      const stgUsdc = getStgUsdcContract(provider)
      const [rawBal, decimals] = await Promise.all([
        stgUsdc.balanceOf(address),
        stgUsdc.decimals(),
      ])
      stgUsdcWallet = parseFloat(ethers.formatUnits(rawBal, decimals))
    }

    const depositBalance = parseFloat(ethers.formatUnits(depositBalRaw, 6)) // stgUSDC = 6 decimals
    const earned = parseFloat(ethers.formatUnits(earnedRaw, 6))
    const baseAPY = Number(baseAPYRaw) / 100 // basis points to percentage

    return NextResponse.json({
      depositBalance,
      earned,
      baseAPY,
      stgUsdcWallet,
      activeBoost,
      isBoostActive,
      effectiveBoostAPY,
    })
  } catch (err) {
    console.warn('[balance] Contract call failed, returning mock data:', (err as Error).message)
    return NextResponse.json({
      depositBalance: 0,
      earned: 0,
      baseAPY: 3,
      stgUsdcWallet: 0,
      activeBoost: null,
      isBoostActive: false,
      effectiveBoostAPY: 0,
      mock: true,
    })
  }
}
