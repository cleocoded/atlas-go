export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getProvider, getYieldContract, getStgUsdcContract } from '@/lib/flowEvm'
import { ethers } from 'ethers'

/**
 * GET /api/balance?address=0x...
 * Returns on-chain stgUSDC balance in deposit pool + active boost state.
 * Frontend polls this on screen focus to keep state in sync.
 */
export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get('address')

  if (!address) {
    return NextResponse.json({ error: 'address required' }, { status: 400 })
  }

  // Return zeros when contracts not yet deployed
  if (!process.env.NEXT_PUBLIC_YIELD_CONTRACT) {
    return NextResponse.json({
      depositBalance: 0,
      stgUsdcWallet: 0,
      activeBoost: null,
      isBoostActive: false,
      effectiveAPY: 3,
      mock: true,
    })
  }

  try {
    const provider = getProvider()
    const yieldContract = getYieldContract(provider)

    const [depositBalRaw, activeBoost, isBoostActive, effectiveAPYRaw] =
      await Promise.all([
        yieldContract.deposits(address),
        yieldContract.getActiveBoost(address),
        yieldContract.isBoostActive(address),
        yieldContract.getEffectiveAPY(address),
      ])

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

    // effectiveAPY is stored as basis points * 100 in contract (300 = 3.00%)
    const effectiveAPY = Number(effectiveAPYRaw) / 100

    const boost =
      activeBoost.tokenId === BigInt(0)
        ? null
        : {
            tokenId:         activeBoost.tokenId.toString(),
            boostPercentage: Number(activeBoost.boostPercentage),
            startedAt:       new Date(Number(activeBoost.startedAt) * 1000).toISOString(),
            expiresAt:       new Date(Number(activeBoost.expiresAt) * 1000).toISOString(),
            remainingSeconds: Math.max(0, Number(activeBoost.expiresAt) - Math.floor(Date.now() / 1000)),
          }

    return NextResponse.json({
      depositBalance,
      stgUsdcWallet,
      activeBoost: boost,
      isBoostActive,
      effectiveAPY,
    })
  } catch (err) {
    console.error('[balance] Error:', err)
    return NextResponse.json({ error: 'Failed to fetch balance' }, { status: 500 })
  }
}
