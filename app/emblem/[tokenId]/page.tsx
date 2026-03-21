import type { Metadata } from 'next'
import { getProvider, getEmblemContract } from '@/lib/flowEvm'
import { ethers } from 'ethers'

const RARITY_NAMES = ['special', 'rare', 'epic', 'legendary', 'mythical'] as const
const RARITY_COLORS: Record<string, string> = {
  special: '#A0A0B8', rare: '#00E5A0', epic: '#7B68EE', legendary: '#FFD700', mythical: '#FF6BA0',
}

const LOCATION_INFO: Record<string, { name: string; artwork: string; artTitle: string; partner: string }> = {
  'loc-marina-bay': { artwork: '/emblems/emblem-1-transparent.png', name: 'Marina Bay Sands', artTitle: 'Marina Bay Nights', partner: 'PayPal' },
  'loc-supertree':  { artwork: '/emblems/emblem-2-transparent.png', name: 'Supertree Grove', artTitle: 'Garden of Light', partner: 'Flow' },
  'loc-merlion':    { artwork: '/emblems/emblem-3-transparent.png', name: 'Merlion Park', artTitle: 'Guardian of the Bay', partner: 'PayPal' },
  'loc-cafe':       { artwork: '/emblems/emblem-4-transparent.png', name: 'Flow Cafe', artTitle: 'Cozy Corner', partner: 'Flow' },
  'loc-nearby-0':   { artwork: '/emblems/emblem-5-transparent.png', name: 'Local Bakery', artTitle: 'Sweet Discovery', partner: 'Flow' },
  'loc-nearby-1':   { artwork: '/emblems/emblem-4-transparent.png', name: 'Flow Pop-Up', artTitle: 'Street Discovery', partner: 'Flow' },
  'loc-nearby-2':   { artwork: '/emblems/emblem-2-transparent.png', name: 'Flow Lounge', artTitle: 'Neighborhood Badge', partner: 'Flow' },
  'loc-nearby-3':   { artwork: '/emblems/emblem-1-transparent.png', name: 'Flow Gallery', artTitle: 'Art District Pass', partner: 'Flow' },
}

const LOCATION_BYTES_TO_ID: Record<string, string> = {}
for (const locId of Object.keys(LOCATION_INFO)) {
  LOCATION_BYTES_TO_ID[ethers.keccak256(ethers.toUtf8Bytes(locId))] = locId
}

interface EmblemData {
  tokenId: string
  rarity: string
  rarityColor: string
  boostAPY: number
  depositCap: number
  claimedAt: string
  expiresAt: string
  isActive: boolean
  locationName: string
  partnerName: string
  artwork: string
  artTitle: string
  owner: string
}

async function getEmblemData(tokenId: string): Promise<EmblemData | null> {
  if (!process.env.NEXT_PUBLIC_EMBLEM_CONTRACT) return null
  try {
    const provider = getProvider()
    const emblem = getEmblemContract(provider)
    const meta = await emblem.getEmblemMeta(BigInt(tokenId))
    const owner: string = await emblem.ownerOf(BigInt(tokenId))
    const rarityIndex = Number(meta.rarity)
    const rarityName = RARITY_NAMES[rarityIndex] ?? 'special'
    const locId = LOCATION_BYTES_TO_ID[meta.locationId]
    const info = locId ? LOCATION_INFO[locId] : null
    return {
      tokenId,
      rarity: rarityName,
      rarityColor: RARITY_COLORS[rarityName],
      boostAPY: Number(meta.boostAPY),
      depositCap: Number(meta.depositCap) / 1e6,
      claimedAt: new Date(Number(meta.claimedAt) * 1000).toISOString(),
      expiresAt: new Date(Number(meta.expiresAt) * 1000).toISOString(),
      isActive: Number(meta.expiresAt) > Math.floor(Date.now() / 1000),
      locationName: info?.name ?? 'Unknown Location',
      partnerName: info?.partner ?? 'Flow',
      artwork: info?.artwork ?? '/emblems/emblem-1-transparent.png',
      artTitle: info?.artTitle ?? 'Emblem',
      owner,
    }
  } catch {
    return null
  }
}

