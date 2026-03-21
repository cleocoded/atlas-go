import type { Metadata } from 'next'
import { getProvider, getEmblemContract, getLendingContract, locationIdToBytes32 } from '@/lib/flowEvm'

const RARITY_NAMES = ['special', 'rare', 'epic', 'legendary', 'mythical'] as const
const RARITY_COLORS: Record<string, string> = {
  special: '#A0A0B8', rare: '#00E5A0', epic: '#7B68EE', legendary: '#FFD700', mythical: '#FF6BA0',
}

const ALL_LOCATION_IDS = [
  'loc-marina-bay', 'loc-supertree', 'loc-merlion', 'loc-cafe',
  'loc-nearby-0', 'loc-nearby-1', 'loc-nearby-2', 'loc-nearby-3',
]

const LOCATION_INFO: Record<string, { name: string; artwork: string }> = {
  'loc-marina-bay': { artwork: '/emblems/emblem-1-transparent.png', name: 'Marina Bay Sands' },
  'loc-supertree':  { artwork: '/emblems/emblem-2-transparent.png', name: 'Supertree Grove' },
  'loc-merlion':    { artwork: '/emblems/emblem-3-transparent.png', name: 'Merlion Park' },
  'loc-cafe':       { artwork: '/emblems/emblem-4-transparent.png', name: 'Flow Cafe' },
  'loc-nearby-0':   { artwork: '/emblems/emblem-5-transparent.png', name: 'Local Bakery' },
  'loc-nearby-1':   { artwork: '/emblems/emblem-4-transparent.png', name: 'Flow Pop-Up' },
  'loc-nearby-2':   { artwork: '/emblems/emblem-2-transparent.png', name: 'Flow Lounge' },
  'loc-nearby-3':   { artwork: '/emblems/emblem-1-transparent.png', name: 'Flow Gallery' },
}

interface EmblemSummary {
  tokenId: string
  rarity: string
  rarityColor: string
  boostAPY: number
  locationName: string
  artwork: string
}

async function getProfileData(address: string) {
  if (!process.env.NEXT_PUBLIC_EMBLEM_CONTRACT) return null

  try {
    const provider = getProvider()
    const emblem = getEmblemContract(provider)

    const emblems: EmblemSummary[] = []

    const checks = await Promise.all(
      ALL_LOCATION_IDS.map(async (locId) => {
        try {
          const tokenId = await emblem.claimRecord(locationIdToBytes32(locId), address)
          if (tokenId === BigInt(0)) return null
          const meta = await emblem.getEmblemMeta(tokenId)
          const rarityName = RARITY_NAMES[Number(meta.rarity)] ?? 'special'
          const info = LOCATION_INFO[locId]
          return {
            tokenId: tokenId.toString(),
            rarity: rarityName,
            rarityColor: RARITY_COLORS[rarityName],
            boostAPY: Number(meta.boostAPY),
            locationName: info?.name ?? locId,
            artwork: info?.artwork ?? '/emblems/emblem-1-transparent.png',
          }
        } catch { return null }
      })
    )

    for (const e of checks) if (e) emblems.push(e)

    // Get deposit balance
    let depositBalance = 0
    if (process.env.NEXT_PUBLIC_LENDING_CONTRACT) {
      try {
        const lending = getLendingContract(provider)
        const bal = await lending.deposits(address)
        depositBalance = Number(bal) / 1e6
      } catch { /* skip */ }
    }

    return { address, emblems, depositBalance }
  } catch {
    return null
  }
}

function formatAddress(addr: string) {
  return addr.slice(0, 6) + '...' + addr.slice(-4)
}

export async function generateMetadata(
  { params }: { params: Promise<{ address: string }> }
): Promise<Metadata> {
  const { address } = await params
  const data = await getProfileData(address)
  const count = data?.emblems.length ?? 0
  return {
    title: `${formatAddress(address)} — Atlas Go`,
    description: `${count} Emblem${count !== 1 ? 's' : ''} claimed on Atlas Go. Explore. Claim. Earn.`,
    openGraph: {
      title: `Atlas Go Explorer — ${formatAddress(address)}`,
      description: `${count} Emblem${count !== 1 ? 's' : ''} claimed`,
      type: 'profile',
    },
  }
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ address: string }>
}) {
  const { address } = await params
  const data = await getProfileData(address)

  if (!data) {
    return (
      <div className="min-h-screen bg-[#0D0D1A] flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-4xl mb-4">✦</p>
          <h1 className="text-xl font-bold text-white mb-2">Profile Not Found</h1>
          <p className="text-gray-400 mb-6">Contracts not deployed or invalid address.</p>
          <a href="/" className="inline-block px-6 py-3 bg-[#FFB84D] text-[#0D0D1A] font-semibold rounded-xl">
            Open Atlas Go
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0D0D1A] flex flex-col items-center p-6">
      <div className="w-full max-w-sm flex flex-col items-center pt-12">
        {/* Logo */}
        <p className="text-gray-500 text-sm font-medium tracking-wider uppercase mb-8">Atlas Go</p>

        {/* Address */}
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#7B68EE] to-[#FFB84D] mb-4 flex items-center justify-center">
          <span className="text-2xl">✦</span>
        </div>
        <h1 className="text-lg font-bold text-white font-mono mb-1">{formatAddress(address)}</h1>
        <p className="text-gray-500 text-xs font-mono mb-6">{address}</p>

        {/* Stats */}
        <div className="flex gap-3 w-full mb-8">
          <div className="flex-1 rounded-2xl border border-gray-800 bg-gray-900/50 p-4 text-center">
            <p className="text-2xl font-bold text-white">{data.emblems.length}</p>
            <p className="text-gray-500 text-xs mt-1">Emblems</p>
          </div>
          <div className="flex-1 rounded-2xl border border-gray-800 bg-gray-900/50 p-4 text-center">
            <p className="text-2xl font-bold text-[#00E5A0]">
              ${data.depositBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
            <p className="text-gray-500 text-xs mt-1">Deposited</p>
          </div>
        </div>

        {/* Emblems grid */}
        {data.emblems.length > 0 ? (
          <>
            <p className="text-gray-500 text-xs uppercase tracking-wider mb-4 self-start">
              Collected Emblems
            </p>
            <div className="grid grid-cols-2 gap-3 w-full mb-8">
              {data.emblems.map((e) => (
                <a
                  key={e.tokenId}
                  href={`/emblem/${e.tokenId}`}
                  className="rounded-2xl border border-gray-800 bg-gray-900/50 p-4 flex flex-col items-center gap-2 hover:border-gray-600 transition-colors"
                >
                  <div
                    className="w-16 h-16 rounded-full overflow-hidden border-2"
                    style={{ borderColor: e.rarityColor }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={e.artwork} alt={e.locationName} className="w-full h-full object-cover" />
                  </div>
                  <div
                    className="text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: e.rarityColor }}
                  >
                    {e.rarity}
                  </div>
                  <p className="text-white text-xs text-center leading-tight">{e.locationName}</p>
                  <p className="text-gray-500 text-[10px]">+{e.boostAPY}% APY</p>
                </a>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600 text-sm">No emblems claimed yet</p>
          </div>
        )}

        {/* CTA */}
        <a
          href="/"
          className="w-full py-3.5 rounded-xl bg-[#FFB84D] text-[#0D0D1A] text-center font-semibold text-base active:scale-[0.97] transition-transform"
        >
          Explore Atlas Go
        </a>
      </div>
    </div>
  )
}
