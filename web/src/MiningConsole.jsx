import { RARITIES } from '../../shared/release.mjs';
import React, { useMemo } from 'react';
import { expectedSeconds, probability } from '../../shared/pow.mjs';
import { hashBits, targetHex, difficultyBits, compactNumber, waitTime, formatChance } from './mining-display.mjs';
import { previewImage, seedFromWork, rarityFromSeed } from './factory-work.mjs';
function HashStrip({
  hash,
  target = false
}) {
  const chars = hash?.slice(2).split('') || Array(64).fill(null);
  let prefix = true;
  return <div className={`hash-strip ${target ? 'target-strip' : ''}`} aria-hidden="true">{chars.map((c, i) => {
      const zero = prefix && c === '0';
      if (c !== '0') prefix = false;
      return <i key={i} className={zero ? 'zero' : ''} style={c && !zero && !target ? {
        backgroundColor: `hsl(${parseInt(c, 16) * 23} 34% 46%)`
      } : undefined} />;
    })}</div>;
}
export function WorkPortrait({
  hash,
  timestamp = 0,
  className = '',
  alt = ''
}) {
  const image = useMemo(() => hash ? previewImage(seedFromWork(hash)) : null, [hash]);
  return <img className={className} src={image || previewImage(154325877n, 10983, 2)} width="512" height="584" alt={alt} />;
}
export function MiningConsole({
  test = false,
  running,
  status,
  stats,
  target,
  children,
  footer,
  timestamp,
  solution = false
}) {
  const rarity = stats.best ? RARITIES[rarityFromSeed(seedFromWork(stats.best))] : null;
  const bits = hashBits(stats.best),
    targetValue = targetHex(target),
    difficulty = difficultyBits(target),
    history = stats.history || [];
  return <section className={`mine-console ${running ? 'is-running' : ''} ${test ? 'is-test' : ''}`} aria-label={test ? 'Miner speed test' : 'Mining dashboard'}>
  <div className="console-title"><h2>{test ? 'Miner lab' : 'Foundry miner'}</h2><span><i />{status}</span></div>
  <div className="console-top">
   <figure className={`work-portrait ${stats.best ? 'has-work' : ''}`} data-rarity={rarity?.name}><div className="portrait-label">{test ? 'TEST PORTRAIT' : solution ? 'WORK PREVIEW' : 'BEST HASH PREVIEW'}</div><WorkPortrait hash={stats.best} timestamp={timestamp} alt={stats.best ? 'Factory preview from your best hash' : 'Foundry artwork example'} /><figcaption>{rarity ? <strong className="portrait-rarity" style={{
            color: rarity.color
          }}>{rarity.name} · {test ? 'test find' : 'work preview'}</strong> : 'What will your hash build?'}<span>{test ? 'Test artwork only · no NFT earned' : stats.best ? 'Rarity follows this hash. Building layout is assigned at mint.' : 'Start searching to reveal a preview.'}</span></figcaption></figure>
   <div className="console-readout">
    <div className="hash-heading"><h3>{stats.best ? 'Best hash this challenge' : 'Waiting for your first hash'}</h3><span>{stats.best ? `${bits} zero bits` : 'Keccak-256'}</span></div>
    <HashStrip hash={stats.best} /><code className="hash-value">{stats.best ? <><mark>{stats.best.slice(0, 2 + Math.floor(bits / 4))}</mark>{stats.best.slice(2 + Math.floor(bits / 4))}</> : 'Your CPU or GPU will fill this with real work.'}</code>
    <div className="hash-heading target-heading"><h3>{test ? 'Benchmark only' : 'Target to beat'}</h3><span>{test ? 'No mint target' : difficulty === null ? 'Awaiting network' : `${difficulty.toFixed(2)} bits`}</span></div>
    <HashStrip hash={test ? null : targetValue} target />
    <p className="hash-explainer">{test ? 'Synthetic work measures your speed. It cannot produce a mintable solution.' : 'A hash must be numerically lower than the target. More leading zeros usually mean a smaller hash.'}</p>
    <dl className="console-metrics">
     <div className="speed-metric"><dt>{running ? 'Hashrate' : stats.attempts ? 'Last average speed' : 'Hashrate'}</dt><dd>{(stats.rate / 1e6).toFixed(2)} <small>MH/s</small></dd></div>
     <div><dt>{test ? 'Test attempts' : 'Session attempts'}</dt><dd title={stats.attempts.toLocaleString('en-US')}>{compactNumber(stats.attempts)}</dd></div>
     <div><dt>{test ? 'Time left' : 'Average wait'}</dt><dd>{test ? `${stats.remaining} s` : target && stats.rate ? waitTime(expectedSeconds(target, stats.rate)) : '—'}</dd></div>
     <div><dt>{test ? 'Test length' : 'Chance / minute'}</dt><dd>{test ? '60 s' : target && stats.rate ? formatChance(probability(target, stats.rate, 60)) : '—'}</dd></div>
    </dl>
    {test ? <div className="test-progress" role="progressbar" aria-label="Speed test progress" aria-valuemin={0} aria-valuemax={60} aria-valuenow={Math.floor(stats.elapsed)}><span style={{
            width: `${stats.elapsed / 60 * 100}%`
          }} /></div> : <p className="console-estimate">Average wait is an estimate, not a countdown. Each hash is an independent attempt; difficulty can change.</p>}
   </div>
  </div>
  <div className="console-controls mining-controls">{children}</div>
  {footer && <div className="console-footnote">{footer}</div>}
  <div className="work-history"><div className="hash-heading"><h3>{test ? 'Best finds from this test' : 'Best finds this challenge'}</h3><span>{history.length ? `${history.length} recent previews` : 'Your trail starts here'}</span></div>
   {history.length ? <ol>{history.map(hash => <li key={hash}><WorkPortrait hash={hash} timestamp={timestamp} /><span>{hashBits(hash)} <small>zero bits</small><small className="history-rarity" style={{
              color: RARITIES[rarityFromSeed(seedFromWork(hash))].color
            }}>{RARITIES[rarityFromSeed(seedFromWork(hash))].name}</small></span></li>)}</ol> : <div className="history-empty"><span aria-hidden="true">◇ → ◇ → ◇</span><p>Your best attempts will appear here as you search. These previews are not minted NFTs.</p></div>}
   {history.length > 0 && <p className="history-caption">Recent best hashes, newest first. {test ? 'Test work cannot be used after launch.' : 'A near miss does not improve the odds of your next attempt. These are previews, not NFTs.'}</p>}
  </div>
 </section>;
}
