export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { getMinterSigner } from '@/lib/flowEvm'

const FAUCET_AMOUNT = ethers.parseUnits('10000', 6) // $10,000 stgUSDC
const GAS_FUND_AMOUNT = ethers.parseEther('1')     // 1 FLOW for gas fees
const MOCK_ERC20_ABI = ['function mint(address to, uint256 amount)']

/**
 * POST /api/faucet
 * Mints testnet stgUSDC to a user's wallet for demo purposes.
 * Only works when DEPLOYER_PRIVATE_KEY and NEXT_PUBLIC_STGUSDC_ADDRESS are set.
 *
 * Body: { walletAddress: string }
 * Returns: { success: true, amount: "10000", txHash: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { walletAddress } = await req.json()

    if (!walletAddress || typeof walletAddress !== 'string') {
      return NextResponse.json({ error: 'walletAddress required' }, { status: 400 })
    }

    const stgUsdcAddr = process.env.NEXT_PUBLIC_STGUSDC_ADDRESS
    if (!process.env.DEPLOYER_PRIVATE_KEY || !stgUsdcAddr) {
      // Mock mode — contracts not deployed
      console.warn('[faucet] Contracts not configured — returning mock success')
      return NextResponse.json({
        success: true,
        amount: '10000',
        txHash: `mock-faucet-${Date.now()}`,
      })
    }

    const signer = getMinterSigner()
    const token = new ethers.Contract(stgUsdcAddr, MOCK_ERC20_ABI, signer)

    // Send native FLOW for gas fees (so the wallet can sign ERC-20 transfers)
    const userBalance = await signer.provider!.getBalance(walletAddress)
    if (userBalance < GAS_FUND_AMOUNT) {
      const gasTx = await signer.sendTransaction({
        to: walletAddress,
        value: GAS_FUND_AMOUNT,
      })
      await gasTx.wait()
    }

    // Mint stgUSDC
    const tx = await token.mint(walletAddress, FAUCET_AMOUNT)
    const receipt = await tx.wait()

    return NextResponse.json({
      success: true,
      amount: '10000',
      txHash: receipt.hash,
    })
  } catch (err: any) {
    console.error('[faucet] Error:', err)
    return NextResponse.json(
      { error: err?.message ?? 'Faucet failed' },
      { status: 500 }
    )
  }
}
