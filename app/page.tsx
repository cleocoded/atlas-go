'use client'
import dynamic from 'next/dynamic'

// Dynamic import to avoid SSR for client-only map + geolocation
const App = dynamic(() => import('@/components/App').then((m) => m.App), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[100dvh] bg-bg-primary flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <span className="text-5xl animate-pulse">✦</span>
        <p className="text-text-secondary text-body-md">Loading Atlas Go…</p>
      </div>
    </div>
  ),
})

export default function Home() {
  return <App />
}
