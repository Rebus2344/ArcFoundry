import React, { useEffect, useRef } from 'react';
import { seedFromWork, rarityFromSeed } from './factory-work.mjs';
import { RARITIES } from '../../shared/release.mjs';
import { eth } from './chain.js';
export function MiningSolution({
  result,
  canMint,
  busy,
  onMint,
  onDiscard
}) {
  const panel = useRef(null);
  const rarity = RARITIES[rarityFromSeed(seedFromWork(result.hash))];
  useEffect(() => {
    panel.current?.focus({
      preventScroll: true
    });
  }, [result.hash]);
  return <section ref={panel} className="panel solution" tabIndex={-1} aria-labelledby="solution-title"><div><p className="eyebrow">VALID HASH FOUND</p><h2 id="solution-title">Confirm your mint</h2><p className="solution-rarity" style={{
        color: rarity.color
      }}>Cosmetic rarity: <strong>{rarity.name}</strong> · Same economic rights for every rarity</p><p>Submit this solution to mint a Foundry. Another mint can invalidate it before your transaction confirms. A failed transaction may still cost gas.</p></div><div className="solution-actions"><button className="primary" onClick={onMint} disabled={!canMint || !!busy}>Mint for {eth(BigInt(result.work.price))} USDC + gas</button><button className="quiet-button" disabled={!!busy} onClick={onDiscard}>Discard solution</button></div><details><summary>View proof details</summary><code className="wrap">{result.hash}</code><p>Verified on your device before submission.</p></details></section>;
}
