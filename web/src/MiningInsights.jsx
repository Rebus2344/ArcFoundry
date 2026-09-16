import React, { useEffect, useMemo, useState } from 'react';
import { readMiningNetwork, readRecentMints } from './mining-network.mjs';
import { difficultyBits, compactNumber, waitTime, nextEpoch, hashBits, difficultyExample } from './mining-display.mjs';
import { previewImage } from './factory-work.mjs';
import { expectedSeconds } from '../../shared/pow.mjs';
import { ECONOMY } from '../../shared/protocol.mjs';
import { readableError } from './chain.js';
export function MiningInsights({
  ctx,
  state,
  rate = 0
}) {
  const [network, setNetwork] = useState(null),
    [error, setError] = useState('');
  useEffect(() => {
    setNetwork(null);
    setError('');
    if (!ctx?.contract) return;
    let active = true,
      timer;
    async function poll() {
      try {
        const n = await readMiningNetwork(ctx);
        if (active) {
          setNetwork(n);
          setError('');
        }
      } catch (e) {
        if (active) setError(readableError(e));
      }
      if (active) timer = setTimeout(poll, 10000);
    }
    void poll();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [ctx]);
  return <><div className="mining-insights"><DifficultyLab rate={rate} /><MiningNetwork network={network} error={error} connected={!!ctx?.account} deployed={!!ctx?.contract} /></div><LatestMints ctx={ctx} minted={network?.minted ?? state?.minted} burned={state?.burned} /></>;
}
export function DifficultyLab({
  rate = 0
}) {
  const [bits, setBits] = useState(24),
    attempts = 2 ** bits;
  return <section className="mine-info-card difficulty-lab"><div className="info-title"><h2>One bit. Twice the work.</h2><span>DIFFICULTY LAB</span></div><div className="info-body">
  <p>Every extra bit of difficulty halves the chance of success per hash. Try a target below.</p>
  <div className="difficulty-chart" role="img" aria-label={`Expected work doubles with each bit: ${compactNumber(2 ** (bits - 2))} hashes at ${bits - 2} bits to ${compactNumber(2 ** (bits + 2))} hashes at ${bits + 2} bits.`}>{[-2, -1, 0, 1, 2].map((offset, i) => <div key={offset} className={offset === 0 ? 'selected' : ''}><span>{compactNumber(2 ** (bits + offset))}</span><i style={{
            height: 16 * 2 ** i / 2
          }} /><small>{bits + offset} bits</small></div>)}</div>
  <div className="difficulty-slider"><label htmlFor="example-difficulty">Example difficulty</label><output htmlFor="example-difficulty">{bits} bits</output><input id="example-difficulty" type="range" min="8" max="52" step="1" value={bits} onChange={e => setBits(Number(e.target.value))} aria-describedby="difficulty-model-help" /></div>
  <div className="difficulty-result"><div><span>Average work</span><strong>{compactNumber(attempts)} hashes</strong></div><div><span>At your measured speed</span><strong>{rate > 0 ? waitTime(expectedSeconds(difficultyExample(bits), rate)) : 'Run your miner'}</strong></div></div>
  <p id="difficulty-model-help" className="info-note">Illustration only. This slider does not change mining difficulty. Hashes do not accumulate toward a guaranteed result.</p><a className="text-link" href="#/docs/mining">How proof of work works →</a>
 </div></section>;
}
export function MiningNetwork({
  network: n,
  error,
  connected,
  deployed
}) {
  const epoch = n ? nextEpoch(n.minted, n.floorBits) : null;
  return <section className="mine-info-card mining-network"><div className="info-title"><h2>On the network</h2><span>{error ? 'DATA UNAVAILABLE' : n ? `BLOCK ${n.block.toLocaleString('en-US')}` : deployed ? 'CONNECTING' : 'PRE-LAUNCH'}</span></div><div className="info-body">
  {!n || error ? <div className="network-wait"><h3>{error ? 'Waiting for fresh data' : deployed ? 'Reading the blockchain' : 'Foundry mining starts at launch'}</h3><p>{error ? `${error} This panel will retry automatically.` : deployed ? 'Live difficulty and recent mints will appear when the connection is ready.' : 'Live difficulty, mint activity and your wallet’s target will appear after contract activation.'}</p><p>All Foundries are mined. No team NFTs. SCRAP trading opens after <strong>504 lifetime mints</strong>.</p></div> : <>
   <div className="network-target"><span>{connected ? 'Your current difficulty' : 'Network difficulty'}</span><strong>{difficultyBits(connected ? n.personalTarget : n.target).toFixed(2)} <small>bits</small></strong></div>
   <dl className="network-metrics"><div><dt>Lifetime mints</dt><dd>{n.minted.toLocaleString('en-US')}</dd></div><div><dt>Last mint</dt><dd>{n.lastMint ? `${waitTime(Math.max(0, n.timestamp - n.lastMint))} ago` : 'No mints yet'}</dd></div><div><dt>Network streak</dt><dd>{n.burst}</dd></div><div><dt>Your streak</dt><dd>{connected ? n.personalBurst : 'Connect wallet'}</dd></div></dl>
   <p className="info-note">Streaks make the target harder. The network streak drops by one every 10 seconds without a mint. Your streak follows the same rule since your own last mint.</p>
   <div className="epoch-heading"><strong>Next mint · Epoch {epoch.epoch}</strong><span>Floor {epoch.floor} bits</span></div><progress value={epoch.completed} max={epoch.size} aria-label={`Epoch ${epoch.epoch} mints`} /><p className="info-note">{epoch.remaining.toLocaleString('en-US')} {epoch.remaining === 1 ? 'mint' : 'mints'} until the next epoch. Epoch size and baseline work both double at each new epoch.</p>
   <div className="pool-mint-progress"><span>{n.minted >= ECONOMY.tradingAt ? 'Trading threshold reached' : `${Math.max(0, ECONOMY.tradingAt - n.minted).toLocaleString('en-US')} ${ECONOMY.tradingAt - n.minted === 1 ? 'mint' : 'mints'} until SCRAP trading`}</span><a href="#/token">View SCRAP →</a></div>
   <details className="network-details"><summary>Challenge & block anchor</summary><p>The miner uses a recent Arc Testnet block. Its anchor is valid for 250 blocks, and your wallet address is part of the work.</p><span>Anchor block {n.anchorBlock.toLocaleString('en-US')}</span><code>{n.anchor}</code><span>Previous work</span><code>{n.prev}</code><span>Exact target {connected ? 'for your wallet' : ''}</span><code>{'0x' + BigInt(connected ? n.personalTarget : n.target).toString(16).padStart(64, '0')}</code></details>
  </>}
 </div></section>;
}
export function LatestMints({
  ctx,
  minted,
  burned
}) {
  const [items, setItems] = useState([]),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(false),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setItems([]);
    setError('');
    setLoading(!!ctx?.contract && minted > 0);
    if (!ctx?.contract || !minted) return;
    readRecentMints(ctx, minted).then(list => {
      if (active) setItems(list);
    }).catch(e => {
      if (active) setError(readableError(e));
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [ctx, minted, burned, retry]);
  const portraits = useMemo(() => items.map(n => ({
    ...n,
    image: previewImage(n.seed, n.blueprint, n.rarity)
  })), [items]);
  return <section className="mine-info-card latest-mints"><div className="info-title"><h2>Fresh from the foundry</h2><a href="#/collection">View collection →</a></div><div className="info-body">
  {error ? <div className="network-wait"><p role="alert">{error}</p><button onClick={() => setRetry(n => n + 1)}>Retry latest mints</button></div> : loading || ctx?.contract && (minted === undefined || minted > 0 && !portraits.length) ? <p role="status">Loading the latest onchain Foundries…</p> : portraits.length ? <><div className="latest-shibas">{portraits.map(n => {
            const content = <><img src={n.image} alt={`ArcFoundry #${n.id}`} loading="lazy" width="128" height="146" /><span><strong>#{n.id.toLocaleString('en-US')}</strong><small>{n.burned ? 'Burned' : `${hashBits(n.hash)} bits`}</small></span></>;
            return n.burned ? <div className="latest-shiba is-burned" key={n.id}>{content}</div> : <a className="latest-shiba" key={n.id} href={`#/nft/${n.id}`}>{content}</a>;
          })}</div><p className="info-note">The latest lifetime mints. Bit counts show leading zero bits in each winning hash, not rarity. Burned NFTs are marked.</p></> : <div className="latest-empty"><img src="/brand/foundry-mark.svg" alt="" width="64" height="64" /><div><h3>The first Foundry could be yours.</h3><p>Confirmed mints will appear here with their artwork and NFT number. Until then, explore your miner and get ready for launch.</p></div></div>}
 </div></section>;
}
