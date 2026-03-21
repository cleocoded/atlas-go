export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getMinterSigner, getEmblemContract, getIncentivePoolContract, locationIdToBytes32 } from '@/lib/flowEvm'
import { RARITY_CONFIG, type RarityTier } from '@/types'

// Rarity enum: 0=special, 1=rare, 2=epic, 3=legendary, 4=mythical
const RARITY_NAMES: RarityTier[] = ['special', 'rare', 'epic', 'legendary', 'mythical']

/** Build metadata URI from the request origin — resolves to /metadata/<locationId>.json */
function getMetadataUri(locationId: string, origin: string): string {
  return `${origin}/metadata/${locationId}.json`
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

    const origin = req.nextUrl.origin
    const metadataUri = getMetadataUri(locationId, origin)

    // ── Check env ────────────────────────────────────────────────────────────

    if (!process.env.DEPLOYER_PRIVATE_KEY || !process.env.NEXT_PUBLIC_EMBLEM_CONTRACT) {
      // Contracts not deployed yet — return a mock success with random rarity
      console.warn('[claim] Contracts not configured — returning mock success')
      const mockRarity = Math.floor(Math.random() * 5) as 0 | 1 | 2 | 3 | 4
      const mockRarityName = RARITY_NAMES[mockRarity]
      const mockCfg = RARITY_CONFIG[mockRarityName]
      return NextResponse.json({
        success: true,
        tokenId: `mock-${Date.now()}`,
        txHash: `0x${'0'.repeat(64)}`,
        rarity: mockRarityName,
        boostPercentage: mockCfg.boostAPY,
        depositCap: mockCfg.depositCap,
        mock: true,
      })
    }

    // ── On-chain: check already claimed ─────────────────────────────────────

    const signer = getMinterSigner()
    const emblemContract = getEmblemContract(signer)
    const locationBytes = locationIdToBytes32(locationId)

    const alreadyClaimed = await emblemContract.hasClaimed(locationBytes, walletAddress)
    if (alreadyClaimed) {
      // Return existing claim data so the app can sync it locally
      let rarity = 'special'
      let boostPercentage = 5
      let depositCap = 10000
      try {
        if (process.env.NEXT_PUBLIC_INCENTIVE_POOL_CONTRACT) {
          const incentivePool = getIncentivePoolContract(signer)
          const boostData = await incentivePool.getActiveBoost(walletAddress)
          if (boostData.emblemTokenId !== BigInt(0)) {
            const ri = Number(boostData.rarity)
            rarity = RARITY_NAMES[ri] ?? 'special'
            boostPercentage = Number(boostData.boostAPY)
            depositCap = Number(boostData.depositCap) / 1e6
          }
        }
      } catch { /* fall through with defaults */ }
      return NextResponse.json({
        error: 'Already claimed this location',
        rarity,
        boostPercentage,
        depositCap,
        alreadyClaimed: true,
      }, { status: 409 })
    }

    // ── Step 1: Commit ─────────────────────────────────────────────────────

    const commitTx = await emblemContract.commitClaim(
      walletAddress,
      locationBytes,
      { gasLimit: 300_000 }
    )
    await commitTx.wait()

    // ── Wait for at least 1 Flow block before reveal ─────────────────────
    // The contract requires _flowBlockHeight() > committedHeight.
    // Poll until a new block is produced (Flow blocks are ~1s).
    const provider = signer.provider!
    const commitBlock = await provider.getBlockNumber()
    let attempts = 0
    while (attempts < 30) {
      await new Promise((r) => setTimeout(r, 1000))
      const currentBlock = await provider.getBlockNumber()
      if (currentBlock > commitBlock) break
      attempts++
    }

    // ── Step 2: Reveal ─────────────────────────────────────────────────────

    const revealTx = await emblemContract.revealClaim(
      walletAddress,
      locationBytes,
      metadataUri,
      { gasLimit: 500_000 }
    )
    const revealReceipt = await revealTx.wait()

    // Parse tokenId and rarity from the EmblemClaimed event
    // Event args order: claimer(indexed), tokenId(indexed), locationId(indexed), rarity, boostAPY, depositCap, expiresAt
    const emblemIface = emblemContract.interface
    let tokenId = '0'
    let rarityIndex: number = 0
    let boostAPY: number = 5
    let depositCap: number = 10000
    for (const log of revealReceipt.logs) {
      try {
        const parsed = emblemIface.parseLog({ topics: log.topics, data: log.data })
        if (parsed?.name === 'EmblemClaimed') {
          tokenId = parsed.args[1].toString()       // tokenId (indexed)
          rarityIndex = Number(parsed.args[3])       // rarity (non-indexed, after 3 indexed)
          boostAPY = Number(parsed.args[4])           // boostAPY
          depositCap = Number(parsed.args[5]) / 1e6   // depositCap (convert from 6 decimals to USD)
          break
        }
      } catch { /* skip unrelated logs */ }
    }

    const rarityName = RARITY_NAMES[rarityIndex] ?? 'special'

    // ── Step 3: Activate boost in IncentivePool ────────────────────────────

    if (process.env.NEXT_PUBLIC_INCENTIVE_POOL_CONTRACT) {
      const incentivePool = getIncentivePoolContract(signer)
      const boostTx = await incentivePool.activateBoost(
        walletAddress,
        tokenId,
        rarityIndex,
        { gasLimit: 300_000 }
      )
      await boostTx.wait()
    }

    return NextResponse.json({
      success: true,
      tokenId,
      txHash: revealReceipt.hash,
      rarity: rarityName,
      boostPercentage: boostAPY,
      depositCap,
    })
  } catch (err) {
    console.error('[claim] Error:', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
