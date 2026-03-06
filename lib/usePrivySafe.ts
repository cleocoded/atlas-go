'use client'
// Safe wrapper around usePrivy that returns no-ops when Privy is not mounted
// (i.e. when NEXT_PUBLIC_PRIVY_APP_ID is missing or during SSR)
import { useEffect, useState } from 'react'

let privyAvailable = false

export function usePrivySafe() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setReady(true)
    privyAvailable = typeof process !== 'undefined' && !!process.env.NEXT_PUBLIC_PRIVY_APP_ID
  }, [])

  if (!ready || !privyAvailable) {
    return {
      login:         () => {},
      logout:        () => {},
      authenticated: false,
      user:          null,
      ready:         false,
    }
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { usePrivy } = require('@privy-io/react-auth')
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return usePrivy()
}
