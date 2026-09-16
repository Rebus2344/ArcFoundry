import React, { useEffect, useState } from 'react';
import { eth, readableError } from './chain.js';
export function Rent({
  ctx,
  state,
  tx,
  busy,
  connect
}) {
  const [data, setData] = useState(null),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(false),
    [reload, setReload] = useState(0);
  useEffect(() => {
    let alive = true;
    setData(null);
    setError('');
    setLoading(false);
    if (!ctx?.account || !ctx.contract) return;
    setLoading(true);
    (async () => {
      try {
        const blockTag = await ctx.provider.getBlockNumber(),
          o = {
            blockTag
          };
        const count = Number(await ctx.contract.balanceOf(ctx.account, o)),
          items = [];
        for (let i = 0; i < count; i += 8) {
          if (!alive) return;
          items.push(...(await Promise.all(Array.from({
            length: Math.min(8, count - i)
          }, async (_, j) => {
            const id = await ctx.contract.tokenOfOwnerByIndex(ctx.account, i + j, o);
            return {
              id: Number(id),
              rent: await ctx.contract.claimable(id, o)
            };
          }))));
        }
        if (alive) setData({
          ctx,
          items
        });
      } catch (e) {
        if (alive) setError(readableError(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [ctx, reload, state?.rentPaid, state?.minted, state?.burned]);
  const items = data?.ctx === ctx ? data.items : [],
    eligible = items.filter(n => n.rent > 0n),
    batch = eligible.slice(0, 24),
    total = items.reduce((s, n) => s + n.rent, 0n);
  async function claim() {
    if (await tx('claimMany', [batch.map(n => n.id)])) setReload(n => n + 1);
  }
  return <>
  <div className="page-heading"><div><p className="eyebrow">{"NFT HOLDER CLAIMS"}</p><h1>{"Claim USDC rent"}</h1><p>{"Withdraw the USDC already earned by your Factories. Your NFTs stay in your wallet."}</p></div></div>
  <section className="panel"><h2>{"Available without the SCRAP launch"}</h2><p>{"You do not need to wait for 504 mints. Rent is funded by paid mints in later epochs, not by a guaranteed yield. If minting stops, new rent stops accruing; previously accrued rent can still be claimed."}</p></section>
  <section className="panel rent-summary"><div><h2>{"Your available rent"}</h2>{!ctx?.account ? <p>{"Connect the wallet that currently owns your Factories on Arc Testnet."}</p> : loading ? <p role="status">{"Checking your NFTs and available USDC…"}</p> : error ? <p role="alert">{error}</p> : data?.ctx === ctx ? <><strong>{eth(total)}{" USDC"}</strong><p>{items.length}{" NFTs in your wallet · "}{eligible.length}{" with available rent."}</p>{!total && <p>{"No USDC is available to claim. NFTs only start earning from mints in a later epoch."}</p>}</> : <p>{"Waiting for the collection connection…"}</p>}<p className="subtle">{"Claiming requires an onchain transaction and USDC for network gas. No token approval, payment to the project or NFT burn is required."}</p></div><div>{!ctx?.account ? <button className="primary" disabled={!ctx || !!busy} onClick={() => connect()}>{"Connect wallet"}</button> : <><button className="primary" disabled={loading || !!error || !!busy || !batch.length} onClick={claim}>{busy ? 'Transaction in progress…' : eligible.length > 24 ? 'Claim next 24 NFTs' : 'Claim available USDC'}</button><button disabled={loading || !!busy} onClick={() => setReload(n => n + 1)}>{"Refresh balance"}</button></>}</div></section>
  {eligible.length > 24 && <p>{"Claims are split into batches of up to 24 NFTs to keep transactions manageable. Claim again after each confirmation for the remaining NFTs."}</p>}
  <section className="panel"><h2>{"How to claim"}</h2><ol><li>{"Connect the wallet that owns the NFTs."}</li><li>{"Check the available amount and select “Claim available USDC”."}</li><li>{"Review the network fee and confirm in your wallet. USDC is sent directly to that wallet."}</li></ol><p>{"Only the current NFT owner can claim. Unclaimed rent follows the NFT when it is sold or transferred. The project cannot claim it on your behalf."}</p><a className="button" href="#/account">{"View my Factories →"}</a></section>
 </>;
}
