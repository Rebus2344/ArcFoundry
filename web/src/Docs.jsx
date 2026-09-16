import React, { useEffect, useRef } from 'react';
import { copy as newCopy, sections } from './protocol-copy.mjs';
import { priceOf, epochStart, epochSize } from '../../shared/protocol.mjs';
import { eth } from './chain.js';
import './docs.css';
const aliases = {
  artwork: 'factories',
  epochs: 'prices',
  rent: 'rewards',
  contracts: 'start'
};
const topicGroups = [['Start here', ['overview', 'mining', 'start']], ['Your Foundry', ['factories', 'rarity', 'burn']], ['Money & token', ['prices', 'rewards', 'trading', 'buybacks']], ['Privacy', ['privacy']]];
function Contents({
  slug,
  copy
}) {
  return topicGroups.map(([group, ids]) => <div className="docs-topic-group" key={group}>
    <p className="docs-topic-label">{group}</p>
    <ul>{ids.map(id => <li key={id}><a href={'#/docs/' + id} aria-current={slug === id ? 'page' : undefined}>{copy[id][0]}</a></li>)}</ul>
  </div>);
}
function FirstSteps() {
  return <section className="docs-first-steps" aria-labelledby="docs-first-steps-title">
  <h2 id="docs-first-steps-title">The three things you can do</h2>
  <div className="docs-step-grid">
    <a href="#/docs/mining"><strong>1. Mine</strong><span>Your device finds a proof. You choose whether to pay USDC and mint a Foundry.</span></a>
    <a href="#/docs/rewards"><strong>2. Hold</strong><span>An eligible Foundry can receive USDC rent from later paid mints. No later mints means no new rent.</span></a>
    <a href="#/docs/burn"><strong>3. Burn</strong><span>Destroy the NFT permanently to receive SCRAP and any funded, unclaimed USDC rent.</span></a>
  </div>
</section>;
}
export function Docs({
  config,
  rewardModel,
  slug = 'overview'
}) {
  const copy = newCopy;
  slug = Object.hasOwn(aliases, slug) ? aliases[slug] : slug;
  const index = sections.indexOf(slug),
    section = index >= 0 ? copy[slug] : null,
    heading = useRef(null),
    mobileMenu = useRef(null);
  useEffect(() => {
    document.title = (section?.[0] || 'Topic not found') + ' · ArcFoundry Docs';
    if (mobileMenu.current) mobileMenu.current.open = false;
    heading.current?.focus({
      preventScroll: true
    });
    window.scrollTo({
      top: 0,
      behavior: 'auto'
    });
  }, [slug]);
  return <div className="docs-layout">
    <aside className="docs-sidebar">
      <p className="eyebrow">ARCFOUNDRY DOCS</p>
      <nav aria-label="Documentation topics"><Contents slug={slug} copy={copy} /></nav>
      <a className="docs-download" href='/docs/arcfoundry-guide.md' download="arcfoundry-guide.md">Download full guide ↓</a>
      <p className="docs-version">v1.0 · English · Arc Mainnet</p>
    </aside>
    <details ref={mobileMenu} className="docs-mobile-nav">
      <summary>Browse topics <span>{section?.[0] || 'Docs'}</span></summary>
      <nav aria-label="Documentation topics"><Contents slug={slug} copy={copy} /></nav>
    </details>
    <article className="document docs-content" aria-labelledby="docs-title">
      <p className="eyebrow">{section ? 'GUIDE ' + String(index + 1).padStart(2, '0') + ' / ' + sections.length : 'ARCFOUNDRY DOCS'}</p>
      <h1 id="docs-title" ref={heading} tabIndex={-1}>{section?.[0] || 'Documentation topic not found'}</h1>
      {section ? <>
        <p className="lead">{section[1]}</p>
        {slug === 'overview' && <><FirstSteps /><p className="docs-status">{config?.address ? 'Deployment connected. Check addresses and launch status.' : 'Mainnet deployment pending. Device benchmark is available.'} <a href="#/stats">Network status →</a></p></>}
        {section.slice(2).map((text, i) => <p key={i}>{text}</p>)}
        {slug === 'prices' && <div className="docs-table-scroll" tabIndex={0} role="region" aria-label="Epoch mint prices"><table><caption>Mint prices in USDC · issuance continues beyond this table</caption><thead><tr><th scope="col">Epoch</th><th scope="col">NFT numbers</th><th scope="col">USDC / mint</th></tr></thead><tbody>{Array.from({
                length: 11
              }, (_, e) => <tr key={e}><th scope="row">{e}</th><td>{String(epochStart(e))}–{String(epochStart(e) + epochSize(e) - 1n)}</td><td>{eth(priceOf(epochStart(e)))}</td></tr>)}</tbody></table></div>}
        {slug === 'start' && <div className="docs-links"><a href="https://docs.arc.io/arc/references/rpc-endpoints" target="_blank" rel="noreferrer">Official network settings ↗</a></div>}
        <div className="docs-pager" aria-label="Continue reading">{index > 0 && <a href={'#/docs/' + sections[index - 1]}><small>← Previous</small>{copy[sections[index - 1]][0]}</a>}{index < sections.length - 1 && <a className="docs-next" href={'#/docs/' + sections[index + 1]}><small>Next →</small>{copy[sections[index + 1]][0]}</a>}</div>
        <p className="docs-version">Rules v1.0 · ArcFoundry</p>
      </> : <><p>This topic does not exist. Choose a topic from the guide.</p><a href="#/docs">Back to overview</a></>}
    </article>
  </div>;
}
