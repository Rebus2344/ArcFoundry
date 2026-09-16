import { solidityPackedKeccak256 } from 'ethers';
export function blueprintFor(id, key) {
  if (!Number.isInteger(id) || id < 1) throw new RangeError('Blueprint ID out of range');
  const series = Math.floor((id - 1) / 16384);
  if (series) key = solidityPackedKeccak256(['bytes32', 'uint256'], [key, series]);
  id = (id - 1) % 16384 + 1;
  let l = id - 1 >> 7,
    r = id - 1 & 127;
  for (let round = 0; round < 6; round++) {
    const f = Number(BigInt(solidityPackedKeccak256(['bytes32', 'uint8', 'uint8'], [key, round, r])) & 127n);
    [l, r] = [r, l ^ f];
  }
  return l << 7 | r;
}
