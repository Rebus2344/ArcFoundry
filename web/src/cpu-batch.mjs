import { inputBytes } from '../../shared/pow.mjs';
export class BatchHasher {
  static async create(bytes) {
    const {
      instance
    } = await WebAssembly.instantiate(bytes);
    return new BatchHasher(instance);
  }
  constructor(instance) {
    this.wasm = instance.exports;
    this.view = new DataView(this.wasm.memory.buffer);
  }
  configure(work, target) {
    this.target = BigInt(target);
    if (this.target < 0n || this.target >= 1n << 256n) throw RangeError('Invalid mining target');
    const bytes = new Uint8Array(this.wasm.memory.buffer);
    bytes.fill(0, 0, 272);
    bytes.set(inputBytes(work, 0));
    bytes[116] = 1;
    bytes[135] = 128;
    for (let i = 0; i < 4; i++) this.view.setBigUint64(160 + i * 8, this.target >> BigInt((3 - i) * 64) & (1n << 64n) - 1n, true);
  }
  scan(start, step, count) {
    start = BigInt(start);
    step = BigInt(step);
    if (start < 0n || step < 1n || !Number.isInteger(count) || count < 1 || count > 1048576 || start + step * BigInt(count - 1) >= 1n << 64n) throw RangeError('Invalid CPU nonce batch');
    const attempts = this.wasm.scan(start, step, count);
    let hash = '0x';
    for (let i = 0; i < 4; i++) hash += this.view.getBigUint64(224 + i * 8, true).toString(16).padStart(16, '0');
    return {
      attempts,
      hash,
      nonce: this.view.getBigUint64(256, true),
      found: BigInt(hash) < this.target
    };
  }
}
