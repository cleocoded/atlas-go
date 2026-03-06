'use client'
import { useState, useEffect } from 'react'
import { PrivyProvider } from '@privy-io/react-auth'
import { flowEvmConfig } from '@/lib/privyConfig'

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID

  // Skip Privy during SSR and when app ID is not yet configured
  if (!mounted || !appId) {
    return <>{children}</>
  }

  return (
    <PrivyProvider appId={appId} config={flowEvmConfig}>
      {children}
    </PrivyProvider>
  )
}
