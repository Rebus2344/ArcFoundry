import { walletNetwork } from './wallet-network.mjs';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Miner } from './miner.js';
import { MiningSettings } from './MiningSettings.jsx';
import { PrelaunchMiner } from './PrelaunchMiner.jsx';
import { MiningGPU, cpuThreadLimit } from './hardware.mjs';
import { MiningConsole } from './MiningConsole.jsx';
import { MiningInsights } from './MiningInsights.jsx';
import { observeHash, workKey } from './mining-display.mjs';
import { priceOf } from '../../shared/protocol.mjs';
import { DiscoveryDialog, DiscoverySoundToggle } from './DiscoveryDialog.jsx';
import { prepareDiscoverySound, playDiscoverySound } from './foundry-sound.mjs';
import { publicConnection, connectWallet, snapshot, readWork, sendChecked, eth, short, readableError } from './chain.js';
import { verify } from '../../shared/pow.mjs';
import { Economy, Stats } from './info-pages.jsx';
import { Docs } from './Docs.jsx';
import { Collection, NFTPage } from './Collection.jsx';
import { TokenPage } from './Token.jsx';
import { Home, Countdown } from './Launch.jsx';
import { SiteHeader, SiteFooter } from './SiteChrome.jsx';
import { WalletDialog } from './WalletDialog.jsx';
import { Rent } from './Rent.jsx';
import { Privacy } from './Privacy.jsx';
import { withoutWallet } from './wallets.mjs';
import { RELEASE, NETWORKS, LAUNCH_AT } from '../../shared/release.mjs';
import './foundry.css';
import './style.css';
import './refresh.css';
import './protocol.css';
import './arcade.css';
import './usability.css';
import './typography.css';
import './mining-dashboard.css';
import './docs.css';
import './arcfoundry.css';
import './collectibles.css';
import './home-gallery.css';
import './compact.css';
import './responsive.css';
const routeNow = () => location.hash.slice(1).replace(/^\//, '');
const key = c => `arcfoundry:v3:proof:${c.config.chainId}:${c.config.address}:${c.account}`;
const providerStopped = e => /provider destroyed|cancelled request/i.test(String(e?.message || e));
export default function App() {
  useEffect(() => {
    document.documentElement.lang = 'en';
    document.documentElement.dir = 'ltr';
  }, []);
  const [maxThreads] = useState(() => cpuThreadLimit()),
    [gpuAccess] = useState(() => new MiningGPU()),
    [gpu, setGPU] = useState({
      status: 'idle'
    }),
    [gpuRetry, setGPURetry] = useState(0);
  const [walletOpen, setWalletOpen] = useState(false),
    [walletError, setWalletError] = useState('');
  const [route, setRoute] = useState(routeNow),
    [config, setConfig] = useState(null),
    [ctx, setCtx] = useState(null),
    [state, setState] = useState(null),
    [work, setWork] = useState(null),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(''),
    [tick, setTick] = useState(Date.now());
  const [testRate, setTestRate] = useState(0);
  const [mining, setMining] = useState(false),
    [result, setResult] = useState(null),
    [mode, setMode] = useState(navigator.gpu ? 'gpu' : 'cpu'),
    [load, setLoad] = useState(50),
    [threads, setThreads] = useState(Math.min(2, maxThreads)),
    [metrics, setMetrics] = useState({
      attempts: 0,
      rate: 0,
      best: null,
      history: [],
      challenge: null
    });
  const ctxRef = useRef(null),
    miner = useRef(new Miner()),
    testRef = useRef(null),
    search = useRef(false),
    activeWork = useRef(null),
    proofRef = useRef(null),
    startRef = useRef(null),
    counter = useRef({
      attempts: 0,
      best: null,
      start: 0
    }),
    settings = useRef({
      mode,
      load,
      threads
    }),
    busyRef = useRef(false);
  settings.current = {
    mode,
    load,
    threads,
    gpuAccess
  };
  proofRef.current = result;
  useEffect(() => {
    if (mode !== 'gpu') return;
    let alive = true;
    setGPU({
      status: 'loading'
    });
    gpuAccess.inspect().then(({
      info
    }) => {
      if (alive) setGPU({
        status: 'ready',
        ...info
      });
    }).catch(e => {
      if (alive) setGPU({
        status: 'error',
        error: readableError(e)
      });
    });
    return () => {
      alive = false;
    };
  }, [mode, gpuAccess, gpuRetry]);
  const stop = useCallback(() => {
    search.current = false;
    activeWork.current = null;
    miner.current.stop();
    setMining(false);
  }, []);
  useEffect(() => {
    const f = () => setRoute(routeNow());
    window.addEventListener('hashchange', f);
    const t = setInterval(() => setTick(Date.now()), 1000);
    return () => {
      window.removeEventListener('hashchange', f);
      clearInterval(t);
      stop();
    };
  }, [stop]);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const c = await fetch('/deployment.json', {
          cache: 'no-store'
        }).then(r => {
          if (r.ok) return r.json();
          if (r.status === 404) return RELEASE;
          throw Error('Configuration could not be loaded.');
        });
        if (c.chainId && c.rpcUrl) NETWORKS[c.chainId] = {
          name: c.networkName || 'Arc Mainnet',
          rpcUrl: c.rpcUrl,
          explorer: c.explorer || '',
          mode: c.mode
        };
        const next = {
          ...RELEASE,
          ...(c?.version === RELEASE.version ? c : {})
        };
        if (alive) setConfig(old => JSON.stringify(old) === JSON.stringify(next) ? old : next);
      } catch (e) {
        if (alive) setError(readableError(e));
      }
    };
    void load();
    const timer = setInterval(load, 60000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);
  useEffect(() => {
    if (!config) return;
    let alive = true,
      connection;
    stop();
    setState(null);
    setWork(null);
    setResult(null);
    publicConnection(config).then(c => {
      connection = c;
      if (alive) {
        ctxRef.current = c;
        setCtx(c);
      }
    }).catch(e => {
      if (alive && !providerStopped(e)) setError(readableError(e));
    });
    return () => {
      alive = false;
      connection?.provider?.destroy();
    };
  }, [config, stop]);
  const refresh = useCallback(async () => {
    const c = ctxRef.current;
    if (!c?.contract) return;
    const s = await snapshot(c);
    if (ctxRef.current === c) setState(s);
  }, []);
  useEffect(() => {
    if (!ctx?.contract) return;
    let alive = true,
      timer;
    async function poll() {
      try {
        await refresh();
      } catch (e) {
        if (alive && ctxRef.current === ctx && !providerStopped(e)) {
          stop();
          setError(readableError(e));
        }
      }
      if (alive) timer = setTimeout(poll, 12000);
    }
    void poll();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [ctx, refresh, stop]);
  const launch = state?.launchAt ?? config?.launchAt ?? LAUNCH_AT,
    prelaunch = !config?.address || !state || tick / 1000 < launch,
    canMine = !!ctx?.account && !!state && state.timestamp >= launch && !prelaunch;
  useEffect(() => {
    if (state && state.timestamp < launch) stop();
  }, [state?.minted, stop]);
  const canSearch = canMine && (mode === 'cpu' || gpu.status === 'ready');
  const run = useCallback(w => {
    if (!search.current) return;
    activeWork.current = w;
    if (workKey(counter.current.challenge) !== workKey(w)) {
      counter.current.best = null;
      counter.current.history = [];
    }
    counter.current.challenge = w;
    setMetrics(c => ({
      ...c,
      best: counter.current.best,
      history: counter.current.history,
      challenge: w
    }));
    const progress = d => {
      counter.current.attempts += d.attempts;
      observeHash(counter.current, d.best || d.hash);
    };
    miner.current.start({
      work: w,
      target: BigInt(w.target),
      ...settings.current,
      onGPU: info => setGPU({
        status: 'ready',
        ...info
      }),
      onProgress: progress,
      onFound: d => {
        progress(d);
        const count = counter.current;
        setMetrics({
          attempts: count.attempts,
          best: count.best,
          history: count.history,
          challenge: count.challenge,
          rate: count.attempts / Math.max(.001, (performance.now() - count.start) / 1000)
        });
        stop();
        const current = ctxRef.current,
          p = {
            ...d,
            work: w,
            account: current.account,
            chainId: current.config.chainId,
            contract: current.config.address
          };
        sessionStorage.setItem(key(current), JSON.stringify(p));
        setResult(p);
        playDiscoverySound();
        setNotice('');
      },
      onError: e => {
        stop();
        setError(readableError(e));
        if (settings.current.mode === 'gpu') setGPU({
          status: 'error',
          error: readableError(e)
        });
      }
    });
  }, [stop]);
  startRef.current = run;
  useEffect(() => {
    if (!ctx?.account || !ctx.contract) return;
    let alive = true,
      timer;
    async function poll() {
      try {
        const w = await readWork(ctx);
        if (!alive || ctxRef.current !== ctx) return;
        setWork(w);
        let p = proofRef.current;
        if (!p) {
          try {
            p = JSON.parse(sessionStorage.getItem(key(ctx)) || 'null');
          } catch {}
        }
        if (p) {
          const valid = p.account === ctx.account && p.contract === ctx.config.address && p.work.prev === w.prev && w.anchorBlock - p.work.anchorBlock < 249 && verify(p.work, p.nonce, w.target);
          if (valid && !proofRef.current) setResult(p);
          if (!valid) {
            setResult(null);
            sessionStorage.removeItem(key(ctx));
            setNotice('Your solution is no longer valid. Start mining again to find a new one.');
          }
        }
        const a = activeWork.current;
        if (search.current && (!a || a.prev !== w.prev || w.anchorBlock - a.anchorBlock >= 180 || a.target !== w.target)) startRef.current(w);
      } catch (e) {
        if (alive && ctxRef.current === ctx && !providerStopped(e)) {
          stop();
          setError(readableError(e));
        }
      }
      if (alive) timer = setTimeout(poll, 2500);
    }
    void poll();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [ctx, stop]);
  useEffect(() => {
    if (!mining) return;
    const timer = setInterval(() => {
      const c = counter.current;
      setMetrics({
        attempts: c.attempts,
        best: c.best,
        history: c.history,
        challenge: c.challenge,
        rate: c.attempts / Math.max(.001, (performance.now() - c.start) / 1000)
      });
    }, 400);
    return () => clearInterval(timer);
  }, [mining]);
  const disconnect = useCallback((message = 'Wallet disconnected. Mining is stopped.') => {
    const c = ctxRef.current;
    stop();
    testRef.current?.stop('wallet');
    if (c?.account) {
      try {
        sessionStorage.removeItem(key(c));
      } catch {}
    }
    proofRef.current = null;
    setResult(null);
    setWork(null);
    setMetrics({
      attempts: 0,
      rate: 0,
      best: null,
      history: [],
      challenge: null
    });
    setState(s => s ? {
      ...s,
      balance: 0n
    } : s);
    if (c) {
      c.walletProvider?.destroy();
      const next = withoutWallet(c);
      ctxRef.current = next;
      setCtx(next);
    }
    setNotice(message);
  }, [stop]);
  useEffect(() => {
    const p = ctx?.eip1193;
    if (!p) return;
    const reset = () => {
      if (ctxRef.current?.eip1193 === p) disconnect('Your wallet account or network changed. Reconnect to continue.');
    };
    const chainChanged = chainId => {
      const current = ctxRef.current;
      if (current?.eip1193 !== p) return;
      stop();
      testRef.current?.stop('wallet');
      proofRef.current = null;
      setResult(null);
      setWork(null);
      try {
        sessionStorage.removeItem(key(current));
      } catch {}
      const next = {
        ...current,
        walletChainId: Number(chainId)
      };
      ctxRef.current = next;
      setCtx(next);
      if (!busyRef.current) setNotice('Wallet network changed. Start mining to check and switch to the project network.');
    };
    for (const e of ['accountsChanged', 'disconnect']) p.on?.(e, reset);
    p.on?.('chainChanged', chainChanged);
    return () => {
      for (const e of ['accountsChanged', 'disconnect']) p.removeListener?.(e, reset);
      p.removeListener?.('chainChanged', chainChanged);
    };
  }, [ctx?.eip1193, disconnect, stop]);
  useEffect(() => {
    if (!document.modelContext?.registerTool) return;
    const controller = new AbortController();
    Promise.resolve(document.modelContext.registerTool({
      name: 'read_arcfoundry_network',
      title: 'ArcFoundry network status',
      description: 'Read official supply and funded rent; no wallet or transaction actions.',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false
      },
      annotations: {
        readOnlyHint: true
      },
      execute: async () => {
        const c = ctxRef.current;
        if (!c?.contract) return {
          status: 'prelaunch',
          chainId: 5042002
        };
        const s = await snapshot(c);
        return {
          chainId: c.config.chainId,
          minted: s.minted,
          burned: s.burned,
          rentFunded: String(s.rentFunded),
          block: s.block
        };
      }
    }, {
      signal: controller.signal
    })).catch(() => {});
    return () => controller.abort();
  }, []);
  async function action(label, fn) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(label);
    setError('');
    try {
      return await fn();
    } catch (e) {
      setError(readableError(e) + (e.transactionHash ? ` Transaction ${e.transactionHash}. Check its status before retrying.` : ''));
    } finally {
      busyRef.current = false;
      setBusy('');
    }
  }
  function connect(local = false) {
    if (busyRef.current) return;
    if (local) return chooseWallet(null, true);
    setWalletError('');
    setWalletOpen(true);
  }
  async function chooseWallet(wallet, local = false) {
    return action('Connecting wallet', async () => {
      setWalletError('');
      disconnect('');
      const source = ctxRef.current;
      try {
        const c = await connectWallet(source, local, wallet);
        if (ctxRef.current !== source) {
          c.walletProvider?.destroy();
          throw new Error('The site configuration changed. Choose your wallet again.');
        }
        ctxRef.current = c;
        setCtx(c);
        setWalletOpen(false);
        setNotice(`${c.walletName} connected to ${c.walletNetwork.networkName}.`);
      } catch (e) {
        if (local) throw e;
        setWalletError(readableError(e));
      }
    });
  }
  async function tx(method, args = [], value = 0n, kind = 'contract') {
    return action('Confirm in your wallet', async () => {
      stop();
      const receipt = await sendChecked(ctxRef.current, method, args, value, kind);
      setNotice(`Transaction confirmed in block ${receipt.blockNumber}.`);
      await refresh();
      return receipt;
    });
  }
  async function prepareMiningWallet() {
    const source = ctxRef.current;
    if (!source?.account) return true;
    if (source.localWallet) return true;
    const next = await connectWallet(source, false, {
      provider: source.eip1193,
      name: source.walletName,
      id: source.walletId
    }, false);
    const current = ctxRef.current;
    if (current?.eip1193 !== source.eip1193 || current?.account !== source.account || current?.config !== source.config) {
      next.walletProvider?.destroy();
      throw new Error('Your wallet or site configuration changed. Start again.');
    }
    source.walletProvider?.destroy();
    ctxRef.current = next;
    setCtx(next);
    return true;
  }
  async function prepareTestNetwork() {
    if (!ctxRef.current?.account) return true;
    return (await action('Checking wallet network', prepareMiningWallet)) === true;
  }
  async function start() {
    if (!canSearch) return;
    prepareDiscoverySound();
    await action('Checking network and reading current work', async () => {
      await prepareMiningWallet();
      const w = await readWork(ctxRef.current);
      setWork(w);
      setResult(null);
      sessionStorage.removeItem(key(ctxRef.current));
      counter.current = {
        attempts: 0,
        best: null,
        start: performance.now()
      };
      setMetrics({
        attempts: 0,
        rate: 0,
        best: null,
        history: [],
        challenge: null
      });
      search.current = true;
      setMining(true);
      setNotice('Mining started on your device. Keep this tab open while it searches.');
      run(w);
    });
  }
  async function mint() {
    if (!result || !canMine) return;
    const receipt = await tx('mine', [BigInt(result.nonce), result.work.anchorBlock], BigInt(result.work.price));
    if (receipt) {
      sessionStorage.removeItem(key(ctxRef.current));
      setResult(null);
      const event = receipt.logs.map(l => {
        try {
          return ctx.contract.interface.parseLog(l);
        } catch {
          return null;
        }
      }).find(l => l?.name === 'Mined');
      if (event) location.hash = `/nft/${event.args.tokenId}`;
    }
  }
  const previousRoute = useRef(route);
  useEffect(() => {
    const titles = {
      '': 'Home',
      mine: 'Mining',
      collection: 'Collection',
      account: 'My factories',
      rent: 'Claim USDC rent',
      token: 'SCRAP',
      hash: 'SCRAP',
      stats: 'Network stats',
      economy: 'Economics',
      genesis: 'Every factory is mined',
      privacy: 'Privacy'
    };
    if (!route.startsWith('docs')) document.title = `${route.startsWith('nft/') ? 'Factory #' + route.slice(4) : titles[route] || 'Page not found'} · ArcFoundry`;
    if (previousRoute.current !== route) {
      window.scrollTo({
        top: 0,
        behavior: 'instant'
      });
      if (!route.startsWith('docs')) document.getElementById('content')?.focus({
        preventScroll: true
      });
    }
    previousRoute.current = route;
  }, [route]);
  const displayWork = metrics.challenge || work,
    target = displayWork ? BigInt(displayWork.target) : null;
  const mainClass = route === 'docs' || route.startsWith('docs/') ? 'app-main layout-docs' : `app-main public-page page-${route.split('/')[0] || 'home'}`;
  const mineHeading = mining ? 'Searching for a valid hash' : result ? 'Valid hash found' : !config?.address ? 'Mainnet preparation' : !state ? 'Connecting to the network' : tick / 1000 < launch ? 'Mining opens soon' : !ctx?.account ? 'Connect to start mining' : 'Ready to mine';
  const mineHelp = !config?.address ? 'Mining will be available after the mainnet contracts are deployed and launch setup is complete.' : !state ? 'Waiting for current network data. Mining stays paused until the connection is ready.' : tick / 1000 < launch ? 'Mining has not started yet. You can prepare your device settings below.' : !ctx?.account ? `Connect your wallet on ${walletNetwork(config || {}).networkName} to start searching.` : 'Starting a search does not send a transaction.';
  return <><a className="skip" href="#content" onClick={e => {
      e.preventDefault();
      document.getElementById("content")?.focus();
    }}>{"Skip to content"}</a><SiteHeader route={route} ctx={ctx} config={config} state={state} busy={busy} connect={connect} disconnect={() => disconnect()} />{walletOpen && <WalletDialog onChoose={chooseWallet} onClose={() => setWalletOpen(false)} busy={!!busy} error={walletError} />}
 <main id="content" tabIndex={-1} className={mainClass}>{error && <div className="message error" role="alert">{error}<button aria-label={"Dismiss error"} onClick={() => setError('')}>{"×"}</button></div>}{busy && <p className="message" role="status">{busy}{"…"}</p>}{notice && <div className="message notice" role="status">{notice}<button aria-label={"Dismiss notification"} onClick={() => setNotice('')}>{"×"}</button></div>}
 {route === '' && <><Home state={state} config={config} /></>}
 {route === 'mine' && <><div className="page-heading"><div><p className="eyebrow">ARC MAINNET / PROOF OF WORK</p><h1>Mining</h1><p>Find a valid proof on your device, then mint your Foundry with USDC.</p></div></div><Countdown launchAt={launch} />{prelaunch ? <PrelaunchMiner beforeStart={prepareTestNetwork} connected={!!ctx?.account} networkName={ctx?.walletNetwork?.networkName || walletNetwork(config || {}).networkName} onRate={setTestRate} launchAt={launch} testRef={testRef} setGPU={setGPU} settings={{
          mode,
          setMode,
          threads,
          setThreads,
          maxThreads,
          load,
          setLoad,
          gpu,
          gpuAccess,
          gpuSupported: !!navigator.gpu,
          onRetryGPU: () => setGPURetry(n => n + 1),
          disabled: !!busy
        }} /> : <><MiningConsole running={mining} status={mining ? 'Searching' : result ? 'Solution found' : metrics.attempts ? 'Paused' : 'Ready'} stats={result ? {
            ...metrics,
            best: result.hash,
            history: metrics.history.length ? metrics.history : [result.hash]
          } : metrics} target={target} timestamp={tick / 1000} solution={!!result} footer={<p>{mining ? 'Your miner refreshes its challenge as the network changes. Best-hash previews reset with each new challenge.' : result ? 'Open the discovery notification to review and confirm your mint.' : metrics.attempts ? 'Search paused. The last challenge is shown above; a new search starts with fresh work.' : 'Searching uses your device. No blockchain fees are charged until you submit a mint.'}</p>}>
 <div className="console-settings"><MiningSettings mode={mode} setMode={setMode} threads={threads} setThreads={setThreads} maxThreads={maxThreads} load={load} setLoad={setLoad} gpu={gpu} gpuSupported={!!navigator.gpu} onRetryGPU={() => setGPURetry(n => n + 1)} disabled={!!busy || mining} /></div>
 <div className="console-action"><h3>{mineHeading}</h3>{!mining && !result && <p>{mineHelp}</p>}<div className="mint-price"><span>{state ? `Next NFT · Epoch ${rulesEpoch(state.minted + 1)}` : 'Starting price · first 8 NFTs'}</span><strong>{eth(state ? state.price : priceOf(1n))} <small>{"USDC + gas"}</small></strong></div>
 <DiscoverySoundToggle /><div className="miner-actions">{!ctx?.account ? <><button className="primary" onClick={() => connect()} disabled={!ctx || !!busy}>{"Connect wallet"}</button>{config?.chainId === 31337 && <button onClick={() => connect(true)}>{"Local test wallet"}</button>}</> : mining ? <button onClick={stop}>{"Pause mining"}</button> : <button className="primary" onClick={start} disabled={!canSearch || !!busy || !!result}>{result ? 'Solution ready' : 'Start mining'}</button>}</div></div>
 </MiningConsole></>}

 </>}
 {route === 'mine' && <MiningInsights ctx={ctx} state={state} rate={mining ? metrics.rate : testRate} />}
 {route === 'rent' && <Rent ctx={ctx} state={state} tx={tx} busy={busy} connect={connect} />}
 {(route === 'collection' || route === 'account') && <Collection ctx={ctx} state={state} account={route === 'account'} tx={tx} busy={busy} connect={connect} />}
 {route.startsWith('nft/') && <NFTPage ctx={ctx} state={state} id={Number(route.split('/')[1])} tx={tx} busy={busy} connect={connect} />}
 {(route === 'token' || route === 'hash') && <TokenPage ctx={ctx} state={state} tx={tx} busy={busy} connect={connect} />}
 {route === 'stats' && <Stats state={state} config={config} />} {route === 'economy' && <Economy state={state} />} {(route === 'docs' || route.startsWith('docs/')) && <Docs config={config} rewardModel={ctx?.rewardModel} slug={route === 'docs' ? 'overview' : route.slice(5)} />}
 {route === 'genesis' && <div className="panel"><h1>{"Every factory is mined"}</h1><p>{"There is no free team NFT allocation. All NFTs enter through the same paid mining process."}</p><a href="#/docs">{"Read the current rules"}</a></div>}
 {route === 'privacy' && <Privacy />}
 {!['', 'mine', 'collection', 'account', 'rent', 'token', 'hash', 'stats', 'economy', 'docs', 'genesis', 'privacy'].includes(route) && !route.startsWith('nft/') && !route.startsWith('docs/') && <section className="panel"><h1>{"Page not found"}</h1><a href="#/">{"Back to home"}</a></section>}
 </main>{result && <DiscoveryDialog key={result.hash} result={result} canMint={canMine} busy={busy} error={error} onMint={mint} onDiscard={() => {
      sessionStorage.removeItem(key(ctx));
      setResult(null);
      setNotice("Solution discarded. You can start a new search.");
    }} />}<SiteFooter config={config} /></>;
}
function rulesEpoch(id) {
  let e = 0;
  while (id > 8 * (2 ** (e + 1) - 1)) e++;
  return e;
}
