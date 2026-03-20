export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getMinterSigner, getEmblemContract, getYieldContract, locationIdToBytes32 } from '@/lib/flowEvm'
import { getRarity } from '@/types'

// Location registry — in production this comes from a DB / admin CMS
// Mirrors the mock data in appStore.ts
const LOCATION_REGISTRY: Record<string, {
  boostPercentage: number
  boostDurationHours: number
  metadataUri: string
}> = {
  'loc-paypal-sf': {
    boostPercentage: 300,
    boostDurationHours: 72,
    metadataUri: 'ipfs://QmPlaceholder/paypal-sf.json',
  },
  'loc-flow-hq': {
    boostPercentage: 450,
    boostDurationHours: 48,
    metadataUri: 'ipfs://QmPlaceholder/flow-hq.json',
  },
  'loc-paypal-downtown': {
    boostPercentage: 220,
    boostDurationHours: 24,
    metadataUri: 'ipfs://QmPlaceholder/paypal-downtown.json',
  },
  'loc-flow-events': {
    boostPercentage: 380,
    boostDurationHours: 96,
    metadataUri: 'ipfs://QmPlaceholder/flow-events.json',
  },
}

/**
 * POST /api/claim
 * Gasless emblem mint relay. Called by the frontend after the user taps "Spin to Claim."
 * The minter wallet pays gas on Flow EVM (effectively free for the user via Privy sponsorship).
 *
 * Body: { walletAddress: string, locationId: string }
 * Returns: { success: true, tokenId: string, txHash: string }
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

    if (!process.env.DEPLOYER_PRIVATE_KEY || !process.env.NEXT_PUBLIC_POAP_CONTRACT) {
      // Contracts not deployed yet — return a mock success for development
      console.warn('[claim] Contracts not configured — returning mock success')
      return NextResponse.json({
        success: true,
        tokenId: `mock-${Date.now()}`,
        txHash: `0x${'0'.repeat(64)}`,
        mock: true,
      })
    }

    // ── On-chain: check already claimed ─────────────────────────────────────

    const signer    = getMinterSigner()
    const emblemContract  = getEmblemContract(signer)
    const yieldContract = getYieldContract(signer)
    const locationBytes = locationIdToBytes32(locationId)

    const alreadyClaimed = await emblemContract.hasClaimed(locationBytes, walletAddress)
    if (alreadyClaimed) {
      return NextResponse.json({ error: 'Already claimed this location' }, { status: 409 })
    }

    // ── Mint Emblem (gasless — minter pays) ──────────────────────────────────

    const mintTx = await emblemContract.mintEmblem(
      walletAddress,
      locationBytes,
      location.metadataUri,
      location.boostPercentage,
      location.boostDurationHours,
      { gasLimit: 500_000 }
    )

    const receipt = await mintTx.wait()

    // Parse tokenId from emitted event
    const emblemIface = emblemContract.interface
    let tokenId = '0'
    for (const log of receipt.logs) {
      try {
        const parsed = emblemIface.parseLog({ topics: log.topics, data: log.data })
        if (parsed?.name === 'EmblemClaimed') {
          tokenId = parsed.args[1].toString()
          break
        }
      } catch { /* skip unrelated logs */ }
    }

    // ── Activate boost in YieldBoost contract ────────────────────────────────

    const boostTx = await yieldContract.setBoost(
      walletAddress,
      tokenId,
      location.boostPercentage,
      location.boostDurationHours,
      { gasLimit: 200_000 }
    )
    await boostTx.wait()

    return NextResponse.json({
      success: true,
      tokenId,
      txHash: receipt.hash,
    })
  } catch (err) {
    console.error('[claim] Error:', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
