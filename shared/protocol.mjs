export const ECONOMY = Object.freeze({
  epoch0: 8,
  firstPrice: 172951260000000000n,
  priceStep: 50130800000000000n,
  rentStep: 35091560000000000n,
  hookStep: 15039240000000000n,
  burnBase: 1000n * 10n ** 18n,
  burnDelay: 600,
  tradingAt: 504,
  genesisTokens: 2_500_000n * 10n ** 18n,
  tradeFeeBps: 500,
  projectBps: 3000,
  wallFrom: 16376,
  wallDiv: 200
});
export function epochOf(id) {
  let n = BigInt(id);
  if (n < 0n) throw new RangeError('Negative NFT number');
  let k = 0;
  while (n > 8n * ((1n << BigInt(k + 1)) - 1n)) k++;
  return k;
}
export const epochSize = k => 8n << BigInt(k);
export const createdBefore = k => epochSize(k) - 8n;
export const epochStart = k => createdBefore(k) + 1n;
export const priceOf = id => {
  const k = epochOf(id);
  return k === 0 ? ECONOMY.firstPrice : createdBefore(k) * ECONOMY.priceStep;
};
export function burnRewardAt(id, minted) {
  id = BigInt(id);
  minted = BigInt(minted);
  if (id <= 0n || id > minted) return 0n;
  const current = epochOf(minted),
    delta = current - epochOf(id);
  if (delta === 0) return ECONOMY.burnBase;
  if (delta > 70) return 0n;
  const top = ECONOMY.burnBase >> BigInt(delta - 1),
    span = epochSize(current) - 1n,
    progress = minted - epochStart(current);
  return top * (2n * span - progress) / (2n * span);
}
export function splitMint(id, eligible) {
  const epoch = epochOf(id),
    prior = createdBefore(epoch),
    live = BigInt(eligible);
  if (live < 0n || live > prior) throw new RangeError('Invalid eligible population');
  const price = priceOf(id);
  if (!live) return {
    price,
    rent: 0n,
    hook: price,
    project: price * 3000n / 10000n,
    buyback: price - price * 3000n / 10000n
  };
  const dead = prior - live,
    deadToHook = dead * ECONOMY.rentStep * 3000n / 10000n,
    hook = prior * ECONOMY.hookStep + deadToHook;
  return {
    price,
    rent: price - hook,
    hook,
    project: hook * 3000n / 10000n,
    buyback: hook - hook * 3000n / 10000n
  };
}
export function wallMultiplier(id) {
  const x = BigInt(id) - 16376n;
  if (x <= 0n) return 1n;
  return x * x / 200n > 1n ? x * x / 200n : 1n;
}
export function targetAt(id, base, floorBits, idle, burst) {
  const max = (1n << 256n) - 1n,
    bits = BigInt(floorBits) + BigInt(epochOf(id));
  const floor = bits >= 256n ? 1n : max >> bits;
  let t = BigInt(base) < floor ? BigInt(base) : floor;
  if (idle > 0) t = t << BigInt(Math.min(idle, 20)) < floor * 2n ? t << BigInt(Math.min(idle, 20)) : floor * 2n;
  t = t / wallMultiplier(id) >> BigInt(Math.min(burst, 16));
  return t > 0n ? t : 1n;
}
