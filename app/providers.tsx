'use client'
import { useState, useEffect, createContext, useContext } from 'react'
import { PrivyProvider } from '@privy-io/react-auth'
import { flowEvmConfig } from '@/lib/privyConfig'

/** True once PrivyProvider is mounted and safe to call usePrivy() */
export const PrivyReadyContext = createContext(false)

export function usePrivyReady() {
  return useContext(PrivyReadyContext)
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID
  const ready = mounted && !!appId

  if (!ready) {
    return (
      <PrivyReadyContext.Provider value={false}>
        {children}
      </PrivyReadyContext.Provider>
    )
  }

  return (
    <PrivyReadyContext.Provider value={true}>
      <PrivyProvider appId={appId} config={flowEvmConfig}>
        {children}
      </PrivyProvider>
    </PrivyReadyContext.Provider>
  )
}
