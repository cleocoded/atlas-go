import type { PrivyClientConfig } from '@privy-io/react-auth'

// Flow EVM Testnet chain config
const flowEVM = {
  id: 545,
  name: 'Flow EVM Testnet',
  nativeCurrency: { name: 'FLOW', symbol: 'FLOW', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://testnet.evm.nodes.onflow.org'] },
    public:  { http: ['https://testnet.evm.nodes.onflow.org'] },
  },
  blockExplorers: {
    default: { name: 'Flowscan', url: 'https://evm-testnet.flowscan.io' },
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
