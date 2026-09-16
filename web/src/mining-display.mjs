import { leadingZeros, MAX_HASH } from '../../shared/pow.mjs';
import { epochOf, epochSize, createdBefore } from '../../shared/protocol.mjs';
export const isHash = value => typeof value === 'string' && /^0x[0-9a-f]{64}$/i.test(value);
export function observeHash(record, hash) {
  if (!isHash(hash)) return;
  hash = hash.toLowerCase();
  if (record.best && hash >= record.best) return;
  record.best = hash;
  record.history = [hash, ...(record.history || [])].slice(0, 8);
}
export const workKey = w => w ? `${w.miner}:${w.prev}:${w.anchor}:${w.target}` : '';
export const difficultyBits = target => target && BigInt(target) > 0n ? 256 - Math.log2(Number(target)) : null;
export const hashBits = hash => isHash(hash) ? leadingZeros(hash) : 0;
export const targetHex = target => target && BigInt(target) > 0n ? '0x' + BigInt(target).toString(16).padStart(64, '0') : null;
export const compactNumber = n => !Number.isFinite(Number(n)) ? '—' : Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1
}).format(Number(n));
export function waitTime(seconds) {
  if (!Number.isFinite(seconds)) return '—';
  if (seconds < 1) return '<1 s';
  if (seconds < 60) return `${Math.round(seconds)} s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)} h`;
  if (seconds < 31536000) return `${(seconds / 86400).toFixed(1)} days`;
  return `${compactNumber(seconds / 31536000)} years`;
}
export const formatChance = p => p >= .9999 ? '>99.99%' : p > 0 && p < .0001 ? '<0.01%' : `${(100 * p).toFixed(2)}%`;
export function nextEpoch(minted = 0, floorBits = null) {
  const epoch = epochOf(BigInt(minted) + 1n),
    size = Number(epochSize(epoch)),
    before = Number(createdBefore(epoch));
  return {
    epoch,
    size,
    completed: minted - before,
    remaining: before + size - minted,
    floor: floorBits === null ? null : Math.min(256, floorBits + epoch)
  };
}
export function difficultyExample(bits) {
  return MAX_HASH >> BigInt(bits);
}
