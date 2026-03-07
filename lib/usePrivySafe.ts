'use client'
/**
 * Re-exports usePrivy for use in screens.
 *
 * Safety note: screens that call usePrivy() are only mounted when currentScreen
 * changes from 'map' (requires user interaction). By that point PrivyProvider
 * is always mounted. The actual Privy-before-mount guard lives in App.tsx via
 * AppWithPrivy + usePrivyReady().
 */
export { usePrivy as usePrivySafe } from '@privy-io/react-auth'
