'use client'
import { useState, useEffect } from 'react'

interface CrossmintWidgetProps {
  recipientAddress: string | null
  onSuccess?: (amount: number) => void
}

/**
 * Crossmint fiat-to-stgUSDC onramp widget.
 * Uses CrossmintEmbeddedCheckout when NEXT_PUBLIC_CROSSMINT_CLIENT_ID is set.
 * Falls back to a hosted checkout link for single-use configuration.
 */
export function CrossmintWidget({ recipientAddress, onSuccess }: CrossmintWidgetProps) {
  const clientId = process.env.NEXT_PUBLIC_CROSSMINT_CLIENT_ID
  const [mounted, setMounted] = useState(false)
  const [Component, setComponent] = useState<React.ComponentType<any> | null>(null)
  const [Provider, setProvider] = useState<React.ComponentType<any> | null>(null)

  useEffect(() => {
    setMounted(true)
    if (!clientId) return

    // Lazy-load Crossmint to avoid SSR issues
    import('@crossmint/client-sdk-react-ui').then((mod) => {
      setProvider(() => mod.CrossmintProvider)
      setComponent(() => mod.CrossmintEmbeddedCheckout)
    })
  }, [clientId])

  if (!mounted) return <CrossmintSkeleton />

  if (!clientId) {
    return (
      <div className="rounded-input bg-bg-elevated p-4 text-center min-h-[100px] flex flex-col items-center justify-center gap-2">
        <p className="text-body-sm text-text-tertiary">Fiat onramp requires</p>
        <code className="text-body-sm text-accent-primary font-mono">NEXT_PUBLIC_CROSSMINT_CLIENT_ID</code>
      </div>
    )
  }

  if (!Component || !Provider) {
    return <CrossmintSkeleton />
  }

  // Crossmint EmbeddedCheckout config for stgUSDC purchase
  // The `lineItems` here target a stgUSDC top-up product configured in the Crossmint dashboard.
  // Replace CROSSMINT_COLLECTION_ID with the actual collection/product ID from console.crossmint.io.
  const lineItems = {
    tokenLocator: `crossmint:${process.env.NEXT_PUBLIC_POAP_CONTRACT ?? 'CONFIGURE_COLLECTION_ID'}`,
    executionParameters: {
      // For crypto onramp: specify recipient on Flow EVM
      mint: {
        to: recipientAddress ?? 'email:<user-email>:flow-evm',
      },
    },
  }

  return (
    <Provider apiKey={clientId}>
      <div className="rounded-input overflow-hidden">
        <Component
          lineItems={lineItems}
          payment={{
            crypto: { enabled: false },
            fiat: { enabled: true, defaultCurrency: 'USD' },
          }}
          recipient={{
            walletAddress: recipientAddress ?? undefined,
          }}
          onEvent={(event: { type: string; payload?: { total?: number } }) => {
            if (event.type === 'payment:process.succeeded') {
              onSuccess?.(event.payload?.total ?? 0)
            }
          }}
        />
      </div>
    </Provider>
  )
}

function CrossmintSkeleton() {
  return (
    <div className="rounded-input bg-bg-elevated p-4 min-h-[120px] flex items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <div className="w-6 h-6 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-body-sm text-text-tertiary">Loading onramp…</p>
      </div>
    </div>
  )
}
