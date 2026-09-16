import wasmURL from './generated/keccak-batch.wasm?url';
import { BatchHasher } from './cpu-batch.mjs';
let generation = 0;
self.onmessage = async ({
  data
}) => {
  const run = ++generation;
  if (data.type !== 'start') return;
  try {
    const response = await fetch(wasmURL);
    if (!response.ok) throw Error('The CPU mining kernel could not be loaded. Reload the page.');
    const hasher = await BatchHasher.create(await response.arrayBuffer());
    if (run !== generation) return;
    hasher.configure(data.work, data.target);
    let nonce = BigInt(data.start),
      best = '0x' + 'f'.repeat(64),
      capacity = 16384;
    const step = BigInt(data.step || 1),
      workload = Math.max(10, Math.min(100, Number(data.load) || 100)),
      channel = new MessageChannel();
    const fail = e => {
      channel.port1.close();
      channel.port2.close();
      if (run === generation) self.postMessage({
        type: 'error',
        message: e.message
      });
    };
    function batch() {
      if (run !== generation) {
        channel.port1.close();
        channel.port2.close();
        return;
      }
      try {
        if (nonce >= 1n << 64n) throw Error('Nonce range exhausted');
        const begin = performance.now(),
          remaining = ((1n << 64n) - 1n - nonce) / step + 1n,
          count = Number(remaining > BigInt(capacity) ? BigInt(capacity) : remaining),
          r = hasher.scan(nonce, step, count);
        if (r.hash < best) best = r.hash;
        if (r.found) {
          self.postMessage({
            type: 'found',
            nonce: String(r.nonce),
            hash: r.hash,
            attempts: r.attempts,
            best
          });
          channel.port1.close();
          channel.port2.close();
          return;
        }
        self.postMessage({
          type: 'progress',
          attempts: r.attempts,
          best
        });
        nonce += step * BigInt(r.attempts);
        const elapsed = performance.now() - begin;
        capacity = Math.max(1024, Math.min(262144, Math.round(capacity * Math.max(.25, Math.min(4, 32 / Math.max(1, elapsed))) / 256) * 256));
        if (workload < 100) setTimeout(batch, elapsed * (100 - workload) / workload);else channel.port2.postMessage(null);
      } catch (e) {
        fail(e);
      }
    }
    channel.port1.onmessage = batch;
    batch();
  } catch (e) {
    if (run === generation) self.postMessage({
      type: 'error',
      message: e.message
    });
  }
};
