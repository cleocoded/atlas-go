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

      // Sync deposit balance — only update if it changed meaningfully (>$0.01 diff)
      // to avoid overriding optimistic UI from deposit/withdraw actions
      if (typeof data.depositBalance === 'number') {
        // setBalanceFromChain is defined below in the store patch
        setBoostFromChain({
          balance:    data.depositBalance,
          activeBoost: data.activeBoost,
          effectiveAPY: data.effectiveAPY,
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
