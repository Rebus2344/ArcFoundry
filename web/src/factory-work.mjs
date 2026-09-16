import { solidityPackedKeccak256 } from 'ethers';
import { factorySVG } from '../../art/factory-layers.mjs';
export function seedFromWork(hash) {
  return BigInt(solidityPackedKeccak256(['string', 'bytes32'], ['ARCFOUNDRY_ART_V1', hash]));
}
export function rarityFromSeed(seed) {
  const roll = Number(BigInt(seed) % 10000n);
  return roll < 6000 ? 0 : roll < 8500 ? 1 : roll < 9500 ? 2 : roll < 9900 ? 3 : 4;
}
export function previewImage(seed = 154325877n, blueprint, rarity) {
  seed = BigInt(seed);
  const layout = blueprint ?? Number(seed & 16383n);
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(factorySVG(layout, seed, rarity ?? rarityFromSeed(seed)));
}
