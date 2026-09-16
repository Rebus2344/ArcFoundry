import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { walletDiscovery, WALLET_CATALOG } from './wallets.mjs';
import './wallet.css';
export function WalletDialog({
  onChoose,
  onClose,
  busy = false,
  error = '',
  discovery = walletDiscovery()
}) {
  const dialog = useRef(null),
    [showMore, setShowMore] = useState(false);
  const wallets = useSyncExternalStore(discovery.subscribe, discovery.getSnapshot);
  function keepFocus(event) {
    if (event.key !== 'Tab') return;
    const node = dialog.current,
      items = [...node.querySelectorAll('button:not(:disabled),a[href]')],
      first = items[0],
      last = items.at(-1);
    if (!first) {
      event.preventDefault();
      return;
    }
    if (event.shiftKey && (document.activeElement === first || !node.contains(document.activeElement))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !node.contains(document.activeElement))) {
      event.preventDefault();
      first.focus();
    }
  }
  useEffect(() => {
    const previous = document.activeElement,
      node = dialog.current,
      overflow = document.body.style.overflow;
    node.showModal();
    document.body.style.overflow = 'hidden';
    discovery.refresh();
    return () => {
      node.close();
      document.body.style.overflow = overflow;
      previous?.focus?.({
        preventScroll: true
      });
    };
  }, [discovery]);
  const missing = WALLET_CATALOG.filter(w => !wallets.some(x => x.rdns === w.rdns || x.name.toLowerCase() === w.name.toLowerCase()));
  return <dialog ref={dialog} className="wallet-dialog" aria-labelledby="wallet-dialog-title" aria-describedby="wallet-dialog-help" onKeyDown={keepFocus} onCancel={e => {
    e.preventDefault();
    if (!busy) onClose();
  }} onClick={e => {
    if (e.target === dialog.current && !busy) {
      const r = dialog.current.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) onClose();
    }
  }}>
  <div className="wallet-dialog-top"><div><p className="wallet-eyebrow">YOUR WALLET. YOUR FOUNDRIES.</p><h2 id="wallet-dialog-title">Choose a wallet</h2></div><button type="button" className="wallet-close" aria-label="Close wallet selection" disabled={busy} onClick={onClose}>×</button></div>
  <p id="wallet-dialog-help">Connect on Arc Testnet. Connecting does not send a transaction.</p>
  {error && <p className="wallet-dialog-error" role="alert">{error}</p>}
  {busy && <p className="wallet-dialog-status" role="status">Check your wallet to finish connecting…</p>}
  {wallets.length > 0 ? <><h3 className="wallet-list-title">Available in this browser</h3><div className="wallet-options">{wallets.map(w => <button type="button" className="wallet-option" key={w.id} disabled={busy} onClick={() => onChoose(w)}><WalletBadge wallet={w} /><span>{w.name}<small>Connect wallet</small></span><span className="wallet-arrow" aria-hidden="true">→</span></button>)}</div></> : <div className="wallet-empty"><strong>No wallet detected</strong><p>On mobile, open shibahash.fun in your wallet’s built-in browser. On desktop, install or enable an extension, then refresh this list.</p><button type="button" disabled={busy} onClick={discovery.refresh}>Check for wallets</button></div>}
  {missing.length > 0 && <>{wallets.length ? <button className="wallet-more" type="button" aria-expanded={showMore} disabled={busy} onClick={() => setShowMore(!showMore)}>Need another wallet? <span aria-hidden="true">{showMore ? '−' : '+'}</span></button> : <h3 className="wallet-list-title">Get a wallet</h3>}{(showMore || wallets.length === 0) && <div className="wallet-downloads">{missing.map(w => <a key={w.rdns} href={w.url} target="_blank" rel="noopener noreferrer"><WalletBadge wallet={w} /><span>{w.name}<small>Official website ↗</small></span></a>)}</div>}</>}
  <p className="wallet-footnote">Use a wallet that supports custom EVM networks. On mobile, connect from its built-in browser.</p>
 </dialog>;
}
function WalletBadge({
  wallet
}) {
  const known = WALLET_CATALOG.find(x => x.rdns === wallet.rdns),
    color = known?.color || '#a5e5a7';
  return <span className="wallet-badge" style={{
    '--wallet-color': color
  }} aria-hidden="true">{wallet.icon ? <img src={wallet.icon} alt="" width="32" height="32" /> : known?.mark || wallet.name.slice(0, 1)}</span>;
}
