import React from 'react';
import './mining-settings.css';
export function MiningSettings({
  mode,
  setMode,
  threads,
  setThreads,
  maxThreads,
  load,
  setLoad,
  gpu,
  gpuSupported,
  onRetryGPU,
  disabled
}) {
  const gpuDetail = gpu.status === 'ready' ? gpu.detail : gpu.status === 'error' ? gpu.error : 'Reading the adapter your miner will use.';
  return <fieldset className="mining-settings" disabled={disabled}><legend>Mining settings</legend>
  <p className="field-hint">Choose CPU threads or check your GPU below. Lower the workload to keep your device responsive.</p>
  <label className="mining-engine" htmlFor="mining-engine">Mining engine<select id="mining-engine" value={mode} onChange={e => setMode(e.target.value)}><option value="cpu">CPU</option><option value="gpu" disabled={!gpuSupported}>GPU{!gpuSupported ? ' unavailable' : ''}</option></select></label>
  {mode === 'cpu' ? <div className="cpu-thread-control"><div className="mining-setting-label"><label htmlFor="cpu-threads">CPU threads</label><output htmlFor="cpu-threads">{threads} / {maxThreads}</output></div><input id="cpu-threads" type="range" min="1" max={maxThreads} step="1" value={threads} disabled={maxThreads === 1} onChange={e => setThreads(Number(e.target.value))} aria-describedby="cpu-thread-help" aria-valuetext={`${threads} of ${maxThreads} available CPU threads`} /><div className="range-endpoints" aria-hidden="true"><span>1</span><span>{maxThreads}</span></div><p id="cpu-thread-help" className="hardware-help">{maxThreads} logical {maxThreads === 1 ? 'processor' : 'processors'} reported by your browser.</p></div> : <div className="gpu-device-control"><span id="gpu-device-label">Mining GPU</span><div className={`gpu-device ${gpu.status}`} aria-labelledby="gpu-device-label" role="status"><strong>{gpu.status === 'ready' ? gpu.name : gpu.status === 'error' ? 'GPU unavailable' : 'Detecting GPU…'}</strong>{gpuDetail && <p>{gpuDetail}</p>}</div>{gpu.status === 'error' && <button type="button" className="gpu-retry" onClick={onRetryGPU}>Check GPU again</button>}</div>}
  <label className="mining-workload" htmlFor="mining-workload">Device workload · {load}%<input id="mining-workload" type="range" min="10" max="100" step="10" value={load} onChange={e => setLoad(Number(e.target.value))} /></label>
 </fieldset>;
}
