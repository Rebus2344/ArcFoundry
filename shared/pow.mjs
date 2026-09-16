import { getBytes, keccak256, toBeHex, concat } from 'ethers';
export const MAX_HASH = (1n << 256n) - 1n;
export function inputBytes(work, nonce) {
  return getBytes(concat([work.miner, toBeHex(BigInt(nonce), 32), toBeHex(BigInt(work.prev), 32), work.anchor]));
}
export function digest(work, nonce) {
  return keccak256(inputBytes(work, nonce));
}
export function verify(work, nonce, target) {
  return BigInt(digest(work, nonce)) < BigInt(target);
}
export function leadingZeros(hash) {
  const bytes = getBytes(hash);
  let n = 0;
  for (const b of bytes) {
    if (b === 0) n += 8;else return n + Math.clz32(b) - 24;
  }
  return n;
}
export function probability(target, hashRate, seconds) {
  if (!Number.isFinite(hashRate) || hashRate <= 0 || seconds <= 0) return 0;
  const p = Number(BigInt(target)) / 2 ** 256;
  return -Math.expm1(hashRate * seconds * Math.log1p(-p));
}
export function expectedSeconds(target, hashRate) {
  return hashRate > 0 ? 2 ** 256 / Number(BigInt(target)) / hashRate : Infinity;
}
export function findProof(challenge, target, start = 0n, limit = 10_000_000) {
  for (let i = 0; i < limit; i++) {
    const nonce = start + BigInt(i);
    if (verify(challenge, nonce, target)) return {
      nonce,
      digest: digest(challenge, nonce)
    };
  }
  throw new Error('No proof in bounded search');
}
