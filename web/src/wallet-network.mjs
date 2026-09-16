import { NETWORKS } from '../../shared/release.mjs';
export function walletNetwork(config = {}) {
  if (Number.isSafeInteger(config.chainId) && config.chainId > 0 && config.rpcUrl) {
    return {
      chainId: config.chainId,
      networkName: config.networkName || NETWORKS[config.chainId]?.name || 'Arc',
      rpcUrl: config.rpcUrl,
      explorer: config.explorer || ''
    };
  }
  if (config.chainId || config.rpcUrl || config.address) throw new Error('The published network settings are incomplete. Please try again after they are updated.');
  const testnet = NETWORKS[5042002];
  return {
    chainId: 5042002,
    networkName: testnet.name,
    rpcUrl: testnet.rpcUrl,
    explorer: testnet.explorer
  };
}
export function walletErrorCode(error) {
  const outer = Number(error?.code),
    nested = error?.data?.originalError?.code ?? error?.info?.error?.code;
  return nested !== undefined && (!Number.isFinite(outer) || outer === -32603) ? Number(nested) : outer;
}
export async function ensureWalletNetwork(provider, config) {
  if (!provider?.request) throw new Error('Reconnect your wallet before starting mining.');
  const network = walletNetwork(config),
    chainId = '0x' + network.chainId.toString(16);
  const current = async () => Number(await provider.request({
    method: 'eth_chainId'
  }));
  if ((await current()) !== network.chainId) {
    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{
          chainId
        }]
      });
    } catch (error) {
      if (walletErrorCode(error) !== 4902) throw error;
      await provider.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId,
          chainName: network.networkName,
          nativeCurrency: {
            name: 'USDC',
            symbol: 'USDC',
            decimals: 18
          },
          rpcUrls: [network.rpcUrl],
          ...(network.explorer ? {
            blockExplorerUrls: [network.explorer]
          } : {})
        }]
      });
      if ((await current()) !== network.chainId) await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{
          chainId
        }]
      });
    }
  }
  if ((await current()) !== network.chainId) throw new Error(`Switch to ${network.networkName} in your wallet, then start mining again.`);
  return network;
}
