import { isAddress, ZeroAddress } from 'ethers';
import React, { useState, useEffect } from 'react';
import { readNFT, readableError, eth, amount } from './chain.js';
import { NETWORKS, utcDate } from '../../shared/release.mjs';
import { FactoryGallery } from './FactoryPreview.jsx';
import { ConnectionState } from './SiteChrome.jsx';
export function Collection({
  ctx,
  state,
  account,
  tx,
  busy,
  connect
}) {
  const [items, setItems] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [page, setPage] = useState(0),
    [owned, setOwned] = useState(0),
    [search, setSearch] = useState(''),
    [draft, setDraft] = useState(''),
    [reload, setReload] = useState(0);
  const [selected, setSelected] = useState([]);
  const canRead = !!ctx?.contract && !!state && (!account || !!ctx.account);
  useEffect(() => {
    setSelected([]);
    setPage(0);
    setSearch('');
    setDraft('');
    setItems([]);
    setOwned(0);
    setError('');
  }, [account, ctx?.account, ctx?.config.address]);
  useEffect(() => {
    if (!canRead) return;
    let alive = true,
      timer;
    setLoading(true);
    setError('');
    async function poll() {
      try {
        const count = account ? Number(await ctx.contract.balanceOf(ctx.account)) : state.minted;
        if (!alive) return;
        setOwned(count);
        if (!search && page > Math.max(0, Math.ceil(count / 24) - 1)) {
          setPage(Math.max(0, Math.ceil(count / 24) - 1));
          return;
        }
        const ids = search ? Number(search) > 0 && Number(search) <= state.minted ? [Number(search)] : [] : account ? await Promise.all(Array.from({
          length: Math.max(0, Math.min(24, count - page * 24))
        }, (_, i) => ctx.contract.tokenOfOwnerByIndex(ctx.account, page * 24 + i).then(Number))) : Array.from({
          length: Math.max(0, Math.min(24, count - page * 24))
        }, (_, i) => page * 24 + i + 1);
        const list = [];
        for (let i = 0; i < ids.length; i += 3) {
          if (!alive) return;
          list.push(...(await Promise.all(ids.slice(i, i + 3).map(async id => {
            try {
              return await readNFT(ctx, id, account);
            } catch (e) {
              if (e.code === 'CALL_EXCEPTION' && String(e).includes('ERC721NonexistentToken')) return null;
              throw e;
            }
          }))));
        }
        if (alive) {
          setItems(list.filter(n => n && (!account || n.owner.toLowerCase() === ctx.account.toLowerCase())));
          setError('');
        }
      } catch (e) {
        if (alive) setError(readableError(e));
      } finally {
        if (alive) {
          setLoading(false);
          timer = setTimeout(poll, 30000);
        }
      }
    }
    void poll();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [ctx, canRead, state?.minted, state?.burned, state?.rentPaid, account, page, search, reload]);
  const claimable = items.filter(n => n.claimable > 0n),
    rent = claimable.reduce((sum, n) => sum + n.claimable, 0n);
  const clearSearch = () => {
    setSearch('');
    setDraft('');
    setPage(0);
  };
  return <><div className="page-heading"><div><p className="eyebrow">{"02 / INVENTORY"}</p><h1>{account ? 'My Factories' : 'Collection'}</h1><p>{account ? 'View your Factories, claim available USDC rent or burn an eligible NFT for SCRAP.' : 'Explore Factories created by miners. Open an NFT to see its artwork, traits and current owner.'}</p></div><span className="tag">{state ? `${(state.minted - state.burned).toLocaleString('en-US')} NFTs in circulation` : ctx?.config.address ? 'Connecting' : 'Pre-launch'}</span></div>
  {account && !ctx?.account && <section className="panel wallet-prompt"><h2>{"Your wallet, your Factories"}</h2><p>{"Connect the wallet that holds your NFTs to manage them here."}</p><div className="row"><button className="primary" disabled={!ctx || !!busy} onClick={() => connect()}>{"Connect wallet"}</button>{ctx?.config.chainId === 31337 && <button onClick={() => connect(true)}>{"Local test wallet"}</button>}</div></section>}
  {ctx?.config.openseaUrl && <a className="button" href={ctx.config.openseaUrl} target="_blank" rel="noreferrer">View collection on OpenSea ↗</a>}
  {canRead && <>
   {account && <BulkActions ctx={ctx} selected={selected} tx={tx} busy={busy} clear={() => setSelected([])} />}
   {account && !loading && !error && claimable.length > 0 && <section className="panel rent-summary"><div><span>{"Claimable on this page"}</span><strong>{eth(rent)}{" USDC"}</strong><p className="subtle">{"Claiming rent keeps your NFTs. Network gas is extra."}</p></div><button className="primary" disabled={!!busy} onClick={() => tx('claimMany', [claimable.map(n => n.id)])}>{"Claim rent from "}{claimable.length} {claimable.length === 1 ? 'NFT' : 'NFTs'}</button></section>}
   <form className="filters" onSubmit={e => {
        e.preventDefault();
        setPage(0);
        setSearch(draft);
      }}><label htmlFor="nft-search">{"Find an NFT by number"}<input id="nft-search" inputMode="numeric" placeholder={"e.g. 21"} value={draft} onChange={e => setDraft(e.target.value.replace(/\D/g, '').slice(0, 10))} /></label><button type="submit" disabled={loading || !draft}>{"Find NFT"}</button>{search && <button type="button" onClick={clearSearch}>{"Clear search"}</button>}<span>{account ? `${owned.toLocaleString('en-US')} in your wallet` : `${state.minted.toLocaleString('en-US')} mined · ${state.burned.toLocaleString('en-US')} burned`}</span></form>
   {error ? <section className="panel collection-error"><h2>{"Could not load the collection"}</h2><p role="alert">{error}</p><button onClick={() => setReload(v => v + 1)}>{"Try again"}</button></section> : loading ? <p className="loading" role="status">{"Loading Factories…"}</p> : items.length ? <div className="nft-grid">{items.map(n => {
          const rarity = n.attributes.find(a => a.trait_type === 'Rarity')?.value ?? 'Unrevealed';
          const epoch = n.attributes.find(a => a.trait_type === 'Epoch')?.value;
          return <div key={n.id}>{account && <label className="nft-select"><input type="checkbox" checked={selected.includes(n.id)} onChange={e => setSelected(v => e.target.checked ? [...v, n.id] : v.filter(id => id !== n.id))} />Select #{n.id}</label>}<a className="nft-card collectible-card" data-rarity={rarity} href={`#/nft/${n.id}`} key={n.id} aria-label={`${n.name}, ${rarity}, epoch ${epoch}`}><div className="collectible-art"><img src={n.image} alt="" loading="lazy" width="512" height="584" /><span className="collectible-foil" aria-hidden="true" /></div><div className="collectible-meta"><div className="collectible-topline"><span>ARCFOUNDRY / #{String(n.id).padStart(5, '0')}</span><span>POW</span></div><h3>{n.name}</h3><div className="collectible-footer"><strong>{rarity}</strong><span>Epoch {epoch}</span></div>{account && <p className="card-rent">{eth(n.claimable)} USDC claimable</p>}</div></a></div>;
        })}</div> : <section className="empty"><h2>{search ? 'No matching NFT' : account ? 'No Factories in this wallet' : 'No Factories on this page'}</h2><p>{search ? `NFT #${Number(search)} ${account ? 'is not in this wallet. It may belong to another wallet, be unminted or have been burned.' : 'has not been minted or has been burned.'}` : account ? 'Your mined or received NFTs will appear here.' : state.minted ? 'NFTs in this range have been burned. Use the page controls to continue browsing.' : 'The first successfully mined factory will appear here.'}</p>{!search && <a className="button" href="#/mine">{account ? 'Mine your first factory' : 'Open miner'}{" →"}</a>}</section>}
   {!search && owned > 24 && <div className="pagination" aria-label={"Collection pages"}><button disabled={loading || page === 0} onClick={() => setPage(p => p - 1)}>{"← Previous"}</button><span>{"Page "}{page + 1}{" of "}{Math.ceil(owned / 24)}</span><button disabled={loading || (page + 1) * 24 >= owned} onClick={() => setPage(p => p + 1)}>{"Next →"}</button></div>}
  </>}
  {!state && (!account || ctx?.account) && <><ConnectionState config={ctx?.config} subject="The collection" /><FactoryGallery /></>}
 </>;
}
function toleranceBps(value) {
  const n = Number(value);
  return value !== '' && Number.isFinite(n) && n >= 0 && n <= 50 ? Math.round(n * 100) : null;
}
function Tolerance({
  value,
  set
}) {
  return <label>Maximum reward decrease (%)<input type="number" min="0" max="50" step="0.1" value={value} onChange={e => set(e.target.value)} /><small>Default 0.5%. A failed transaction preserves your NFTs but may cost gas.</small></label>;
}
function BulkActions({
  ctx,
  selected,
  tx,
  busy,
  clear
}) {
  const [quote, setQuote] = useState(null),
    [slip, setSlip] = useState('0.5'),
    [error, setError] = useState('');
  useEffect(() => {
    setQuote(null);
    setError('');
  }, [selected, ctx]);
  const bps = toleranceBps(slip);
  async function review() {
    try {
      setError('');
      const rows = [];
      for (let i = 0; i < selected.length; i += 3) rows.push(...(await Promise.all(selected.slice(i, i + 3).map(id => readNFT(ctx, id)))));
      if (rows.some(n => n.owner.toLowerCase() !== ctx.account.toLowerCase())) throw Error('Ownership changed. Refresh your selection.');
      setQuote(rows);
    } catch (e) {
      setError(readableError(e));
    }
  }
  async function execute(burn) {
    if (!quote || bps === null) return;
    for (let i = 0; i < quote.length; i += 50) {
      const group = quote.slice(i, i + 50).filter(n => burn || n.claimable > 0n),
        ids = group.map(n => n.id),
        reward = group.reduce((sum, n) => sum + n.reward, 0n);
      if (!ids.length) continue;
      if (!(await tx(burn ? 'burnMany' : 'claimMany', burn ? [ids, reward * BigInt(10000 - bps) / 10000n] : [ids]))) return;
    }
    clear();
  }
  const reward = quote?.reduce((sum, n) => sum + n.reward, 0n) || 0n,
    rent = quote?.reduce((sum, n) => sum + n.claimable, 0n) || 0n;
  return <section className="panel batch-actions"><h2>Selected factories · {selected.length}</h2><p>{selected.length ? selected.map(id => '#' + id).join(', ') : 'Select cards to review a rent claim or permanent batch burn.'}</p><button disabled={!selected.length || !!busy} onClick={review}>Review selected NFTs</button> <button disabled={!!busy || !selected.length} onClick={clear}>Clear selection</button>{quote && <><p>Current reward: {amount(reward)} SCRAP · Rent: {eth(rent)} USDC</p><Tolerance value={slip} set={setSlip} /><p>Minimum SCRAP: {bps === null ? 'Invalid tolerance' : amount(reward * BigInt(10000 - bps) / 10000n)} · {Math.ceil(quote.length / 50)} transaction(s)</p><p>Burning permanently destroys every listed NFT. Each transaction is all-or-nothing; completed earlier batches cannot be undone.</p><div className="form-actions"><button disabled={!!busy || rent === 0n} onClick={() => execute(false)}>Claim selected rent</button><button className="danger" disabled={!!busy || bps === null || quote.some(n => !n.canBurn)} onClick={() => execute(true)}>Permanently burn selected NFTs</button></div>{quote.some(n => !n.canBurn) && <p>Some selected NFTs still need a successor or the 10-minute delay.</p>}</>}{error && <p role="alert">{error}</p>}</section>;
}
export function NFTPage({
  ctx,
  state,
  id,
  tx,
  busy,
  connect
}) {
  const [n, setN] = useState(null),
    [error, setError] = useState(''),
    [confirm, setConfirm] = useState(false),
    [slip, setSlip] = useState('0.5'),
    [recipient, setRecipient] = useState('');
  const valid = Number.isSafeInteger(id) && id > 0;
  useEffect(() => {
    setN(null);
    setConfirm(false);
    setError('');
  }, [ctx, id]);
  useEffect(() => {
    let active = true;
    if (ctx?.contract && valid) readNFT(ctx, id).then(v => {
      if (active) setN(v);
    }).catch(e => {
      if (active) setError(readableError(e));
    });
    return () => {
      active = false;
    };
  }, [ctx, id, valid, state?.block]);
  if (!n) return <section className="panel"><h1>Factory #{id}</h1><p>{error || (!valid ? 'Invalid NFT number' : ctx?.contract ? 'Loading factory…' : 'NFT details appear after deployment.')}</p><a href="#/collection">Back to collection →</a></section>;
  const owned = n.owner.toLowerCase() === ctx.account?.toLowerCase(),
    rarity = n.attributes.find(a => a.trait_type === 'Rarity')?.value,
    bps = toleranceBps(slip),
    minimum = bps === null ? 0n : n.reward * BigInt(10000 - bps) / 10000n;
  const sea = ctx.config.openseaUrl && (ctx.config.openseaChain ? `https://opensea.io/assets/${ctx.config.openseaChain}/${ctx.config.address}/${id}` : ctx.config.openseaUrl);
  return <><a className="back" href="#/collection">← Back to collection</a><section className="nft-detail"><div className="nft-art-frame" data-rarity={rarity}><div className="collectible-art"><img className="nft-image" src={n.image} alt={n.name} /><span className="collectible-foil" aria-hidden="true" /></div></div><div><p className="eyebrow">PROOF OF WORK / {rarity}</p><h1>{n.name}</h1><p>Owner <code className="wrap">{n.owner}</code></p>{sea && <a className="button" href={sea} target="_blank" rel="noreferrer">View on OpenSea ↗</a>}<div className="trait-grid">{n.attributes.map(a => <div key={a.trait_type}><span>{a.trait_type}</span><strong>{a.value}</strong></div>)}</div><section className="panel"><h2>Rewards</h2><p>{eth(n.claimable)} USDC rent · {amount(n.reward)} SCRAP burn quote</p><p>All rarities have the same economic rights. The burn quote decreases with later mint epochs. Unclaimed rent travels with the NFT.</p>{owned ? <button disabled={!!busy || !n.claimable} onClick={() => tx('claim', [id])}>Claim rent</button> : !ctx.account ? <button onClick={() => connect()}>Connect wallet</button> : <p>Only the NFT owner can claim or burn.</p>}</section>
 {owned && <><section className="burn-area">{!n.canBurn && <p>{!n.hasSuccessor ? 'A newer NFT must be minted. ' : ''}Burn delay ends: {utcDate(n.unlock)}.</p>}{confirm ? <><h2>Confirm permanent burn</h2><p>Destroy #{id} and its future rent rights. Current payout: {amount(n.reward)} SCRAP + {eth(n.claimable)} USDC.</p><Tolerance value={slip} set={setSlip} /><p>Minimum SCRAP: {bps === null ? 'Invalid tolerance' : amount(minimum)}</p><button className="danger" disabled={!!busy || !n.canBurn || bps === null} onClick={async () => {
                if (await tx('burn', [id, minimum])) location.hash = '/account';
              }}>Permanently burn NFT</button> <button onClick={() => setConfirm(false)}>Cancel</button></> : <button className="danger" disabled={!!busy || !n.canBurn} onClick={() => setConfirm(true)}>Review burn</button>}</section><section className="panel"><h2>Transfer factory</h2><label>Recipient address<input value={recipient} onChange={e => setRecipient(e.target.value)} placeholder="0x…" /></label><p>Unclaimed rent transfers with the NFT. Verify the address before signing.</p><button disabled={!!busy || !isAddress(recipient) || recipient === ZeroAddress} onClick={() => tx('safeTransferFrom(address,address,uint256)', [ctx.account, recipient, id])}>Review transfer in wallet</button></section></>}
 <details><summary>Onchain artwork</summary><p>The serial is unique; building layouts can recur across series. Cosmetic rarity is fixed from the proof, with no reveal.</p><code className="wrap">{n.seed}</code></details>{ctx.config.explorer && <a href={`${ctx.config.explorer}/token/${ctx.config.address}/instance/${id}`} target="_blank" rel="noreferrer">View in explorer ↗</a>}</div></section></>;
}
