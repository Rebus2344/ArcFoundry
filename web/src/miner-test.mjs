import { observeHash } from './mining-display.mjs';
export const TEST_DURATION_MS = 60_000;
export const TEST_WORK = Object.freeze({
  miner: '0x' + '0'.repeat(40),
  prev: '0x' + 'f'.repeat(64),
  anchor: '0x' + 'e'.repeat(64)
});
export const emptyTest = () => ({
  running: false,
  attempts: 0,
  rate: 0,
  best: null,
  history: [],
  elapsed: 0,
  remaining: 60,
  reason: 'idle',
  error: ''
});
export class MinerTest {
  constructor(miner, {
    onUpdate = () => {},
    now = () => performance.now(),
    wallNow = () => Date.now(),
    every = (fn, ms) => setInterval(fn, ms),
    cancel = id => clearInterval(id)
  } = {}) {
    Object.assign(this, {
      miner,
      onUpdate,
      now,
      wallNow,
      every,
      cancel
    });
    this.run = 0;
    this.running = false;
    this.timer = null;
    this.attempts = 0;
  }
  sample(reason = this.reason, error = '') {
    const measured = Math.max(0, this.now() - this.started),
      elapsed = Math.min(TEST_DURATION_MS, measured);
    return {
      running: this.running,
      attempts: this.attempts,
      best: this.best,
      history: this.history,
      rate: this.attempts / Math.max(.001, measured / 1000),
      elapsed: elapsed / 1000,
      remaining: Math.max(0, Math.ceil((TEST_DURATION_MS - elapsed) / 1000)),
      reason,
      error
    };
  }
  stop(reason = 'stopped', error = '') {
    if (!this.running) return;
    this.running = false;
    this.run++;
    this.cancel(this.timer);
    this.timer = null;
    this.miner.stop();
    this.reason = reason;
    this.onUpdate(this.sample(reason, error));
  }
  active(run) {
    if (!this.running || run !== this.run) return false;
    if (this.launchAt > 0 && this.wallNow() >= this.launchAt * 1000) {
      this.stop('launch');
      return false;
    }
    if (this.now() - this.started >= TEST_DURATION_MS) {
      this.stop('complete');
      return false;
    }
    return true;
  }
  start({
    launchAt,
    onError,
    onGPU,
    ...settings
  }) {
    this.stop();
    if (!Number.isFinite(launchAt) || launchAt > 0 && this.wallNow() >= launchAt * 1000) return false;
    this.launchAt = launchAt;
    this.started = this.now();
    this.attempts = 0;
    this.best = null;
    this.history = [];
    this.running = true;
    this.reason = 'running';
    const run = ++this.run;
    this.onUpdate(this.sample());
    const fail = e => {
      if (this.active(run)) {
        this.stop('error', e.message || String(e));
        onError?.(e);
      }
    };
    try {
      this.timer = this.every(() => {
        if (this.active(run)) this.onUpdate(this.sample());
      }, 250);
      this.miner.start({
        ...settings,
        work: TEST_WORK,
        target: 0n,
        onGPU: info => {
          if (this.active(run)) onGPU?.(info);
        },
        onProgress: d => {
          if (this.active(run)) {
            this.attempts += d.attempts;
            observeHash(this, d.best);
          }
        },
        onFound: () => fail(new Error('Unexpected test result. The test has stopped.')),
        onError: fail
      });
    } catch (e) {
      fail(e);
    }
    return this.running;
  }
}
