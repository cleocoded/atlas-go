import { useAppStore } from '@/store/appStore'

export function PartnerLogos() {
  const gpsEnabled = useAppStore((s) => s.gpsEnabled)

  return (
    <div
      className="fixed right-4 z-[5] flex gap-3 items-center"
      style={{ top: gpsEnabled ? `calc(12px + env(safe-area-inset-top, 0px))` : `calc(52px + env(safe-area-inset-top, 0px))` }}
    >
      <div className="h-6 opacity-60 flex items-center">
        <img src="/logos/flowlogo.png" alt="Flow" className="h-full w-auto object-contain" />
      </div>
    </div>
  )
}
