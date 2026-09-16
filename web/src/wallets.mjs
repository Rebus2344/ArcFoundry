import { walletNetwork } from './wallet-network.mjs';
export const WALLET_CATALOG = [{
  name: 'MetaMask',
  rdns: 'io.metamask',
  url: 'https://metamask.io/download',
  mark: 'M',
  color: '#ed8936'
}, {
  name: 'OKX Wallet',
  rdns: 'com.okex.wallet',
  url: 'https://web3.okx.com',
  mark: 'OKX',
  color: '#c9f84b'
}, {
  name: 'Trust Wallet',
  rdns: 'com.trustwallet.app',
  url: 'https://trustwallet.com/download',
  mark: 'T',
  color: '#67a3ff'
}, {
  name: 'Rabby',
  rdns: 'io.rabby',
  url: 'https://rabby.io',
  mark: 'R',
  color: '#a5a8ff'
}, {
  name: 'Coinbase Wallet',
  rdns: 'com.coinbase.wallet',
  url: 'https://www.coinbase.com/wallet/downloads',
  mark: 'C',
  color: '#5e92ff'
}, {
  name: 'Phantom',
  rdns: 'app.phantom',
  url: 'https://phantom.com/download',
  mark: 'P',
  color: '#bc9bff'
}];
const validProvider = p => p && typeof p.request === 'function';
const label = s => typeof s === 'string' ? s.replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, '').trim().slice(0, 64) : '';
export function safeWalletIcon(icon) {
  return typeof icon === 'string' && icon.length <= 131072 && /^data:image\/(?:png|webp|jpeg|svg\+xml)[;,]/i.test(icon) ? icon : '';
}
export function createWalletDiscovery(surface) {
  let entries = [],
    counter = 0;
  const subscribers = new Set();
  const notify = () => subscribers.forEach(fn => fn());
  function add(provider, info = {}, announced = false) {
    if (!validProvider(provider)) return;
    const existing = entries.find(x => x.provider === provider);
    if (existing) {
      if (announced && !existing.announced) {
        Object.assign(existing, {
          name: label(info.name) || existing.name,
          rdns: label(info.rdns),
          icon: safeWalletIcon(info.icon),
          announced: true
        });
        entries = [...entries];
        notify();
      }
      return;
    }
    entries = [...entries, {
      id: `wallet-${++counter}`,
      provider,
      name: label(info.name) || 'Browser wallet',
      rdns: label(info.rdns),
      icon: safeWalletIcon(info.icon),
      announced
    }];
    notify();
  }
  const onAnnounce = event => {
    try {
      if (event.detail?.info) add(event.detail.provider, event.detail.info, true);
    } catch {}
  };
  surface.addEventListener('eip6963:announceProvider', onAnnounce);
  function legacy() {
    const candidates = [surface.okxwallet, surface.trustwallet, surface.rabby, surface.coinbaseWalletExtension, surface.phantom?.ethereum, ...(Array.isArray(surface.ethereum?.providers) ? surface.ethereum.providers : [surface.ethereum])];
    for (const p of candidates) {
      if (!validProvider(p)) continue;
      let known;
      if (p === surface.okxwallet || p.isOkxWallet || p.isOKExWallet) known = WALLET_CATALOG[1];else if (p === surface.trustwallet || p.isTrust || p.isTrustWallet) known = WALLET_CATALOG[2];else if (p === surface.rabby || p.isRabby) known = WALLET_CATALOG[3];else if (p === surface.coinbaseWalletExtension || p.isCoinbaseWallet) known = WALLET_CATALOG[4];else if (p === surface.phantom?.ethereum || p.isPhantom) known = WALLET_CATALOG[5];else if (p.isMetaMask) known = WALLET_CATALOG[0];
      add(p, known);
    }
  }
  const refresh = () => {
    surface.dispatchEvent(new (surface.Event || Event)('eip6963:requestProvider'));
    legacy();
  };
  surface.addEventListener('ethereum#initialized', refresh);
  refresh();
  return {
    getSnapshot: () => entries,
    subscribe: fn => {
      subscribers.add(fn);
      return () => subscribers.delete(fn);
    },
    refresh,
    destroy() {
      surface.removeEventListener('eip6963:announceProvider', onAnnounce);
      surface.removeEventListener('ethereum#initialized', refresh);
      subscribers.clear();
    }
  };
}
let discovery;
export function walletDiscovery() {
  return discovery ??= createWalletDiscovery(window);
}
if (import.meta.hot) import.meta.hot.dispose(() => discovery?.destroy());
export async function assertWalletSession(ctx) {
  if (!validProvider(ctx.eip1193)) throw new Error('Reconnect your wallet before continuing.');
  const chain = Number(await ctx.eip1193.request({
    method: 'eth_chainId'
  }));
  const accounts = await ctx.eip1193.request({
    method: 'eth_accounts'
  });
  if (chain !== walletNetwork(ctx.config).chainId || accounts[0]?.toLowerCase() !== ctx.account.toLowerCase()) throw new Error('Your account or network changed. Reconnect your wallet.');
}
export function withoutWallet(ctx) {
  return {
    ...ctx,
    signer: null,
    walletProvider: null,
    eip1193: null,
    walletName: null,
    walletId: null,
    localWallet: false,
    account: null,
    walletNetwork: null,
    walletChainId: null
  };
}
