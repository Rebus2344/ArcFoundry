import React, { useEffect, useState, useRef } from 'react';
import { Miner } from './miner.js';
import { MiningSettings } from './MiningSettings.jsx';
import { MinerTest, emptyTest } from './miner-test.mjs';
import './miner-test.css';
import { MiningConsole } from './MiningConsole.jsx';
export function PrelaunchMiner({
  launchAt,
  settings,
  testRef,
  setGPU,
  onRate,
  beforeStart,
  connected = false,
  networkName
}) {
  const preparing = useRef(false),
    mounted = useRef(true);
  const [stats, setStats] = useState(emptyTest),
    [test] = useState(() => new MinerTest(new Miner(), {
      onUpdate: setStats
    }));
  useEffect(() => {
    mounted.current = true;
    if (testRef) testRef.current = test;
    const hidden = () => {
        if (document.hidden) test.stop('hidden');
      },
      pagehide = () => test.stop('hidden');
    document.addEventListener('visibilitychange', hidden);
    window.addEventListener('pagehide', pagehide);
    return () => {
      mounted.current = false;
      document.removeEventListener('visibilitychange', hidden);
      window.removeEventListener('pagehide', pagehide);
      test.stop('left');
      if (testRef?.current === test) testRef.current = null;
    };
  }, [test, testRef]);
  useEffect(() => {
    if (launchAt > 0 && Date.now() / 1000 >= launchAt) test.stop('launch');
  }, [launchAt, test]);
  useEffect(() => {
    onRate?.(stats.rate);
  }, [stats.rate, onRate]);
  const ready = settings.mode === 'cpu' || settings.gpu.status === 'ready';
  async function start() {
    if (!ready || document.hidden || settings.disabled || preparing.current) return;
    preparing.current = true;
    try {
      if (beforeStart && (await beforeStart()) !== true) return;
      if (!mounted.current || document.hidden || launchAt > 0 && Date.now() / 1000 >= launchAt) return;
      test.start({
        launchAt,
        mode: settings.mode,
        threads: settings.threads,
        load: settings.load,
        gpuAccess: settings.gpuAccess,
        onGPU: info => setGPU({
          status: 'ready',
          ...info
        }),
        onError: e => {
          if (settings.mode === 'gpu') setGPU({
            status: 'error',
            error: e.message
          });
        }
      });
    } finally {
      preparing.current = false;
    }
  }
  const status = stats.running ? 'Testing' : stats.reason === 'complete' ? 'Complete' : stats.reason === 'error' ? 'Test failed' : stats.reason === 'idle' ? 'Ready' : 'Stopped';
  const help = stats.reason === 'error' ? stats.error : stats.reason === 'complete' ? 'Test complete. Adjust your settings and test again, or return when mining opens.' : stats.reason === 'hidden' ? 'Test stopped because this tab was hidden. Select Test miner to run it again.' : stats.reason === 'wallet' ? 'Test stopped because your wallet connection changed. You can test again without connecting.' : stats.reason === 'launch' ? 'Pre-launch testing has ended. Real mining starts with a fresh network challenge.' : stats.reason === 'stopped' ? 'Test stopped. You can adjust your settings and run it again.' : stats.running ? 'Measuring your speed. You can stop at any time.' : 'Choose CPU or GPU, then start a 60-second speed test.';
  return <MiningConsole test running={stats.running} status={status} stats={stats} timestamp={Date.now() / 1000} footer={<p className={stats.reason === 'error' ? 'test-error' : ''} role="status">{help}</p>}>
  <div className="console-settings"><MiningSettings {...settings} disabled={settings.disabled || stats.running} /></div>
  <div className="console-action"><p className="eyebrow">FREE PRE-LAUNCH TEST</p><h3>Measure your mining hashrate.</h3><p>{connected ? `Your wallet will be checked on ${networkName} before the test. No transaction or payment required.` : "No wallet or payment needed. Test for up to 60 seconds with this tab visible."}</p><div className="miner-actions">{stats.running ? <button onClick={() => test.stop()}>Stop test</button> : <button className="primary" onClick={start} disabled={!ready || settings.disabled}>Test miner</button>}</div><p className="action-note">No NFTs or rewards. When mining opens, start a new search with fresh network work.</p></div>
 </MiningConsole>;
}
