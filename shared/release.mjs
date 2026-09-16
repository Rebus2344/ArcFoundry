export const LAUNCH_AT = 0;
export const MAINNET = {
  networkName: 'Arc Mainnet',
  mode: 'mainnet',
  chainId: 5042,
  rpcUrl: 'https://rpc.mainnet.arc.io',
  explorer: 'https://explorer.arc.io',
  verified: true
};
export const NETWORKS = {
  5042: {
    name: MAINNET.networkName,
    rpcUrl: MAINNET.rpcUrl,
    explorer: MAINNET.explorer,
    mode: 'mainnet'
  },
  5042002: {
    name: 'Arc Testnet',
    rpcUrl: 'https://rpc.testnet.arc.io',
    explorer: 'https://testnet.arcscan.app',
    mode: 'testnet'
  },
  31337: {
    name: 'Local Arc simulation',
    rpcUrl: 'http://127.0.0.1:8546',
    explorer: '',
    mode: 'local'
  }
};
export const RELEASE = {
  name: 'ArcFoundry',
  networkName: 'Arc Mainnet',
  mode: 'mainnet',
  version: '1.0.0',
  chainId: MAINNET.chainId,
  rpcUrl: MAINNET.rpcUrl,
  explorer: MAINNET.explorer,
  address: null,
  launchAt: 0,
  mintPrice: '0.17295126',
  initialBits: 34,
  floorBits: 26,
  treasury: null,
  partner: null,
  poolSeedUSDC: '25',
  tokenSymbol: 'SCRAP',
  token: null,
  hook: null,
  router: null,
  manager: null,
  weth: '0x0000000000000000000000000000000000000000'
};
export const utcDate = s => new Date(s * 1000).toLocaleString('en-US', {
  timeZone: 'UTC'
}) + ' UTC';
export const RARITIES = [{
  name: 'Common',
  chance: 60,
  color: '#9ca3af'
}, {
  name: 'Uncommon',
  chance: 25,
  color: '#ffffff'
}, {
  name: 'Rare',
  chance: 10,
  color: '#4ca9ff'
}, {
  name: 'Epic',
  chance: 4,
  color: '#b780ff'
}, {
  name: 'Legendary',
  chance: 1,
  color: '#ffb344'
}];
