import React, { useState, useEffect } from 'react';
import { parseEther } from 'ethers';
import { amount, eth, readableError } from './chain.js';
export function TokenPage({
  ctx,
  state,
  tx,
  busy,
  connect
}) {
  const [buying, setBuying] = useState(true),
    [input, setInput] = useState('1'),
    [slippage, setSlippage] = useState('0.5'),
    [quote, setQuote] = useState(null),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(false),
    [refresh, setRefresh] = useState(0),
    [now, setNow] = useState(Date.now());
  const open = !!state?.tradingSince && !!state?.poolReady;
  let value = 0n;
  try {
    value = parseEther(input);
  } catch {}
  const slip = Number(slippage),
    validSlip = Number.isFinite(slip) && slip >= 0 && slip <= 50;
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    setQuote(null);
    setError('');
    setLoading(false);
    if (!ctx?.router || !open || value <= 0n) return;
    let alive = true;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const [output, fee, spot, allowance] = await Promise.all([ctx.router.quote.staticCall(buying, value), ctx.hook.currentFee(), ctx.hook.spotSqrtPrice(), ctx.account && !buying ? ctx.token.allowance(ctx.account, ctx.config.router) : 0n]);
        if (alive) setQuote({
          output,
          fee: Number(fee),
          spot,
          allowance,
          at: Date.now(),
          amount: value,
          buying
        });
      } catch (e) {
        if (alive) setError(readableError(e));
      } finally {
        if (alive) setLoading(false);
      }
    }, 450);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [ctx, open, input, buying, refresh]);
  const currentQuote = quote?.amount === value && quote.buying === buying ? quote : null;
  const expired = !currentQuote || now - currentQuote.at >= 15000;
  const ready = !!currentQuote && !expired && validSlip && currentQuote.output > 0n && !loading;
  const minimum = ready ? currentQuote.output * BigInt(10000 - Math.round(slip * 100)) / 10000n : 0n;
  const needApproval = !buying && currentQuote && currentQuote.allowance < value;
  const insufficient = !buying && !!ctx?.account && value > (state?.balance || 0n);
  const tooSmall = !!currentQuote && currentQuote.output === 0n;
  const spot = currentQuote ? Number(currentQuote.spot) ** 2 / 2 ** 192 : 0;
  const theoretical = currentQuote ? Number(eth(value)) * (1 - currentQuote.fee / 10000) * (buying ? spot : 1 / spot) : 0;
  const impact = currentQuote && theoretical > 0 ? Math.max(0, 100 * (1 - Number(eth(currentQuote.output)) / theoretical)) : 0;
  const refreshQuote = () => setRefresh(x => x + 1);
  async function trade() {
    if (!ready || !ctx?.account || Date.now() - currentQuote.at >= 15000) return;
    if (needApproval) {
      if (await tx('approve', [ctx.config.router, value], 0n, 'token')) refreshQuote();
      return;
    }
    let block;
    try {
      if (ctx.localWallet) await ctx.provider.send('evm_mine', []);
      block = await ctx.provider.getBlock('latest');
      if (!block) throw new Error('A recent block is required for this swap.');
    } catch (e) {
      setError(readableError(e));
      return;
    }
    const deadline = block.timestamp + 600;
    const result = buying ? await tx('buy', [minimum, deadline], value, 'router') : await tx('sell', [value, minimum, deadline], 0n, 'router');
    if (result) refreshQuote();
  }
  function primaryAction() {
    if (!currentQuote || Date.now() - currentQuote.at >= 15000 || error) {
      refreshQuote();
      return;
    }
    void trade();
  }
  const minted = state?.minted ?? 0;
  const displayOutput = loading ? 'Getting quote…' : currentQuote ? buying ? amount(currentQuote.output) : eth(currentQuote.output) : '—';
  return <>
  <div className="page-heading"><div><p className="eyebrow">{"03 / TOKEN MARKET"}</p><h1>{"$SCRAP"}</h1><p>{"Get SCRAP by burning an eligible factory, or trade it for USDC once the pool opens."}</p></div><span className="tag">{"ERC-20 · Arc Mainnet"}</span></div>
  <div className="token-grid">
   <section className="panel swap-panel">
    {!open ? <div className="trading-wait">
     <span className="status-pill">{"Trading not open yet"}</span><h2>{"Trading opens at 504 mints"}</h2>
     <p>{"Burned NFTs still count toward this milestone."}</p>
     {state && <div className="pool-progress"><strong>{minted.toLocaleString('en-US')} <small>{"/ 504 mined"}</small></strong><div className="milestone-meter" role="progressbar" aria-label={"NFT mints toward trading"} aria-valuemin={0} aria-valuemax={504} aria-valuenow={Math.min(504, minted)}><span style={{
                width: `${Math.min(100, minted / 504 * 100)}%`
              }} /></div></div>}
     <p className="field-hint">{state ? `${Math.max(0, 504 - minted).toLocaleString('en-US')} more mints to open trading.` : ctx?.config.address ? 'Loading the latest mint count…' : 'Launch setup is in progress. You can prepare your mining settings now.'}</p>
     {minted >= 504 && <><p>Launch is pending. Anyone can retry the mandatory first buyback.</p><button disabled={!ctx?.account || !!busy} onClick={() => tx('retryLaunch', [], 0n, 'hook')}>Retry launch</button></>}
     <a className="button primary" href="#/mine">{state ? 'Open miner' : 'View mining launch'} <span aria-hidden="true">{"→"}</span></a>
     <a className="text-link" href="#/docs/trading">{"Pool rules and trading fees →"}</a>
    </div> : <>
     <h2>{"Trade SCRAP"}</h2><div className="trade-tabs" role="group" aria-label={"Trade direction"}>{[[true, 'Buy SCRAP'], [false, 'Sell SCRAP']].map(([buy, label]) => <button key={label} aria-pressed={buying === buy} disabled={!!busy} onClick={() => {
              if (buy === buying) return;
              setBuying(buy);
              setInput(buy ? '1' : '100');
            }}>{label}</button>)}</div>
     <label htmlFor="trade-amount">{"You pay · "}{buying ? 'USDC' : 'SCRAP'}</label><input id="trade-amount" inputMode="decimal" autoComplete="off" spellCheck={false} value={input} onChange={e => setInput(e.target.value)} disabled={!!busy} aria-describedby="trade-amount-help" aria-invalid={!!input.trim() && value <= 0n} />
     <p className="field-hint" id="trade-amount-help">{input.trim() && value <= 0n ? 'Enter a positive amount using a decimal point, for example 0.001.' : !buying && ctx?.account ? `Available: ${amount(state?.balance)} SCRAP` : 'Enter the amount you want to spend. Network gas is extra.'}</p>
     <div className={`swap-output ${expired && currentQuote ? 'quote-expired' : ''}`}><span>{"Estimated "}{buying ? 'SCRAP' : 'USDC'}{" received"}</span><strong style={{
              '--characters': Math.max(8, displayOutput.length)
            }}>{displayOutput}</strong>{currentQuote && expired && <p>{"This quote has expired. Refresh it before continuing."}</p>}</div>
     {currentQuote && <dl className="quote-details"><div><dt>{"Trading fee"}</dt><dd>{(currentQuote.fee / 100).toFixed(2)}{"%"}</dd></div><div><dt>{"Price impact"}</dt><dd>{impact.toFixed(2)}{"%"}</dd></div><div><dt>{"Minimum received"}</dt><dd>{ready ? `${buying ? amount(minimum) : eth(minimum)} ${buying ? 'SCRAP' : 'USDC'}` : '—'}</dd></div><div><dt>{"Quote valid for"}</dt><dd>{expired ? 'Expired' : `${Math.max(0, 15 - Math.floor(Math.max(0, now - currentQuote.at) / 1000))} seconds`}</dd></div></dl>}
     <label htmlFor="trade-slippage">{"Slippage tolerance"}</label><input id="trade-slippage" type="number" min="0" max="50" step="0.1" disabled={!!busy} value={slippage} onChange={e => setSlippage(e.target.value)} />
     <p className="field-hint">{"The swap will fail if you would receive less than the minimum shown above."}</p>
     {error && <p className="message error" role="alert">{error}</p>}
     {tooSmall && <p className="field-hint">{"The estimated amount received is zero. Increase the amount you pay."}</p>}
     {!ctx?.account ? <button className="primary" disabled={!ctx || !!busy} onClick={() => connect()}>{"Connect wallet to trade"}</button> : <button className="primary" disabled={!!busy || loading || value <= 0n || !validSlip || insufficient || tooSmall} onClick={primaryAction}>{value <= 0n ? 'Enter an amount' : insufficient ? 'Insufficient SCRAP' : loading ? 'Getting quote…' : tooSmall ? 'Amount too small' : error ? 'Try quote again' : expired ? 'Refresh quote' : needApproval ? 'Approve SCRAP to sell' : buying ? 'Buy SCRAP' : 'Sell SCRAP'}</button>}
     {needApproval && <p className="field-hint">{"First approve this SCRAP amount in your wallet. Then confirm the sale in a separate transaction."}</p>}
     <p className="subtle">{"Quotes include the trading fee. With a small pool, even a small trade can move the price significantly."}</p>
    </>}
   </section>
   <section className="token-explainer"><h2>{"How SCRAP works"}</h2>
    <article className="panel"><h3>{"Burn an NFT for SCRAP"}</h3><p>All rarities start at 1,000 SCRAP. Rewards decrease with later mint epochs: 1,000 to 500 in the next epoch, then 500 to 250, and so on.</p><p>{"Your Factory must be at least 10 minutes old, and a newer Factory must have been mined. Burning permanently destroys your NFT and also pays any unclaimed USDC rent. Check the current onchain quote on your NFT page."}</p><a href="#/account">{"View my Factories →"}</a></article>
    <article className="panel"><h3>{"Trading fees and liquidity"}</h3><p>{"The pool starts with 25 USDC and 2,500,000 SCRAP. A full reserve buyback occurs before trading opens at 504 mints. User swaps pay 5% to the owner; project buybacks pay no trading fee. Gas is separate."}</p><a href="#/docs/trading">{"Understand the pool →"}</a></article>
    <article className="panel"><h3>{"Buybacks use funded USDC"}</h3><p>{"Part of mint payments funds SCRAP purchases. Trading fees belong entirely to the owner. Purchased tokens are burned. After the first full purchase, buybacks have per-block spending and price limits. Each mint attempts a buyback."}</p><a href="#/docs/buybacks">{"How buybacks work →"}</a></article>
   </section>
  </div>
  <section className="stats-grid">{[['SCRAP total supply', state ? amount(state.supply) : '—'], ['SCRAP bought and burned', state ? amount(state.burnedTokens) : '—'], ['USDC spent on buybacks', state ? eth(state.spent) : '—'], ['USDC available for buybacks', state ? eth(state.queue) : '—']].map(([label, value]) => <div className="panel" key={label}><span>{label}</span><strong>{value}</strong></div>)}</section>
  {open && <section className="panel"><h2>Funded buyback</h2><p>Anyone can execute an available buyback. The contract applies the spending and price limits; unused USDC stays in the reserve. The caller pays gas and receives no reward.</p>{ctx?.account ? <button disabled={!!busy || !state?.queue} onClick={() => tx('buyback', [], 0n, 'hook')}>Run available buyback</button> : <button onClick={() => connect()}>Connect wallet</button>}</section>}
  <p className="subtle">{"Ordinary transfers unlock with trading and are free. Holding SCRAP does not earn NFT rent. New SCRAP is issued only for NFT burns after the initial pool allocation. Its sale price depends on the market."}</p>
 </>;
}
