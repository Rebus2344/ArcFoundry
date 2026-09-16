import React, { useEffect, useRef, useState } from 'react';
import { LAUNCH_AT } from '../../shared/release.mjs';
import { short } from './chain.js';
const collectionUrl = config => /^https:\/\/opensea\.io\/collection\/[a-zA-Z0-9_-]+\/?$/.test(config?.openseaUrl || '') ? config.openseaUrl : 'https://opensea.io/collection/thearcfoundry';
export function SiteHeader({
  route,
  ctx,
  config,
  state,
  busy,
  connect,
  disconnect
}) {
  const header = useRef(null);
  const walletMenu = useRef(null),
    walletButton = useRef(null),
    [walletOpen, setWalletOpen] = useState(false);
  useEffect(() => {
    setWalletOpen(false);
  }, [route, ctx?.account]);
  useEffect(() => {
    if (!walletOpen) return;
    const outside = e => {
        if (!walletMenu.current?.contains(e.target)) setWalletOpen(false);
      },
      escape = e => {
        if (e.key === 'Escape') {
          setWalletOpen(false);
          walletButton.current?.focus();
        }
      };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [walletOpen]);
  useEffect(() => {
    const update = () => document.documentElement.style.setProperty('--header-height', `${Math.ceil(header.current.getBoundingClientRect().height)}px`);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(header.current);
    return () => observer.disconnect();
  }, []);
  const links = [['mine', 'Mine'], ['collection', 'Collection'], ['token', '$SCRAP'], ['docs', 'Docs']];
  const active = route.startsWith('nft/') ? 'collection' : route.startsWith('docs') ? 'docs' : route === 'hash' ? 'token' : route;
  return <header ref={header} className="site-header"><Brand /><nav aria-label="Main navigation"><a href="#/rent" className={route === 'rent' ? 'active' : ''}>Claim USDC</a>{links.map(([id, label]) => <a key={id} className={active === id ? 'active' : ''} aria-current={active === id ? 'page' : undefined} href={`#/${id}`}>{label}</a>)}<a href={collectionUrl(config)} target="_blank" rel="noopener noreferrer">OpenSea ↗</a></nav><a className="header-status" href="#/stats" aria-label="View network status"><i /><span>{config?.chainId === 31337 ? 'LOCAL TEST' : 'ARC MAINNET'}</span><small>{state ? `${state.minted.toLocaleString('en-US')} MINED` : config?.address ? 'CONNECTING' : Date.now() / 1000 < (config?.launchAt ?? LAUNCH_AT) ? 'PRE-LAUNCH' : 'AWAITING ACTIVATION'}</small></a><div className="wallet" ref={walletMenu}>{ctx?.account ? <><button ref={walletButton} className="wallet-account" title={ctx.account} aria-label={`Wallet options for ${short(ctx.account)}`} aria-expanded={walletOpen} aria-controls="connected-wallet" disabled={!!busy} onClick={() => setWalletOpen(v => !v)}>My wallet <small>{short(ctx.account)} ▾</small></button>{walletOpen && <div id="connected-wallet" className="wallet-popover" aria-label="Connected wallet"><strong>{ctx.walletName || 'Connected wallet'}</strong>{ctx.walletNetwork && <small>{ctx.walletNetwork.networkName}{ctx.walletChainId !== ctx.walletNetwork.chainId ? ' · switch required' : ''}</small>}<code>{ctx.account}</code><a href="#/account" onClick={() => setWalletOpen(false)}>My Foundries →</a><a href="#/rent" onClick={() => setWalletOpen(false)}>Claim USDC rent →</a><button disabled={!!busy} onClick={() => {
            setWalletOpen(false);
            connect();
          }}>Switch wallet</button><button disabled={!!busy} onClick={() => {
            setWalletOpen(false);
            disconnect?.();
          }}>Disconnect</button></div>}</> : <button onClick={() => connect()} disabled={!ctx || !!busy}>Connect wallet</button>}</div></header>;
}
export function ConnectionState({
  config,
  subject = 'Live data'
}) {
  return <section className="empty connection-state" role="status"><h2>{config?.address ? 'Loading live data' : 'Getting ready for launch'}</h2><p>{config?.address ? `${subject} is loading from the blockchain. If this takes longer than expected, check your connection and reload the page.` : `${subject} will appear when launch setup is complete. You can check the countdown and prepare your mining settings now.`}</p><a href="#/mine">Open mining page →</a></section>;
}
export function Brand() {
  return <a className="brand" href="#/" aria-label="ArcFoundry home"><img src="/brand/foundry-mark.svg" width="36" height="36" alt="" /><span className="brand-name">ARC<span>FOUNDRY</span></span></a>;
}
export function BoneIcon({
  className = ''
}) {
  return <svg className={className} viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><path d="M2 12h4V4h6v14l8-6v6l10-6v18H2zm5 10v4h4v-4zm8 0v4h4v-4zm8 0v4h4v-4z" /></svg>;
}
export function SiteFooter({
  config
}) {
  return <footer className="site-footer"><div className="footer-about"><Brand /><p>Unique factories. Real proof of work.<br />Your device. Your work. Your Foundry.</p><span className="footer-network"><i /> Arc Mainnet</span><p><a href="https://x.com/TheArcFoundry" target="_blank" rel="noopener noreferrer" aria-label="ArcFoundry on X (Twitter)">X (Twitter) · @TheArcFoundry ↗</a></p></div><div className="footer-links"><div><h2>THE APP</h2><a href="#/mine">Mine a Foundry</a><a href="#/collection">Explore Foundries</a><a href="#/account">My Foundries</a><a href="#/rent">Claim USDC rent</a><a href="#/token">Trade SCRAP</a><a href={collectionUrl(config)} target="_blank" rel="noopener noreferrer">OpenSea ↗</a></div><div><h2>THE RULES</h2><a href="https://github.com/Rebus2344/ArcFoundry" target="_blank" rel="noopener noreferrer">GitHub ↗</a><a href="#/docs">Documentation</a><a href="#/docs/factories">Onchain artwork</a><a href="#/economy">Economics</a><a href="#/stats">Network stats</a></div></div><div className="footer-bottom"><span>Every Foundry starts with a hash. <a href="#/privacy">Privacy</a></span><span>ARC MAINNET · PROOF OF WORK <BoneIcon /></span></div></footer>;
}
