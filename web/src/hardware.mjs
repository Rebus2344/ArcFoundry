export function cpuThreadLimit(reported = globalThis.navigator?.hardwareConcurrency) {
  return Number.isFinite(reported) && reported >= 1 ? Math.floor(reported) : 1;
}
const clean = value => typeof value === 'string' ? value.trim().slice(0, 200) : '';
const GPU_BRANDS = [['NVIDIA', /\bnvidia\b/i], ['AMD', /\b(?:amd|ati|radeon)\b|advanced micro devices/i], ['Intel', /\bintel\b/i], ['Apple', /\bapple\b/i], ['Qualcomm', /\b(?:qualcomm|adreno)\b/i], ['ARM', /\b(?:arm|mali)\b/i], ['Imagination', /\b(?:imagination|powervr)\b/i], ['Samsung', /\bsamsung\b/i]];
const gpuBrand = value => GPU_BRANDS.find(([, pattern]) => pattern.test(clean(value)))?.[0];
export async function describeGPU(adapter) {
  let info = adapter.info;
  if (!info && typeof adapter.requestAdapterInfo === 'function') {
    try {
      info = await adapter.requestAdapterInfo();
    } catch {}
  }
  const brand = gpuBrand(info?.vendor) || gpuBrand(info?.description);
  const software = info?.isFallbackAdapter === true || adapter.isFallbackAdapter === true;
  return {
    name: software ? 'Software renderer' : brand ? `${brand} Graphics` : 'GPU',
    detail: software ? 'Software rendering: this browser did not select a physical GPU.' : '',
    software
  };
}
export class MiningGPU {
  constructor(api = globalThis.navigator?.gpu) {
    this.api = api;
    this.pending = null;
  }
  inspect() {
    if (!this.pending) {
      const pending = (async () => {
        if (!this.api?.requestAdapter) throw new Error('WebGPU is unavailable. Select CPU.');
        const adapter = await this.api.requestAdapter({
          powerPreference: 'high-performance'
        });
        if (!adapter) throw new Error('No WebGPU adapter is available. Select CPU.');
        return {
          adapter,
          info: await describeGPU(adapter)
        };
      })();
      this.pending = pending;
      pending.catch(() => {
        if (this.pending === pending) this.pending = null;
      });
    }
    return this.pending;
  }
  take() {
    const pending = this.inspect();
    this.pending = null;
    return pending;
  }
}