export async function generateMetadata(
  { params }: { params: Promise<{ tokenId: string }> }
): Promise<Metadata> {
  const { tokenId } = await params
  const data = await getEmblemData(tokenId)
  if (!data) {
    return { title: 'Emblem Not Found — Atlas Go' }
  }
  const label = data.rarity.charAt(0).toUpperCase() + data.rarity.slice(1)
  return {
    title: `${label} Emblem at ${data.locationName} — Atlas Go`,
    description: `${label} Emblem with +${data.boostAPY}% APY boost. Claimed at ${data.locationName}. Explore. Claim. Earn.`,
    openGraph: {
      title: `${label} Emblem — Atlas Go`,
      description: `+${data.boostAPY}% yield boost at ${data.locationName}`,
      type: 'website',
    },
  }
}

function formatAddress(addr: string) {
  return addr.slice(0, 6) + '...' + addr.slice(-4)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default async function EmblemPage({
  params,
}: {
  params: Promise<{ tokenId: string }>
}) {
  const { tokenId } = await params
  const data = await getEmblemData(tokenId)

  if (!data) {
    return (
      <div className="min-h-screen bg-[#0D0D1A] flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-4xl mb-4">✦</p>
          <h1 className="text-xl font-bold text-white mb-2">Emblem Not Found</h1>
          <p className="text-gray-400 mb-6">This emblem doesn't exist or contracts are not deployed.</p>
          <a href="/" className="inline-block px-6 py-3 bg-[#FFB84D] text-[#0D0D1A] font-semibold rounded-xl">
            Open Atlas Go
          </a>
        </div>
      </div>
    )
  }

  const label = data.rarity.charAt(0).toUpperCase() + data.rarity.slice(1)

  return (
    <div className="min-h-screen bg-[#0D0D1A] flex flex-col items-center p-6">
      {/* Rarity color wash */}
      <div
        className="fixed inset-x-0 top-0 h-[400px] pointer-events-none"
        style={{
          background: `linear-gradient(to bottom, ${data.rarityColor}15 0%, ${data.rarityColor}08 50%, transparent 100%)`,
        }}
      />

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center pt-12">
        {/* Logo */}
        <p className="text-gray-500 text-sm font-medium tracking-wider uppercase mb-8">Atlas Go</p>

        {/* Emblem artwork */}
        <div
          className="w-52 h-52 rounded-full overflow-hidden border-2 mb-6"
          style={{ borderColor: data.rarityColor }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={data.artwork}
            alt={data.artTitle}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Rarity badge */}
        <div
          className="inline-flex px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-3"
          style={{
            color: data.rarityColor,
            backgroundColor: `${data.rarityColor}20`,
            border: `1px solid ${data.rarityColor}40`,
          }}
        >
          {label}
        </div>

        {/* Location */}
        <h1 className="text-2xl font-bold text-white text-center mb-1">{data.locationName}</h1>
        <p className="text-gray-400 text-sm mb-6">{data.partnerName}</p>

        {/* Stats card */}
        <div className="w-full rounded-2xl border border-gray-800 bg-gray-900/50 overflow-hidden mb-6">
          <div className="flex justify-between px-4 py-3 border-b border-gray-800">
            <span className="text-gray-400 text-sm">Boosted APY</span>
            <span className="text-sm font-semibold" style={{ color: data.rarityColor }}>
              {data.boostAPY}%
            </span>
          </div>
          <div className="flex justify-between px-4 py-3 border-b border-gray-800">
            <span className="text-gray-400 text-sm">Deposit Cap</span>
            <span className="text-sm text-white">${data.depositCap.toLocaleString()}</span>
          </div>
          <div className="flex justify-between px-4 py-3 border-b border-gray-800">
            <span className="text-gray-400 text-sm">Duration</span>
            <span className="text-sm text-white">72 hours</span>
          </div>
          <div className="flex justify-between px-4 py-3 border-b border-gray-800">
            <span className="text-gray-400 text-sm">Claimed</span>
            <span className="text-sm text-white">{formatDate(data.claimedAt)}</span>
          </div>
          <div className="flex justify-between px-4 py-3">
            <span className="text-gray-400 text-sm">Owner</span>
            <span className="text-sm text-white font-mono">{formatAddress(data.owner)}</span>
          </div>
        </div>

        {/* Token info */}
        <p className="text-gray-600 text-xs mb-8">
          ERC-721 #{tokenId} on Flow EVM
        </p>

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
