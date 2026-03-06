import type { PrivyClientConfig } from '@privy-io/react-auth'

// Flow EVM chain config
const flowEVM = {
  id: 747,
  name: 'Flow EVM',
  nativeCurrency: { name: 'FLOW', symbol: 'FLOW', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://mainnet.evm.nodes.onflow.org'] },
    public:  { http: ['https://mainnet.evm.nodes.onflow.org'] },
  },
  blockExplorers: {
    default: { name: 'Flowscan', url: 'https://evm.flowscan.io' },
  },
} as const

export const flowEvmConfig: PrivyClientConfig = {
  appearance: {
    theme: 'dark',
    accentColor: '#FFB84D',
    logo: '/icon.png',
    showWalletLoginFirst: false,
  },
  embeddedWallets: {
    createOnLogin: 'all-users', // Silently create custodial wallet for all users
  },
  defaultChain: flowEVM as any,
  supportedChains: [flowEVM as any],
}
