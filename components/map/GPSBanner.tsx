'use client'

export function GPSBanner() {
  const openSettings = () => {
    // On iOS/Android, deep-linking to app settings isn't possible from web
    // Best we can do is prompt the user via a message
    alert('Please enable location access in your browser settings, then refresh the page.')
  }

  return (
    <div
      className="fixed left-0 right-0 z-[15] flex items-center justify-center h-12 bg-accent-danger px-4 cursor-pointer"
      style={{ top: `env(safe-area-inset-top, 0px)` }}
      onClick={openSettings}
      role="button"
      aria-label="Enable location"
    >
      <span className="text-white text-body-md font-semibold">
        Enable location to explore
      </span>
    </div>
  )
}
