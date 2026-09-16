import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { BatchHasher } from '../web/src/cpu-batch.mjs';
import { digest, MAX_HASH } from '../shared/pow.mjs';
import { toBeHex } from 'ethers';
const bytes = fs.readFileSync('web/src/generated/keccak-batch.wasm');
const work = {
  miner: '0x98379f0c1c5c1abb0adb5c3ffe4a3bb3a5a26218',
  prev: '0x' + '0123456789abcdef'.repeat(4),
  anchor: '0x' + 'abcd5678012345ef'.repeat(4)
};
function reference(w, start, step, count, target = 0n) {
  let hash = toBeHex(MAX_HASH, 32),
    nonce = 0n;
  for (let i = 0; i < count; i++) {
    const n = start + BigInt(i) * step,
      h = digest(w, n);
    if (h < hash) {
      hash = h;
      nonce = n;
    }
    if (BigInt(h) < target) return {
      attempts: i + 1,
      hash,
      nonce,
      found: true
    };
  }
  return {
    attempts: count,
    hash,
    nonce,
    found: false
  };
}
test('batched WASM matches independent Keccak across random work, strided nonces and 32/64-bit boundaries', async () => {
  const h = await BatchHasher.create(bytes);
  let random = 7189n;
  for (let i = 0; i < 80; i++) {
    random = random * 6364136223846793005n + 1442695040888963407n & MAX_HASH;
    const w = i < 5 ? work : {
      miner: toBeHex(random & (1n << 160n) - 1n, 20),
      prev: toBeHex(random, 32),
      anchor: toBeHex(random ^ 123456n, 32)
    };
    const start = i === 0 ? 0n : i === 1 ? 0xfffffffen : i === 2 ? (1n << 64n) - 128n : random & (1n << 63n) - 1n,
      step = i === 2 ? 1n : BigInt(i % 17 + 1),
      count = i % 127 + 1;
    h.configure(w, 0n);
    assert.deepEqual(h.scan(start, step, count), reference(w, start, step, count), `case ${i}`);
  }
});
test('mining stops at the FIRST valid nonce and reports exact attempts; equality is not a proof', async () => {
  const h = await BatchHasher.create(bytes);
  for (const target of [MAX_HASH, MAX_HASH >> 3n, BigInt(digest(work, 0n)), 0n]) {
    h.configure(work, target);
    assert.deepEqual(h.scan(0n, 1n, 256), reference(work, 0n, 1n, 256, target));
  }
});
test('batch range validation prevents nonce wrapping and duplicate work at exhaustion', async () => {
  const h = await BatchHasher.create(bytes);
  h.configure(work, 0n);
  assert.deepEqual(h.scan((1n << 64n) - 1n, 16n, 1), reference(work, (1n << 64n) - 1n, 16n, 1));
  for (const args of [[-1n, 1n, 1], [0n, 0n, 1], [0n, 1n, 0], [(1n << 64n) - 1n, 1n, 2]]) assert.throws(() => h.scan(...args), RangeError);
});
