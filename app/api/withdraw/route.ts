export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { getMinterSigner } from '@/lib/flowEvm'

const ERC20_ABI = [
  'function mint(address to, uint256 amount)',
  'function balanceOf(address) view returns (uint256)',
]

/**
 * POST /api/withdraw
 * Sends stgUSDC to an external wallet address on Flow EVM Testnet.
 * On testnet the deployer mints tokens to the destination (gasless relay).
 *
 * Body: { walletAddress: string, toAddress: string, amount: number }
 * Returns: { success: true, amount: string, toAddress: string, txHash: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { walletAddress, toAddress, amount } = await req.json()

    if (!walletAddress || typeof walletAddress !== 'string') {
      return NextResponse.json({ error: 'walletAddress required' }, { status: 400 })
    }
    if (!toAddress || typeof toAddress !== 'string' || !toAddress.startsWith('0x') || toAddress.length < 42) {
      return NextResponse.json({ error: 'Valid toAddress required' }, { status: 400 })
    }
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'amount must be > 0' }, { status: 400 })
    }

    const stgUsdcAddr = process.env.NEXT_PUBLIC_STGUSDC_ADDRESS
    if (!process.env.DEPLOYER_PRIVATE_KEY || !stgUsdcAddr) {
      console.warn('[withdraw] Contracts not configured — returning mock success')
      return NextResponse.json({
        success: true,
        amount: String(amount),
        toAddress,
        txHash: `mock-withdraw-${Date.now()}`,
      })
    }

    const signer = getMinterSigner()
    const token = new ethers.Contract(stgUsdcAddr, ERC20_ABI, signer)

    // Verify the user has enough stgUSDC on-chain
    const balanceRaw = await token.balanceOf(walletAddress)
    const balanceNum = parseFloat(ethers.formatUnits(balanceRaw, 6))
    if (balanceNum < amount) {
      return NextResponse.json(
        { error: `Insufficient balance: ${balanceNum.toFixed(2)} USDC available` },
        { status: 400 }
      )
    }

    // Testnet: mint equivalent amount to destination address
    const amountUnits = ethers.parseUnits(String(amount), 6)
    const tx = await token.mint(toAddress, amountUnits)
    const receipt = await tx.wait()

    return NextResponse.json({
      success: true,
      amount: String(amount),
      toAddress,
      txHash: receipt.hash,
    })
  } catch (err: any) {
    console.error('[withdraw] Error:', err)
    return NextResponse.json(
      { error: err?.message ?? 'Withdraw failed' },
      { status: 500 }
    )
  }
}
