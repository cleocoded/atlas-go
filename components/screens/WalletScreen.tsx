'use client'
import { useState } from 'react'
import { usePrivy }     from '@privy-io/react-auth'
import { useAppStore }  from '@/store/appStore'
import { YieldCounter } from '@/components/ui/YieldCounter'
import { Button }       from '@/components/ui/Button'
import { formatCurrency, formatCountdown } from '@/types'
import { QRCodeSVG } from 'qrcode.react'

function DepositModal({ onClose }: { onClose: () => void }) {
  const address = useAppStore((s) => s.wallet.address)
  const showToast = useAppStore((s) => s.showToast)
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!address) return
    await navigator.clipboard.writeText(address)
    setCopied(true)
    showToast('Address copied!', 'success')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-[30] bg-black/70 flex items-end justify-center" onClick={onClose}>
      <div className="bg-bg-card w-full max-w-mobile rounded-t-card p-6 pb-safe shadow-elevated" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-heading font-bold text-text-primary mb-2">Deposit USDC</h3>
        <p className="text-body-sm text-text-tertiary mb-5">
          Send USDC on Flow EVM Testnet to this address
        </p>

        {address && (
          <div className="flex flex-col items-center gap-4 mb-5">
            <div className="bg-white p-3 rounded-[14px]">
              <QRCodeSVG value={address} size={180} />
            </div>
            <button
              onClick={handleCopy}
              className="w-full bg-bg-elevated rounded-[12px] px-4 py-3 flex items-center gap-2 active:scale-[0.98] transition-transform"
            >
              <span className="text-body-sm text-text-secondary break-all flex-1 text-left font-mono">
                {address}
              </span>
              <span className="text-accent-primary text-body-sm font-semibold whitespace-nowrap">
                {copied ? 'Copied!' : 'Copy'}
              </span>
            </button>
          </div>
        )}

        <Button variant="ghost" size="md" fullWidth onClick={onClose}>Done</Button>
      </div>
    </div>
  )
}

