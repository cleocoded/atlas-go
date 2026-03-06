export function PartnerLogos() {
  return (
    <div
      className="fixed right-4 z-[5] flex gap-3 items-center"
      style={{ top: `calc(52px + env(safe-area-inset-top, 0px))` }}
    >
      {/* PayPal logo placeholder */}
      <div className="h-5 opacity-60 flex items-center">
        <span className="text-text-primary font-bold text-sm font-nunito tracking-tight">PayPal</span>
      </div>
      {/* Flow logo placeholder */}
      <div className="h-5 opacity-60 flex items-center">
        <span className="text-text-primary font-bold text-sm font-nunito tracking-tight">Flow</span>
      </div>
    </div>
  )
}
