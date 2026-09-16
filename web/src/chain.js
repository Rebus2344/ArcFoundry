import { ensureWalletNetwork, walletNetwork, walletErrorCode } from './wallet-network.mjs';
import { JsonRpcProvider, BrowserProvider, Contract, formatEther, ZeroAddress } from 'ethers';
import { NETWORKS } from '../../shared/release.mjs';
import { assertWalletSession } from './wallets.mjs';
export async function loadArtifact(name = 'ArcFoundry') {
  const r = await fetch(`/contracts/${name}.json`);
  if (!r.ok) throw new Error('The contract interface could not be loaded. Refresh the page.');
  return r.json();
}
export async function publicConnection(config) {
  if (!config.rpcUrl) return {
    config,
    provider: null,
    contract: null,
    nftCache: new Map()
  };
  const provider = new JsonRpcProvider(config.rpcUrl, undefined, {
    cacheTimeout: -1,
    batchMaxCount: 1
  });
  provider.pollingInterval = 1500;
  const ctx = {
    config,
    provider,
    contract: null,
    nftCache: new Map()
  };
  if (!config.address) return ctx;
  try {
    if (Number((await provider.getNetwork()).chainId) !== config.chainId) throw new Error('The RPC returned a different network.');
    const [a, ta, ha, ra] = await Promise.all(['ArcFoundry', 'FoundryToken', 'FoundryHook', 'FoundryRouter'].map(loadArtifact));
    ctx.artifact = a;
    ctx.contract = new Contract(config.address, a.abi, provider);
    if ((await provider.getCode(config.address)) === '0x' || (await ctx.contract.name()) !== 'ArcFoundry') throw new Error('The official collection is unavailable.');
    ctx.rewardModel = Number(await ctx.contract.BURN_REWARD_MODEL());
    if (ctx.rewardModel !== 2) throw Error('This deployment is incompatible with ArcFoundry v1.');
    const [token, hook] = await Promise.all([ctx.contract.hashToken(), ctx.contract.hook()]);
    if (token.toLowerCase() !== config.token?.toLowerCase() || hook.toLowerCase() !== config.hook?.toLowerCase()) throw new Error('The token configuration does not match the collection.');
    ctx.token = new Contract(token, ta.abi, provider);
    ctx.hook = new Contract(hook, ha.abi, provider);
    ctx.router = new Contract(config.router, ra.abi, provider);
    for (const [field, name] of [['renderer', 'FoundryRenderer'], ['factory', 'FoundryFactory'], ['buildings', 'FactoryBuildings'], ['environment', 'FactoryEnvironment']]) {
      const a = await loadArtifact(name);
      ctx[field] = new Contract(config[field], a.abi, provider);
    }
    return ctx;
  } catch (e) {
    provider.destroy();
    throw e;
  }
}
export async function connectWallet(ctx, local = false, wallet = null, requestAccounts = true) {
  if (!ctx) throw new Error('The connection is loading. Try again in a moment.');
  const network = walletNetwork(ctx.config);
  let signer, walletProvider;
  if (local) {
    if (ctx.config.chainId !== 31337 || !['localhost', '127.0.0.1'].includes(location.hostname)) throw new Error('The test wallet is available only on localhost.');
    signer = await ctx.provider.getSigner(1);
  } else {
    const injected = wallet?.provider;
    if (!injected?.request) throw new Error('Choose an available wallet.');
    if (requestAccounts) await injected.request({
      method: 'eth_requestAccounts'
    });
    await ensureWalletNetwork(injected, ctx.config);
    walletProvider = new BrowserProvider(injected, undefined, {
      cacheTimeout: -1
    });
    try {
      signer = await walletProvider.getSigner(requestAccounts ? undefined : ctx.account);
      if (Number((await walletProvider.getNetwork()).chainId) !== network.chainId) throw new Error('Your wallet is on a different network.');
    } catch (e) {
      walletProvider.destroy();
      throw e;
    }
  }
  const next = {
    ...ctx,
    signer,
    walletProvider,
    walletNetwork: network,
    walletChainId: network.chainId,
    localWallet: local,
    account: await signer.getAddress(),
    eip1193: local ? null : wallet.provider,
    walletName: local ? 'Local test wallet' : wallet.name,
    walletId: local ? 'local' : wallet.id
  };
  try {
    if (!local) await assertWalletSession(next);
    return next;
  } catch (e) {
    walletProvider?.destroy();
    throw e;
  }
}
async function latest(ctx) {
  const block = await ctx.provider.getBlock('latest');
  if (!block || ctx.config.chainId !== 31337 && Date.now() / 1000 - block.timestamp > 45) throw new Error('Fresh blocks are unavailable. Mining is paused.');
  return block;
}
export async function readWork(ctx) {
  if (!ctx.contract) throw new Error('The collection is not deployed yet.');
  const block = await latest(ctx),
    o = {
      blockTag: block.number
    },
    c = ctx.contract;
  const [anchor, prev, target, price] = await Promise.all([c.currentAnchor(o), c.prevWork(o), c.targetFor(ctx.account || ZeroAddress, o), c.mintPrice(o)]);
  return {
    miner: ctx.account || ZeroAddress,
    prev,
    anchor: anchor[1],
    anchorBlock: Number(anchor[0]),
    target: String(target),
    price: String(price),
    block: block.number,
    timestamp: block.timestamp,
    updated: Date.now()
  };
}
export async function snapshot(ctx) {
  const block = await latest(ctx),
    c = ctx.contract,
    h = ctx.hook,
    o = {
      blockTag: block.number
    };
  const [minted, burned, price, epoch, launch, eligible, rentFunded, rentPaid, hookFunded, queue, dev, spent, burnedTokens, supply, fee, tradingSince, poolReady, spot, balance] = await Promise.all([c.totalMinted(o), c.burnedCount(o), c.mintPrice(o), c.currentEpoch(o), c.miningStart(o), c.liveEligible(o), c.totalRentFunded(o), c.totalRentPaid(o), c.totalHookFunded(o), h.queue(o), h.devDue(o), h.buybackSpent(o), h.buybackBurned(o), ctx.token.totalSupply(o), h.currentFee(o), h.tradingSince(o), h.poolReady(o), h.spotSqrtPrice(o), ctx.account ? ctx.token.balanceOf(ctx.account, o) : 0n]);
  return {
    block: block.number,
    timestamp: block.timestamp,
    updated: Date.now(),
    minted: Number(minted),
    burned: Number(burned),
    price,
    epoch: Number(epoch),
    launchAt: Number(launch),
    eligible: Number(eligible),
    rentFunded,
    rentPaid,
    hookFunded,
    queue,
    dev,
    spent,
    burnedTokens,
    supply,
    fee: Number(fee),
    tradingSince: Number(tradingSince),
    poolReady,
    spot,
    balance
  };
}
export async function readNFT(ctx, id, details = true) {
  const owner = await ctx.contract.ownerOf(id);
  let metadata = ctx.nftCache.get(id);
  if (!metadata) {
    const uri = await ctx.contract.tokenURI(id);
    if (!uri.startsWith('data:application/json;base64,')) throw new Error('Unexpected metadata format.');
    metadata = JSON.parse(atob(uri.split(',')[1]));
    ctx.nftCache.set(id, metadata);
  }
  if (!details) return {
    id,
    owner,
    ...metadata
  };
  const [seed, claimable, reward, canBurn] = await Promise.all([ctx.contract.seeds(id), ctx.contract.claimable(id), ctx.contract.burnReward(id), ctx.contract.canBurn(id)]);
  return {
    id,
    owner,
    ...metadata,
    seed,
    claimable,
    reward,
    canBurn: canBurn[0] && canBurn[1],
    hasSuccessor: canBurn[0],
    unlock: Number(canBurn[2])
  };
}
export async function sendChecked(ctx, method, args = [], value = 0n, kind = 'contract') {
  if (!ctx?.signer) throw new Error('Connect your wallet first.');
  if (!ctx[kind]) throw new Error('This contract is not available.');
  if (!ctx.localWallet) await assertWalletSession(ctx);
  const write = ctx[kind].connect(ctx.signer);
  if (ctx.localWallet && ctx.config.chainId === 31337) await ctx.provider.send('evm_mine', []);
  try {
    await write[method].staticCall(...args, {
      value
    });
  } catch (e) {
    let decoded;
    for (const data of [e.data, e.info?.error?.data?.data, e.info?.error?.data]) {
      if (typeof data !== 'string' || data === '0x') continue;
      try {
        decoded = write.interface.parseError(data);
        if (decoded) break;
      } catch {}
    }
    if (decoded) {
      const error = new Error(decoded.name);
      error.code = e.code;
      throw error;
    }
    throw e;
  }
  if (!ctx.localWallet) await assertWalletSession(ctx);
  const overrides = {
    value
  };
  if (kind === 'contract' && method === 'mine' && (await ctx.contract.totalMinted()) >= 503n) {
    overrides.gasLimit = (await write[method].estimateGas(...args, {
      value
    })) * 120n / 100n + 1000000n;
  }
  const tx = await write[method](...args, overrides);
  try {
    const receipt = await ctx.provider.waitForTransaction(tx.hash, 1, 120000);
    if (!receipt || receipt.status !== 1) throw new Error('The transaction did not complete.');
    return receipt;
  } catch (e) {
    e.transactionHash = tx.hash;
    throw e;
  }
}
export const short = a => a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '—';
export const eth = v => v === undefined ? '—' : formatEther(v);
export const amount = v => v === undefined ? '—' : Number(formatEther(v)).toLocaleString('en-US', {
  maximumFractionDigits: 6
});
export function readableError(e) {
  const s = (e?.shortMessage || e?.message || String(e)) + (e?.info?.error?.message ? ` (${e.info.error.message})` : '');
  if (walletErrorCode(e) === 4001 || e?.code === 'ACTION_REJECTED') return 'Wallet request cancelled.';
  if (walletErrorCode(e) === 4200 || walletErrorCode(e) === -32601) return 'This wallet does not support the requested action. For Arc, use a wallet that supports custom EVM networks.';
  if (walletErrorCode(e) === -32002) return 'A request is already open in your wallet. Open the wallet to approve or cancel it.';
  const messages = {
    TransfersClosed: 'SCRAP transfers unlock after 504 mints and a successful first buyback.',
    RewardBelowMinimum: 'The burn reward fell below your minimum. Your NFT was not burned.',
    MiningNotStarted: 'Mining has not started yet.',
    MarketNotReady: 'The token and collection setup is not complete.',
    InvalidAnchor: 'This solution expired. Start a new search.',
    BadProof: 'The mining challenge or difficulty changed. Start a new search.',
    WrongPrice: 'The mint price changed. Refresh before continuing.',
    OneMintPerBlock: 'Another NFT was mined in this block. Start a new search.',
    NotTokenOwner: 'Only the current NFT owner can use this action.',
    NextMintRequired: 'A newer factory must be mined before this one can be burned.',
    BurnTooEarly: 'The 10-minute burn delay has not ended.',
    NothingToClaim: 'This NFT has no unclaimed rent.',
    TradingClosed: 'Trading opens after 504 lifetime mints and the first successful buyback.',
    Slippage: 'The quote changed beyond your slippage limit. Refresh the quote.',
    Expired: 'The swap deadline passed. Request a fresh quote.',
    ERC721NonexistentToken: 'This NFT has not been minted or has been burned.',
    InvalidAmount: 'Enter an amount greater than zero.',
    PaymentFailed: 'The receiving wallet cannot accept this payment. The action could not complete.'
  };
  for (const [key, value] of Object.entries(messages)) if (s.includes(key)) return value;
  if (e?.code === 'INSUFFICIENT_FUNDS' || /insufficient funds/i.test(s)) return 'Your wallet needs enough USDC for the payment and network gas.';
  if (/rate limit|too many requests/i.test(s)) return 'The network provider is busy. Wait a moment, then try again.';
  if (['NETWORK_ERROR', 'TIMEOUT', 'SERVER_ERROR'].includes(e?.code) || /failed to fetch|network request failed|connection refused/i.test(s)) return 'The network connection is unavailable. Check your connection and try again.';
  if (['NONCE_EXPIRED', 'REPLACEMENT_UNDERPRICED'].includes(e?.code)) return 'Your wallet’s transaction count changed. Check recent and pending transactions before trying again.';
  if (/missing revert data|could not coalesce|execution reverted/i.test(s)) return 'The contract could not complete this action. Refresh the page and check the action’s requirements before trying again.';
  return s.slice(0, 350);
}
