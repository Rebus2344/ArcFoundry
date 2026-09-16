import shader from './keccak.wgsl?raw';
import { digest, inputBytes } from '../../shared/pow.mjs';
import { MiningGPU } from './hardware.mjs';
const MAX_CAPACITY = 8 * 1024 * 1024,
  RECORD_BYTES = 40;
export class GPUMiner {
  stopped = false;
  constructor(hardware = new MiningGPU()) {
    this.hardware = hardware;
  }
  async init() {
    const selected = await this.hardware.take();
    if (this.stopped) return false;
    this.adapter = selected.adapter;
    this.onAdapter?.(selected.info);
    this.device = await this.adapter.requestDevice();
    if (this.stopped) {
      this.device.destroy();
      return false;
    }
    this.device.lost.then(() => {
      if (!this.stopped) {
        this.stopped = true;
        this.onError?.(new Error('WebGPU device lost. Mining stopped.'));
      }
    });
    const module = this.device.createShaderModule({
      code: shader
    });
    const info = await module.getCompilationInfo();
    if (info.messages.some(m => m.type === 'error')) throw Error(info.messages.map(m => m.message).join('\n'));
    const layout = this.device.createBindGroupLayout({
      entries: [{
        binding: 0,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
          type: 'read-only-storage'
        }
      }, {
        binding: 1,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
          type: 'storage'
        }
      }, {
        binding: 2,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
          type: 'storage'
        }
      }]
    });
    const pipelineLayout = this.device.createPipelineLayout({
      bindGroupLayouts: [layout]
    });
    [this.pipeline, this.reduce] = await Promise.all(['main', 'reduce'].map(entryPoint => this.device.createComputePipelineAsync({
      layout: pipelineLayout,
      compute: {
        module,
        entryPoint
      }
    })));
    if (this.stopped) return false;
    const U = GPUBufferUsage;
    this.params = this.device.createBuffer({
      size: 128,
      usage: U.STORAGE | U.COPY_DST
    });
    this.records = this.device.createBuffer({
      size: MAX_CAPACITY / 512 * RECORD_BYTES,
      usage: U.STORAGE
    });
    this.output = this.device.createBuffer({
      size: RECORD_BYTES,
      usage: U.STORAGE | U.COPY_SRC
    });
    this.read = this.device.createBuffer({
      size: RECORD_BYTES,
      usage: U.MAP_READ | U.COPY_DST
    });
    this.bind = this.device.createBindGroup({
      layout,
      entries: [this.params, this.records, this.output].map((buffer, binding) => ({
        binding,
        resource: {
          buffer
        }
      }))
    });
    this.capacity = 262144;
    const work = {
      miner: '0x98379f0c1c5c1abb0adb5c3ffe4a3bb3a5a26218',
      prev: '0x' + '0123456789abcdef'.repeat(4),
      anchor: '0x' + 'abcd5678012345ef'.repeat(4)
    };
    for (const [start, count] of [[0xfffffffen, 4], [(1n << 64n) - 17n, 17]]) {
      const got = await this.compute(work, start, count);
      let best = '0x' + 'f'.repeat(64),
        offset = 0;
      for (let i = 0; i < count; i++) {
        const h = digest(work, start + BigInt(i));
        if (h < best) {
          best = h;
          offset = i;
        }
      }
      if (got.hash !== best || got.offset !== offset) throw Error('WebGPU Keccak-256 self-test failed');
    }
    return !this.stopped;
  }
  async compute(work, start, count) {
    start = BigInt(start);
    if (!Number.isInteger(count) || count < 1 || count > MAX_CAPACITY || start < 0n || start + BigInt(count) > 1n << 64n) throw RangeError('Invalid GPU nonce batch');
    const p = new Uint32Array(32),
      bytes = inputBytes(work, 0),
      view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    for (let i = 0; i < 29; i++) p[i] = view.getUint32(i * 4, true);
    p[29] = Number(start & 0xffffffffn);
    p[30] = Number(start >> 32n);
    p[31] = count;
    this.device.queue.writeBuffer(this.params, 0, p);
    const encoder = this.device.createCommandEncoder();
    for (const [pipeline, groups] of [[this.pipeline, Math.ceil(count / 512)], [this.reduce, 1]]) {
      const pass = encoder.beginComputePass();
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, this.bind);
      pass.dispatchWorkgroups(groups);
      pass.end();
    }
    encoder.copyBufferToBuffer(this.output, 0, this.read, 0, RECORD_BYTES);
    this.device.queue.submit([encoder.finish()]);
    await this.read.mapAsync(GPUMapMode.READ, 0, RECORD_BYTES);
    try {
      const words = new Uint32Array(this.read.getMappedRange(0, RECORD_BYTES));
      if (words[9] !== 1 || words[8] >= count) throw Error('GPU returned an invalid result');
      let hash = '0x';
      for (let i = 0; i < 8; i++) hash += words[i].toString(16).padStart(8, '0');
      return {
        hash,
        offset: words[8]
      };
    } finally {
      this.read.unmap();
    }
  }
  async mine({
    work,
    target,
    start,
    load,
    onProgress,
    onFound,
    onError,
    onAdapter
  }) {
    this.onError = onError;
    this.onAdapter = onAdapter;
    try {
      if (!(await this.init())) return;
      let nonce = BigInt(start),
        best = '0x' + 'f'.repeat(64);
      const threshold = BigInt(target),
        workload = Math.max(10, Math.min(100, Number(load) || 100));
      while (!this.stopped) {
        const begin = performance.now(),
          remaining = (1n << 64n) - nonce,
          count = Number(remaining > BigInt(this.capacity) ? BigInt(this.capacity) : remaining);
        if (count <= 0) throw Error('Nonce range exhausted');
        const got = await this.compute(work, nonce, count);
        if (this.stopped) break;
        const elapsed = performance.now() - begin,
          candidate = nonce + BigInt(got.offset);
        if (digest(work, candidate) !== got.hash) throw Error('GPU result failed CPU verification');
        if (got.hash < best) best = got.hash;
        if (BigInt(got.hash) < threshold) {
          onFound({
            nonce: String(candidate),
            hash: got.hash,
            attempts: count,
            best
          });
          this.stop();
          return;
        }
        onProgress({
          attempts: count,
          best
        });
        nonce += BigInt(count);
        const scale = Math.max(.25, Math.min(4, 40 / Math.max(1, elapsed)));
        this.capacity = Math.max(8192, Math.min(MAX_CAPACITY, Math.round(this.capacity * scale / 512) * 512));
        if (workload < 100) await new Promise(r => setTimeout(r, Math.max(0, elapsed * (100 - workload) / workload)));
      }
    } catch (e) {
      if (!this.stopped) onError(e);
    } finally {
      this.stop();
    }
  }
  stop() {
    this.stopped = true;
    this.device?.destroy();
  }
}