function WithdrawModal({ onClose }: { onClose: () => void }) {
  const [amount, setAmount] = useState('')
  const [toAddress, setToAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const balance       = useAppStore((s) => s.wallet.balance)
  const walletAddress = useAppStore((s) => s.wallet.address)
  const withdraw      = useAppStore((s) => s.withdraw)
  const showToast     = useAppStore((s) => s.showToast)

  const handleSubmit = async () => {
    const val = parseFloat(amount)
    if (isNaN(val) || val <= 0) return
    if (val > balance) {
      showToast('Amount exceeds balance', 'error')
      return
    }
    if (!toAddress.startsWith('0x') || toAddress.length < 42) {
      showToast('Enter a valid wallet address', 'error')
      return
    }
    if (!walletAddress) return

    setLoading(true)
    try {
      const res = await fetch('/api/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress, toAddress, amount: val }),
      })
      const data = await res.json()
      if (data.success) {
        withdraw(val)
        showToast(`Sent ${formatCurrency(val)} to ${toAddress.slice(0, 6)}...${toAddress.slice(-4)}`, 'success')
        onClose()
      } else {
        showToast(data.error ?? 'Withdraw failed', 'error')
      }
    } catch {
      showToast('Withdraw request failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[30] bg-black/70 flex items-end justify-center" onClick={onClose}>
      <div className="bg-bg-card w-full max-w-mobile rounded-t-card p-6 pb-safe shadow-elevated" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-heading font-bold text-text-primary mb-2">Withdraw USDC</h3>
        <p className="text-body-sm text-text-tertiary mb-5">
          Send USDC to an external wallet on Flow EVM Testnet
        </p>

        <div className="mb-4">
          <label className="text-body-sm text-text-secondary block mb-1.5">Amount</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            disabled={loading}
            className="w-full h-12 bg-bg-elevated rounded-[12px] px-4 text-text-primary text-body-lg outline-none border border-border-default focus:border-accent-primary transition-colors disabled:opacity-50"
          />
          <p className="text-body-sm text-text-tertiary mt-1">
            Available: {formatCurrency(balance)}
          </p>
        </div>

        <div className="mb-5">
          <label className="text-body-sm text-text-secondary block mb-1.5">Destination address</label>
          <input
            type="text"
            value={toAddress}
            onChange={(e) => setToAddress(e.target.value)}
            placeholder="0x..."
            disabled={loading}
            className="w-full h-12 bg-bg-elevated rounded-[12px] px-4 text-text-primary text-body-md font-mono outline-none border border-border-default focus:border-accent-primary transition-colors disabled:opacity-50"
          />
        </div>

        <div className="flex gap-3">
          <Button variant="ghost" size="md" fullWidth onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant="primary" size="md" fullWidth onClick={handleSubmit} disabled={loading}>
            {loading ? 'Sending...' : 'Withdraw'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export function WalletScreen() {
  const wallet   = useAppStore((s) => s.wallet)
  const activity = useAppStore((s) => s.activity)
  const navigate = useAppStore((s) => s.navigate)
  const goBack   = useAppStore((s) => s.goBack)
  const deposit  = useAppStore((s) => s.deposit)
  const showToast = useAppStore((s) => s.showToast)
  const { login } = usePrivy()

  const [modal, setModal] = useState<'deposit' | 'withdraw' | null>(null)
  const [faucetLoading, setFaucetLoading] = useState(false)

  const handleFaucet = async () => {
    if (!wallet.address || faucetLoading) return
    setFaucetLoading(true)
    try {
      const res = await fetch('/api/faucet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: wallet.address }),
      })
      const data = await res.json()
      if (data.success) {
        deposit(10000)
        showToast('$10,000 demo USDC received!', 'success')
      } else {
        showToast(data.error ?? 'Faucet failed', 'error')
      }
    } catch {
      showToast('Faucet request failed', 'error')
    } finally {
      setFaucetLoading(false)
    }
  }

  const hasBoost   = !!wallet.activeBoost
  const hasBalance = wallet.balance > 0

  return (
    <div className="flex flex-col w-full h-full bg-bg-primary screen-enter">
      {/* Floating back button */}
      <div className="absolute top-0 left-0 z-10 p-3">
        <button
          onClick={goBack}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-bg-card/60 backdrop-blur-sm text-text-primary active:scale-95 transition-transform"
          aria-label="Back"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {/* Balance hero */}
        <div className="flex flex-col items-center pt-16 pb-8 gap-2">
          <p className="text-body-sm text-text-tertiary uppercase tracking-wider">Total Balance</p>
          <p className="text-[40px] leading-none font-bold text-text-primary tabular-nums">
            {formatCurrency(wallet.balance)}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            <div className="w-1.5 h-1.5 rounded-full bg-accent-boost animate-pulse" />
            <YieldCounter
              currentYield={wallet.accruedYield}
              ratePerSecond={wallet.yieldRatePerSecond}
              className="text-accent-boost text-body-md font-semibold"
            />
            <span className="text-body-sm text-text-tertiary">accrued</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 px-5 mb-8">
          <button
            onClick={() => setModal('deposit')}
            className={`flex-1 h-12 rounded-[14px] bg-bg-card/50 border text-label text-text-primary font-semibold active:scale-[0.97] transition-all ${
              !hasBalance
                ? 'border-accent-primary/50 animate-accent-pulse'
                : 'border-border-default/40 active:bg-bg-card'
            }`}
          >
            Deposit
          </button>
          <button
            onClick={() => setModal('withdraw')}
            disabled={!wallet.isConnected}
            className="flex-1 h-12 rounded-[14px] bg-bg-card/50 border border-border-default/40 text-label text-text-primary font-semibold active:scale-[0.97] active:bg-bg-card transition-all disabled:opacity-40 disabled:pointer-events-none"
          >
            Withdraw
          </button>
        </div>

        {/* Testnet faucet */}
        {wallet.isConnected && !hasBalance && (
          <div className="px-5 mb-6">
            <button
              onClick={handleFaucet}
              disabled={faucetLoading}
              className="w-full h-12 rounded-[14px] bg-accent-boost/10 border border-accent-boost/20 text-accent-boost text-label active:scale-[0.97] transition-transform disabled:opacity-50"
            >
              {faucetLoading ? 'Sending...' : 'Get $10,000 Demo Funds'}
            </button>
            <p className="text-body-sm text-text-disabled text-center mt-1.5">Testnet USDC for testing</p>
          </div>
        )}

        {/* Yield info */}
        <div className="px-5 mb-6">
          <p className="text-body-sm text-text-tertiary uppercase tracking-wider mb-3 px-1">Yield</p>
          <div className="rounded-[14px] border border-border-default/40 bg-bg-card/30 overflow-hidden">
            <div className="flex justify-between px-4 py-3 border-b border-border-default/30">
              <span className="text-body-md text-text-tertiary">Base APY</span>
              <span className="text-label text-text-primary">2-3%</span>
            </div>
            {hasBoost ? (
              <>
                <div className="flex justify-between px-4 py-3 border-b border-border-default/30">
                  <span className="text-body-md text-text-tertiary">Rarity</span>
                  <span className="text-label text-text-primary capitalize">{wallet.activeBoost!.rarity}</span>
                </div>
                <div className="flex justify-between px-4 py-3 border-b border-border-default/30">
                  <span className="text-body-md text-text-tertiary">Boosted APY</span>
                  <span className="text-label text-accent-boost">{wallet.activeBoost!.boostPercentage}%</span>
                </div>
                <div className="flex justify-between px-4 py-3 border-b border-border-default/30">
                  <span className="text-body-md text-text-tertiary">Deposit Cap</span>
                  <span className="text-label text-text-primary">{formatCurrency(wallet.activeBoost!.depositCap, 0)}</span>
                </div>
                <div className="flex justify-between px-4 py-3 border-b border-border-default/30">
                  <span className="text-body-md text-text-tertiary">Boost Expires</span>
                  <span className="text-label text-text-primary">
                    {formatCountdown(wallet.activeBoost!.remainingSeconds)}
                  </span>
                </div>
              </>
            ) : (
              <div className="px-4 py-4 border-b border-border-default/30">
                <p className="text-body-md text-text-tertiary">No active boost</p>
                <button
                  className="text-accent-primary text-body-sm mt-1 active:opacity-70"
                  onClick={() => navigate('map')}
                >
                  Explore the map to find yield boosts
                </button>
              </div>
            )}
            <div className="flex justify-between px-4 py-3 bg-accent-boost/[0.04]">
              <span className="text-body-md text-text-tertiary">Accrued Yield</span>
              <YieldCounter
                currentYield={wallet.accruedYield}
                ratePerSecond={wallet.yieldRatePerSecond}
                className="text-label text-accent-boost"
              />
            </div>
          </div>
        </div>

        {/* Connect wallet prompt */}
        {!wallet.isConnected && (
          <div className="px-5 mb-6">
            <button
              onClick={login}
              className="w-full py-3.5 rounded-[14px] bg-accent-primary text-bg-primary text-label font-semibold active:scale-[0.97] transition-transform shadow-button"
            >
              Connect Wallet
            </button>
          </div>
        )}

        {/* Recent activity */}
        <div className="px-5 mb-8">
          <p className="text-body-sm text-text-tertiary uppercase tracking-wider mb-3 px-1">Recent Activity</p>
          {activity.length === 0 ? (
            <p className="text-body-md text-text-disabled px-1">No activity yet.</p>
          ) : (
            <div className="rounded-[14px] border border-border-default/40 bg-bg-card/30 overflow-hidden">
              {activity.slice(0, 20).map((item, i) => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between px-4 py-3 ${
                    i < Math.min(activity.length, 20) - 1 ? 'border-b border-border-default/30' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-[8px] flex items-center justify-center text-sm ${
                      item.type === 'claim'            ? 'bg-accent-secondary/15 text-accent-secondary'
                      : item.type === 'deposit'        ? 'bg-accent-boost/15 text-accent-boost'
                      : item.type === 'withdraw'       ? 'bg-accent-primary/15 text-accent-primary'
                      : item.type === 'yield_payout'   ? 'bg-accent-boost/15 text-accent-boost'
                      : item.type === 'boost_activated' ? 'bg-accent-primary/15 text-accent-primary'
                      : 'bg-bg-elevated text-text-tertiary'
                    }`}>
                      {item.type === 'claim'            ? '✦'
                      : item.type === 'deposit'         ? '↓'
                      : item.type === 'withdraw'        ? '↑'
                      : item.type === 'yield_payout'    ? '$'
                      : item.type === 'boost_activated' ? '⚡'
                      : '⏱'}
                    </div>
                    <span className="text-body-md text-text-primary">{item.description}</span>
                  </div>
                  {item.amount !== null && (
                    <span className="text-label text-accent-boost ml-2 whitespace-nowrap">
                      {formatCurrency(item.amount)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="h-6" />
      </div>

      {modal === 'deposit' && <DepositModal onClose={() => setModal(null)} />}
      {modal === 'withdraw' && <WithdrawModal onClose={() => setModal(null)} />}
    </div>
  )
}
