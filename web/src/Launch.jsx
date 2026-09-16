import React, { useState, useRef, useEffect } from 'react';
import { eth } from './chain.js';
import { priceOf, ECONOMY } from '../../shared/protocol.mjs';
import { BoneIcon } from './SiteChrome.jsx';
import { FactoryPortrait } from './FactoryPreview.jsx';
import { traits, WORLDS, BUILDINGS } from '../../art/factory-layers.mjs';
import { RARITIES } from '../../shared/release.mjs';
export function Countdown({
  launchAt = 0
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const remaining = Math.max(0, Math.ceil(launchAt - now / 1000));
  if (!launchAt) return <aside className="launch-banner"><strong>{now < Date.UTC(2026, 8, 17) ? 'Planned launch · September 16' : 'Launch time to be announced'}</strong><span>{now < Date.UTC(2026, 8, 17) ? 'Two hours after Arc Mainnet opens. Exact UTC time follows deployment.' : 'The exact UTC time will appear after deployment.'}</span><a href="#/mine">Benchmark your hardware →</a></aside>;
  return <aside className="launch-banner"><strong>{remaining ? `${Math.floor(remaining / 86400)}d ${Math.floor(remaining / 3600) % 24}h ${Math.floor(remaining / 60) % 60}m ${remaining % 60}s` : 'Mining is live'}</strong><span>{new Date(launchAt * 1000).toISOString().replace('T', ' ').replace('.000Z', ' UTC')}</span></aside>;
}
const examples = Array.from({
  length: 16
}, (_, i) => ({
  blueprint: 10983 + i * 947 & 16383,
  seed: 154325872n + BigInt(i) * 934877n & ~7n | BigInt(i % 8),
  rarity: i % 5
}));
function PackPreview() {
  const [selected, setSelected] = useState(0),
    previewRef = useRef(null),
    example = examples[selected],
    world = WORLDS[traits(example.seed).world],
    rarity = RARITIES[example.rarity];
  const chooseExample = i => {
    setSelected(i);
    previewRef.current?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      block: 'center'
    });
  };
  return <><section ref={previewRef} className="pack-preview" data-rarity={rarity.name} aria-label="Generated Foundry artwork preview" style={{
      '--coat-color': rarity.color
    }}>
  <div className="frame-title"><span><BoneIcon /> EXPLORE THE FOUNDRIES</span><span>{rarity.name.toUpperCase()} SAMPLE</span></div>
  <div className="pack-display collectible-art"><FactoryPortrait {...example} alt={world + ' Foundry artwork example'} /><span className="collectible-foil" aria-hidden="true" /></div>
  <div className="pack-caption" aria-live="polite"><div><span>ARTWORK PREVIEW</span><h2>{world} Foundry</h2><p>{BUILDINGS[0][example.blueprint & 3]} · {BUILDINGS[3][example.blueprint >> 6 & 3]}</p></div><strong>{String(selected + 1).padStart(2, '0')}<small>/ 16</small></strong></div>
 </section><section className="foundry-example-gallery" aria-labelledby="foundry-examples-title"><div className="example-heading"><div><p className="eyebrow">16 GENERATED EXAMPLES / EIGHT PLANETS</p><h2 id="foundry-examples-title">Explore the Foundries</h2><p>Numbered seven-building factories with planetary surroundings and cosmetic rarity.</p></div><a href="#/docs/factories">How the artwork is made →</a></div><div className="pack-swatches" role="group" aria-label="Choose a Foundry preview">{examples.map((e, i) => {
          const sampleWorld = WORLDS[traits(e.seed).world],
            sampleRarity = RARITIES[e.rarity];
          return <button key={i} type="button" className="pack-swatch example-card" data-rarity={sampleRarity.name} aria-label={`Preview ${sampleWorld} Foundry ${i + 1}, ${sampleRarity.name} rarity sample`} aria-pressed={selected === i} onClick={() => chooseExample(i)} style={{
            '--swatch': sampleRarity.color
          }}><span className="example-art collectible-art"><FactoryPortrait {...e} alt="" /><span className="collectible-foil" aria-hidden="true" /></span><span className="example-info"><strong>{sampleWorld} Foundry</strong><small>{sampleRarity.name} · {String(i + 1).padStart(2, '0')}/16</small></span></button>;
        })}</div><p className="pack-disclaimer">These are generated visual samples, not minted NFTs or available inventory. Choosing one does not determine your future Factory or its rarity.</p></section></>;
}
export function Home({
  state,
  config
}) {
  const minted = state?.minted ?? 0,
    progress = Math.min(100, minted / ECONOMY.tradingAt * 100),
    open = !!state?.tradingSince && !!state?.poolReady;
  return <div className="arcade-home"><Countdown launchAt={state?.launchAt ?? config?.launchAt ?? 0} />
  <section className="arcade-hero"><div className="hero-copy"><p className="eyebrow"><span className="pixel-spark" /> PROOF-OF-WORK FOUNDRIES</p><h1>BUILD FACTORIES.<br />PROVE YOUR WORK.<br /><em>ALL ONCHAIN.</em></h1><div className="hero-description"><p className="hero-text">Mine collectible planetary factories on Arc. Your CPU or GPU finds a proof in your browser; a paid USDC mint creates a numbered Foundry with onchain artwork and cosmetic rarity fixed immediately.</p><p className="hero-text">Hold your Foundry for USDC rent funded by later-epoch mints, or permanently burn it for SCRAP and unclaimed rent. Burning ends future rent rights. Mint price and gas are shown before signing.</p></div><div className="hero-actions"><a className="button primary" href="#/mine"><BoneIcon />Open miner<span aria-hidden="true">↗</span></a><a className="button secondary" href="#/docs">How it works <span aria-hidden="true">→</span></a></div><p className="hero-note">CPU / WEBGPU <span>·</span> NO PREMINT <span>·</span> EVERY NFT MINED</p></div><PackPreview /></section>
  <section className="arcade-stats" aria-label="Collection parameters">{[[state ? 'Next mint' : 'First 8 mints', eth(state?.price ?? priceOf(1n)), 'USDC + GAS'], ['NFT premint', '0', 'EVERY FOUNDRY IS MINED'], ['NFT issuance', 'UNCAPPED', 'DIFFICULTY WALL AFTER 16,376'], [state ? 'Total mined' : 'Network status', state ? minted.toLocaleString('en-US') : config?.address ? 'CONNECTING' : 'PENDING', state ? 'ALL SUCCESSFUL MINTS' : config?.address ? 'WAITING FOR NETWORK DATA' : 'AWAITING DEPLOYMENT']].map(([label, value, note]) => <div key={label}><span>{label}</span><strong>{value}</strong><small>{note}</small></div>)}</section>
  <section className="pack-flow"><div className="section-heading"><div><p className="eyebrow">01 / FROM HASH TO FOUNDRY</p><h2>YOUR DEVICE.<br /><em>YOUR FOUNDRY.</em></h2></div><p>No allowlist or reserved NFTs.<br />Everyone uses the same mining process.</p></div><div className="arcade-steps">{[['01', 'SEARCH', 'Connect your wallet and let your CPU or GPU search for a valid hash. Searching uses your device and needs no blockchain transaction.', 'Mining explained', '#/docs/mining'], ['02', 'MINT', 'When a valid hash is found, confirm the mint in your wallet. You pay the current USDC mint price plus gas.', 'Know the rules', '#/docs/prices'], ['03', 'HOLD OR BURN', 'Keep your Foundry, claim funded USDC rent, or permanently burn an eligible NFT for SCRAP.', 'Hold or burn', '#/docs/burn']].map(([n, title, text, label, href]) => <article key={n}><div className="step-number"><span>{n}</span><BoneIcon /></div><h3>{title}</h3><p>{text}</p><a href={href}>{label} <span aria-hidden="true">↗</span></a></article>)}</div></section>
  <section className="pack-economy"><div className="section-heading"><div><p className="eyebrow">02 / YOUR FOUNDRY. YOUR CALL.</p><h2>HOLD THE FACTORY.<br /><em>OR RECOVER THE SCRAP.</em></h2></div><a className="text-link" href="#/economy">Follow the USDC ↗</a></div><div className="pack-choices"><article className="hold-choice"><span className="choice-label">PATH A / HOLD</span><h3>KEEP YOUR FOUNDRY.</h3><p>Keep the artwork. Claim USDC rent funded by mints in later epochs. Claiming keeps your Foundry intact.</p><a href="#/docs/rewards">How rent works <span aria-hidden="true">→</span></a></article><article className="burn-choice"><span className="choice-label">PATH B / BURN</span><h3>TURN WORK INTO SCRAP.</h3><p>Once your NFT is 10 minutes old and a newer Foundry has been mined, you can burn it for unclaimed rent and its current SCRAP reward. The burn is permanent.</p><a href="#/docs/burn">Understand burning <span aria-hidden="true">→</span></a></article></div>
   <div className="pool-milestone"><div><span className="eyebrow">SCRAP / USDC POOL</span><h3>{open ? 'TRADING IS OPEN.' : 'SCRAP TRADING UNLOCKS AFTER 504 MINTS'}</h3><p>{state ? open ? minted.toLocaleString('en-US') + ' total mints.' : minted.toLocaleString('en-US') + ' / 504 lifetime mints toward automatic trading activation.' : 'Mint progress appears after deployment.'}</p><p>NFT mining continues after the pool opens. There is no early administrator launch.</p><p>Starting liquidity: 25 USDC + 2,500,000 SCRAP.</p><div className="milestone-meter" role="progressbar" aria-label="Total NFT mints toward SCRAP trading activation" aria-valuemin={0} aria-valuemax={504} aria-valuenow={Math.min(504, minted)}><span style={{
              width: progress + '%'
            }} /></div></div><a className="button" href="#/token">Explore SCRAP <span aria-hidden="true">↗</span></a></div>
  </section><p className="home-footnote">Future rent depends on future mints. Token sales depend on liquidity. Owner withdrawals are limited to earned income, up to 25 USDC of seed principal and one conditional prelaunch reserve withdrawal.</p>
 </div>;
}
