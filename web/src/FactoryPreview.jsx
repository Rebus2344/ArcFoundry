import React, { useMemo, useState } from 'react';
import { factorySVG, traits, WORLDS, BUILDINGS } from '../../art/factory-layers.mjs';
import { RARITIES } from '../../shared/release.mjs';
const data = svg => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
export function randomFactory() {
  const n = crypto.getRandomValues(new Uint32Array(3));
  return {
    blueprint: n[0] & 16383,
    seed: BigInt(n[1]) << 32n | BigInt(n[2])
  };
}
export function FactoryPortrait({
  blueprint = 8191,
  seed = 92437101n,
  rarity = 2,
  className = '',
  alt = 'Procedural planetary factory'
}) {
  const url = useMemo(() => data(factorySVG(blueprint, seed, rarity)), [blueprint, seed, rarity]);
  return <img className={className} src={url} alt={alt} width="512" height="584" />;
}
export function FactoryPreview() {
  const [example, setExample] = useState(() => ({
    blueprint: 10983,
    seed: 154325877n
  }));
  const t = traits(example.seed);
  return <figure className="factory-stage"><div className="stage-label">{"PROCEDURAL FACTORY / DESIGN EXAMPLE"}</div><FactoryPortrait {...example} rarity={4} /><figcaption><div><strong>{WORLDS[t.world]}{" complex"}</strong><span>{BUILDINGS[0][example.blueprint & 3]}{" · "}{BUILDINGS[3][example.blueprint >> 6 & 3]}</span></div><button type="button" onClick={() => setExample(randomFactory())}>{"New example ↻"}</button></figcaption><p>{"Artwork example, not a minted NFT. Final environment and rarity are revealed after mint."}</p></figure>;
}
export function FactoryGallery() {
  const [version, setVersion] = useState(0);
  const examples = useMemo(() => WORLDS.map((_, i) => {
    const e = randomFactory();
    return {
      ...e,
      seed: e.seed & ~7n | BigInt(i)
    };
  }), [version]);
  return <section className="factory-gallery"><div className="gallery-heading"><div><p className="eyebrow">{"SEVEN ZONES / EIGHT WORLDS"}</p><h2>{"No two foundries alike."}</h2><p>{"Explore generated examples. These are not minted NFTs or available inventory."}</p></div><button onClick={() => setVersion(v => v + 1)}>{"Generate another set ↻"}</button></div><div className="factory-samples">{examples.map((e, i) => <article className="collectible-card collectible-sample" data-rarity={RARITIES[i % 5].name} key={i}><div className="collectible-art"><FactoryPortrait {...e} rarity={i % 5} alt={`${WORLDS[i]} Foundry artwork sample`} /><span className="collectible-foil" aria-hidden="true" /></div><div className="collectible-meta"><div className="collectible-topline"><span>ARCFOUNDRY / SAMPLE</span><span>POW</span></div><h3>{WORLDS[i]} Foundry</h3><p>{BUILDINGS[0][e.blueprint & 3]} · {BUILDINGS[5][e.blueprint >> 10 & 3]}</p><div className="collectible-footer"><strong>{RARITIES[i % 5].name}</strong><span>Example</span></div></div></article>)}</div></section>;
}
