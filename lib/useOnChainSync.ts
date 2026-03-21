'use client'
import { useEffect, useRef } from 'react'
import { useAppStore } from '@/store/appStore'

/**
 * Polls /api/balance every 30 seconds while a wallet is connected.
 * Syncs on-chain deposit balance and boost state into Zustand.
 */
export function useOnChainSync() {
  const address       = useAppStore((s) => s.wallet.address)
  const isConnected   = useAppStore((s) => s.wallet.isConnected)
  const deposit       = useAppStore((s) => s.deposit)
  const setBoostFromChain = useAppStore((s) => s.setBoostFromChain)
  const intervalRef   = useRef<ReturnType<typeof setInterval> | null>(null)

  const sync = async (addr: string) => {
    try {
      const res  = await fetch(`/api/balance?address=${addr}`)
      const data = await res.json()
      if (data.error) return

      // Sync balance and boost state from chain
      // Use depositBalance (MockLending) if user has deposited,
      // otherwise fall back to stgUsdcWallet (EOA balance from faucet/onramp)
      if (typeof data.depositBalance === 'number') {
        const onChainBalance = data.depositBalance > 0
          ? data.depositBalance
          : (data.stgUsdcWallet ?? 0)
        setBoostFromChain({
          balance:     onChainBalance,
          activeBoost: data.activeBoost ?? null,
        })
      }
    } catch {
      // Silent — offline / contracts not deployed
    }
  }

  useEffect(() => {
    if (!isConnected || !address) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }

    // Sync immediately on connect
    sync(address)

    // Then every 30 seconds
    intervalRef.current = setInterval(() => sync(address), 30_000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, address])
}
