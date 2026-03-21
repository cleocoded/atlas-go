export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getMinterSigner, getEmblemContract, getIncentivePoolContract, locationIdToBytes32 } from '@/lib/flowEvm'

// Rarity enum: 0=special, 1=rare, 2=epic, 3=legendary, 4=mythical
const RARITY_NAMES = ['special', 'rare', 'epic', 'legendary', 'mythical'] as const

// Location registry — in production this comes from a DB / admin CMS
const LOCATION_REGISTRY: Record<string, {
  metadataUri: string
}> = {
  'loc-paypal-sf': {
    metadataUri: 'ipfs://QmPlaceholder/paypal-sf.json',
  },
  'loc-flow-hq': {
    metadataUri: 'ipfs://QmPlaceholder/flow-hq.json',
  },
  'loc-paypal-downtown': {
    metadataUri: 'ipfs://QmPlaceholder/paypal-downtown.json',
  },
  'loc-flow-events': {
    metadataUri: 'ipfs://QmPlaceholder/flow-events.json',
  },
}

/**
 * POST /api/claim
 * Two-phase gasless emblem mint relay (commit-reveal).
 * Called by the frontend after the user taps "Spin to Claim."
 * The minter wallet pays gas on Flow EVM (effectively free for the user via Privy sponsorship).
 *
 * Body: { walletAddress: string, locationId: string }
 * Returns: { success: true, tokenId: string, rarity: number, rarityName: string, txHash: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { walletAddress, locationId } = body

    // ── Validate inputs ──────────────────────────────────────────────────────

    if (!walletAddress || typeof walletAddress !== 'string') {
      return NextResponse.json({ error: 'walletAddress required' }, { status: 400 })
    }
    if (!locationId || typeof locationId !== 'string') {
      return NextResponse.json({ error: 'locationId required' }, { status: 400 })
    }

    const location = LOCATION_REGISTRY[locationId]
    if (!location) {
      return NextResponse.json({ error: 'Unknown location' }, { status: 400 })
    }

    // ── Check env ────────────────────────────────────────────────────────────

    if (!process.env.DEPLOYER_PRIVATE_KEY || !process.env.NEXT_PUBLIC_EMBLEM_CONTRACT) {
      // Contracts not deployed yet — return a mock success with random rarity
      console.warn('[claim] Contracts not configured — returning mock success')
      const mockRarity = Math.floor(Math.random() * 5) as 0 | 1 | 2 | 3 | 4
      return NextResponse.json({
        success: true,
        tokenId: `mock-${Date.now()}`,
        txHash: `0x${'0'.repeat(64)}`,
        rarity: mockRarity,
        rarityName: RARITY_NAMES[mockRarity],
        mock: true,
      })
    }

    // ── On-chain: check already claimed ─────────────────────────────────────

    const signer = getMinterSigner()
    const emblemContract = getEmblemContract(signer)
    const locationBytes = locationIdToBytes32(locationId)

    const alreadyClaimed = await emblemContract.hasClaimed(locationBytes, walletAddress)
    if (alreadyClaimed) {
      return NextResponse.json({ error: 'Already claimed this location' }, { status: 409 })
    }

    // ── Step 1: Commit ─────────────────────────────────────────────────────

    const commitTx = await emblemContract.commitClaim(
      walletAddress,
      locationBytes,
      { gasLimit: 300_000 }
    )
    await commitTx.wait()

    // ── Step 2: Reveal ─────────────────────────────────────────────────────

    const revealTx = await emblemContract.revealClaim(
      walletAddress,
      locationBytes,
      location.metadataUri,
      { gasLimit: 500_000 }
    )
    const revealReceipt = await revealTx.wait()

    // Parse tokenId and rarity from the return value / event
    const emblemIface = emblemContract.interface
    let tokenId = '0'
    let rarity: number = 0
    for (const log of revealReceipt.logs) {
      try {
        const parsed = emblemIface.parseLog({ topics: log.topics, data: log.data })
        if (parsed?.name === 'EmblemClaimed') {
          tokenId = parsed.args[1].toString()
          rarity = Number(parsed.args[2])
          break
        }
      } catch { /* skip unrelated logs */ }
    }

    // ── Step 3: Activate boost in IncentivePool ────────────────────────────

    if (process.env.NEXT_PUBLIC_INCENTIVE_POOL_CONTRACT) {
      const incentivePool = getIncentivePoolContract(signer)
      const boostTx = await incentivePool.activateBoost(
        walletAddress,
        tokenId,
        rarity,
        { gasLimit: 300_000 }
      )
      await boostTx.wait()
    }

    return NextResponse.json({
      success: true,
      tokenId,
      txHash: revealReceipt.hash,
      rarity,
      rarityName: RARITY_NAMES[rarity] ?? 'special',
    })
  } catch (err) {
    console.error('[claim] Error:', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
