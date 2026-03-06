'use client'
import { usePrivy }     from '@privy-io/react-auth'
import { useAppStore }  from '@/store/appStore'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { formatAddress } from '@/types'

interface SettingRowProps {
  label: string
  value?: string
  danger?: boolean
  onClick?: () => void
}

function SettingRow({ label, value, danger, onClick }: SettingRowProps) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`
        flex items-center justify-between w-full h-14 px-4 border-b border-border-default
        active:bg-bg-elevated transition-colors
        ${danger ? 'text-accent-danger' : 'text-text-primary'}
        ${!onClick ? 'cursor-default' : ''}
      `}
    >
      <span className="text-body-lg font-medium">{label}</span>
      <div className="flex items-center gap-2">
        {value && <span className="text-body-md text-text-tertiary">{value}</span>}
        {onClick && (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-text-disabled">
            <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
    </button>
  )
}

export function SettingsScreen() {
  const gpsEnabled = useAppStore((s) => s.gpsEnabled)
  const wallet     = useAppStore((s) => s.wallet)
  const disconnectWallet = useAppStore((s) => s.disconnectWallet)
  const { logout, authenticated } = usePrivy()

  const handleRequestGPS = () => {
    navigator.geolocation?.getCurrentPosition(
      () => {},
      () => alert('Please enable location access in your browser settings.')
    )
  }

  const handleLogout = () => {
    disconnectWallet()
    logout()
  }

  return (
    <div className="flex flex-col w-full h-full bg-bg-primary screen-enter">
      <ScreenHeader title="Settings" />

      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="mt-4">
          <SettingRow
            label="GPS Permissions"
            value={gpsEnabled ? 'Enabled' : 'Disabled'}
            onClick={handleRequestGPS}
          />
          <SettingRow
            label="Connected Wallet"
            value={wallet.address ? formatAddress(wallet.address) : 'Not connected'}
          />
          <SettingRow
            label="Notifications"
            value="Coming soon"
          />
          <SettingRow
            label="About Atlas Go"
            onClick={() => {
              alert('Atlas Go v0.1.0\nFlow EVM · Privy · Mapbox\nBuilt on Flow')
            }}
          />
          {authenticated && (
            <SettingRow
              label="Log Out"
              danger
              onClick={handleLogout}
            />
          )}
        </div>
      </div>
    </div>
  )
}
