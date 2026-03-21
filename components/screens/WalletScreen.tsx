'use client'
import { useState } from 'react'
import { usePrivy }     from '@privy-io/react-auth'
import { useAppStore }  from '@/store/appStore'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { YieldCounter } from '@/components/ui/YieldCounter'
import { Button }       from '@/components/ui/Button'
import { formatCurrency, formatCountdown } from '@/types'
import { CrossmintWidget } from '@/components/wallet/CrossmintWidget'

function DepositWithdrawModal({
  mode,
  onClose,
}: {
  mode: 'deposit' | 'withdraw'
  onClose: () => void
}) {
  const [amount, setAmount] = useState('')
  const deposit  = useAppStore((s) => s.deposit)
  const withdraw = useAppStore((s) => s.withdraw)
  const balance  = useAppStore((s) => s.wallet.balance)

  const handleSubmit = () => {
    const val = parseFloat(amount)
    if (isNaN(val) || val <= 0) return
    if (mode === 'deposit')  deposit(val)
    if (mode === 'withdraw') withdraw(Math.min(val, balance))
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[30] bg-black/70 flex items-end justify-center">
      <div className="bg-bg-card w-full max-w-mobile rounded-t-card p-6 pb-safe shadow-elevated">
        <h3 className="text-heading font-bold text-text-primary mb-4 capitalize">{mode} stgUSDC</h3>
        <div className="mb-4">
          <label className="text-body-md text-text-secondary block mb-2">Amount (USD)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full h-12 bg-bg-elevated rounded-input px-4 text-text-primary text-body-lg outline-none border border-border-default focus:border-accent-primary transition-colors"
          />
          {mode === 'withdraw' && (
            <p className="text-body-sm text-text-tertiary mt-1">
              Available: {formatCurrency(balance)}
            </p>
          )}
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" size="md" fullWidth onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="md" fullWidth onClick={handleSubmit}>
            {mode === 'deposit' ? 'Deposit' : 'Withdraw'}
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
  const deposit  = useAppStore((s) => s.deposit)
  const { login } = usePrivy()

  const [modal, setModal] = useState<'deposit' | 'withdraw' | null>(null)

  const hasBoost   = !!wallet.activeBoost
  const hasBalance = wallet.balance > 0

  return (
    <div className="flex flex-col w-full h-full bg-bg-primary screen-enter">
      <ScreenHeader title="Wallet" />

      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {/* Balance */}
        <div className="flex flex-col items-center py-8 gap-1">
          <p className="text-body-md text-text-tertiary">Total Balance</p>
          <p className="text-display-lg font-bold text-text-primary tabular-nums">
            {formatCurrency(wallet.balance)}
          </p>
          <div className="flex items-center gap-1 text-accent-boost text-body-md">
            <span>↑</span>
            <YieldCounter
              currentYield={wallet.accruedYield}
              ratePerSecond={wallet.yieldRatePerSecond}
              className="text-accent-boost font-semibold"
            />
            <span>accrued</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 px-4 mb-6">
          <Button
            variant="secondary"
            size="md"
            fullWidth
            onClick={() => setModal('deposit')}
            className={!hasBalance ? 'animate-accent-pulse border border-accent-primary' : ''}
          >
            Deposit
          </Button>
          <Button
            variant="secondary"
            size="md"
            fullWidth
            onClick={() => setModal('withdraw')}
            state={!wallet.isConnected ? 'disabled' : 'default'}
          >
            Withdraw
          </Button>
        </div>

        {/* Yield info */}
        <div className="mx-4 mb-6 bg-bg-card rounded-card p-5 shadow-card">
          <p className="text-label text-text-secondary mb-3 uppercase tracking-wide text-body-sm">
            Yield Info
          </p>
          <div className="flex justify-between py-2 border-b border-border-default">
            <span className="text-body-md text-text-tertiary">Base APY</span>
            <span className="text-label text-text-primary">2-3%</span>
          </div>
          {hasBoost ? (
            <>
              <div className="flex justify-between py-2 border-b border-border-default">
                <span className="text-body-md text-text-tertiary">Rarity</span>
                <span className="text-label text-text-primary capitalize">{wallet.activeBoost!.rarity}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border-default">
                <span className="text-body-md text-text-tertiary">Boosted APY</span>
                <span className="text-label text-accent-boost">{wallet.activeBoost!.boostPercentage}%</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border-default">
                <span className="text-body-md text-text-tertiary">Deposit Cap</span>
                <span className="text-label text-text-primary">{formatCurrency(wallet.activeBoost!.depositCap, 0)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border-default">
                <span className="text-body-md text-text-tertiary">Boost Expires</span>
                <span className="text-label text-text-primary">
                  {formatCountdown(wallet.activeBoost!.remainingSeconds)}
                </span>
              </div>
            </>
          ) : (
            <div className="py-3">
              <p className="text-body-md text-text-tertiary">No Active Boost</p>
              <button
                className="text-accent-primary text-body-sm mt-1 active:opacity-70"
                onClick={() => navigate('map')}
              >
                Explore the map to find yield boosts!
              </button>
            </div>
          )}
          <div className="flex justify-between py-2 pt-3">
            <span className="text-body-md text-text-tertiary">Accrued Yield</span>
            <YieldCounter
              currentYield={wallet.accruedYield}
              ratePerSecond={wallet.yieldRatePerSecond}
              className="text-label text-accent-boost"
            />
          </div>
        </div>

        {/* Crossmint onramp */}
        <div className="mx-4 mb-6 bg-bg-card rounded-card p-5 shadow-card">
          <p className="text-label text-text-secondary mb-3 uppercase tracking-wide text-body-sm">
            Buy stgUSDC
          </p>
          <CrossmintWidget
            recipientAddress={wallet.address}
            onSuccess={(amount) => {
              deposit(amount)
            }}
          />
        </div>

        {/* Connect wallet prompt */}
        {!wallet.isConnected && (
          <div className="mx-4 mb-6">
            <Button variant="primary" fullWidth onClick={login}>
              Connect Wallet
            </Button>
          </div>
        )}

        {/* Recent activity */}
        <div className="mx-4 mb-8">
          <p className="text-label text-text-secondary mb-3 uppercase tracking-wide text-body-sm">
            Recent Activity
          </p>
          {activity.length === 0 ? (
            <p className="text-body-md text-text-tertiary">No activity yet.</p>
          ) : (
            <div className="flex flex-col gap-0">
              {activity.slice(0, 20).map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between py-3 border-b border-border-default last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg leading-none">
                      {item.type === 'claim'           ? '✦'
                      : item.type === 'deposit'        ? '↓'
                      : item.type === 'withdraw'       ? '↑'
                      : item.type === 'yield_payout'   ? '💰'
                      : item.type === 'boost_activated'? '⚡'
                      : '⏱'}
                    </span>
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
      </div>

      {modal && (
        <DepositWithdrawModal mode={modal} onClose={() => setModal(null)} />
      )}
    </div>
  )
}
