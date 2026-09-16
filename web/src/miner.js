import { digest } from '../../shared/pow.mjs';
import { GPUMiner } from './gpu.js';
export class Miner {
  run = 0;
  workers = [];
  gpu = null;
  stop() {
    this.run++;
    this.workers.forEach(w => w.terminate());
    this.workers = [];
    this.gpu?.stop();
    this.gpu = null;
  }
  start({
    work,
    target,
    mode,
    load,
    threads,
    gpuAccess,
    onGPU,
    onProgress,
    onFound,
    onError
  }) {
    this.stop();
    const run = this.run;
    const words = crypto.getRandomValues(new Uint32Array(2));
    const start = BigInt(words[0] & 0xffff) << 32n | BigInt(words[1]);
    const progress = data => {
      if (run === this.run) onProgress(data);
    };
    const found = data => {
      if (run !== this.run) return;
      if (digest(work, BigInt(data.nonce)) !== data.hash || BigInt(data.hash) >= BigInt(target)) {
        this.stop();
        onError(new Error('CPU proof verification failed.'));
        return;
      }
      this.stop();
      onFound({
        ...data,
        work,
        target: String(target)
      });
    };
    const error = e => {
      if (run === this.run) {
        this.stop();
        onError(e);
      }
    };
    if (mode === 'gpu') {
      this.gpu = new GPUMiner(gpuAccess);
      void this.gpu.mine({
        work,
        target,
        start,
        load,
        onProgress: progress,
        onFound: found,
        onError: error,
        onAdapter: info => {
          if (run === this.run) onGPU?.(info);
        }
      });
      return;
    }
    for (let i = 0; i < threads; i++) {
      const worker = new Worker(new URL('./cpu.worker.js', import.meta.url), {
        type: 'module'
      });
      worker.onmessage = ({
        data
      }) => data.type === 'found' ? found(data) : data.type === 'error' ? error(new Error(data.message)) : progress(data);
      worker.onerror = e => error(new Error(e.message));
      worker.postMessage({
        type: 'start',
        work,
        target: String(target),
        start: String(start + BigInt(i)),
        step: threads,
        load
      });
      this.workers.push(worker);
    }
  }
}
