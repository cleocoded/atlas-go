# Atlas Go

**Location-based DeFi on Flow.** Visit real-world locations, claim attendance emblems, and earn boosted yield on your USDC deposits.

Atlas Go is built entirely on **Flow** and leverages Flow's native Cadence Arch precompile for verifiable on-chain randomness.

## How It Works

1. **Explore** — Walk to locations on the map
2. **Claim** — Mint an attendance emblem NFT (rarity determined by on-chain VRF)
3. **Earn** — Higher rarity = higher boosted APY on your deposits for 72 hours

### Rarity Tiers

| Rarity | Chance | Boosted APY | Deposit Cap |
|-----------|--------|-------------|-------------|
| Special | 55% | 5% | $10,000 |
| Rare | 25% | 10% | $10,000 |
| Epic | 13% | 50% | $5,000 |
| Legendary | 5% | 200% | $2,000 |
| Mythical | 2% | 500% | $1,000 |

Mythical is limited to one per location. Rarity is determined at claim time using **Cadence Arch** (`0x0000000000000000000000010000000000000001`), Flow's native VRF via a commit-reveal pattern.

## Deployed Contracts — Flow EVM Testnet

| Contract | Address |
|---|---|
| **MockERC20 (USDC)** | [`0x6C28e852af49E199851253793B490D90fed05231`](https://evm-testnet.flowscan.io/address/0x6C28e852af49E199851253793B490D90fed05231) |
| **AtlasGoEmblem (ERC-721)** | [`0x54111d0410d462fA71172520dc9a7219a0F38688`](https://evm-testnet.flowscan.io/address/0x54111d0410d462fA71172520dc9a7219a0F38688) |
| **MockLending** | [`0xB6B33b5aef35c8253FAf56026BB0984Dbc94025D`](https://evm-testnet.flowscan.io/address/0xB6B33b5aef35c8253FAf56026BB0984Dbc94025D) |
| **IncentivePool** | [`0x9D26f8820afdD4317EAB9ceFd3c99767314cd7BB`](https://evm-testnet.flowscan.io/address/0x9D26f8820afdD4317EAB9ceFd3c99767314cd7BB) |

**Network:** Flow EVM Testnet (Chain ID `545`)
**RPC:** `https://testnet.evm.nodes.onflow.org`
**Explorer:** [evm-testnet.flowscan.io](https://evm-testnet.flowscan.io)
**Deployer:** `0x1Fa83649B2090Ef3ca3Ab33bf6dc9ca61cb6cE7f`

## Tech Stack

- **Network:** Flow EVM (Solidity contracts, no Cadence)
- **Frontend:** Next.js 14, Tailwind CSS, TypeScript
- **Auth & Wallet:** Privy (embedded EVM wallet, gasless transactions)
- **Map:** Mapbox GL JS v3
- **State:** Zustand + immer
- **Stablecoin:** USDC
- **Base Yield:** More Markets lending (MockLending on testnet), 2-3% APY
- **Boost Yield:** $50k incentive pool, paid from IncentivePool contract

## Getting Started

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local
# Fill in your Privy and Mapbox keys

# Run development server
npm run dev
```

## Contract Deployment

```bash
cd contracts
npm install
DEPLOYER_PRIVATE_KEY=0x... npx hardhat run deploy.js --network flowTestnet
```

This deploys all four contracts, mints $50k USDC to the incentive pool, and $10k to the lending yield reserve.

## Architecture

```
User (PWA)
  ↓ Privy embedded wallet
  ↓ Gasless relay via server API routes
  ↓
Flow EVM Testnet (545)
  ├── AtlasGoEmblem — ERC-721, commit-reveal claim with Cadence Arch VRF
  ├── MockLending — deposit/withdraw USDC, 2.5% base APY
  ├── IncentivePool — $50k boost pool, rarity-based APY boosts (72h)
  └── MockERC20 — testnet USDC with open mint
```

## License

MIT
