import { ZeroAddress } from 'ethers';
export async function readMiningNetwork(ctx) {
  const block = await ctx.provider.getBlock('latest');
  if (!block || ctx.config.chainId !== 31337 && Date.now() / 1000 - block.timestamp > 45) throw Error('Fresh network data is unavailable.');
  const c = ctx.contract,
    o = {
      blockTag: block.number
    };
  const [minted, target, personalTarget, floorBits, burst, personalBurst, lastMint, anchor, prev] = await Promise.all([c.totalMinted(o), c.currentTarget(o), c.targetFor(ctx.account || ZeroAddress, o), c.FLOOR_BITS(o), c.currentBurst(o), ctx.account ? c.burstOfMiner(ctx.account, o) : null, c.lastMintTime(o), c.currentAnchor(o), c.prevWork(o)]);
  return {
    block: block.number,
    timestamp: block.timestamp,
    updated: Date.now(),
    minted: Number(minted),
    target: String(target),
    personalTarget: String(personalTarget),
    floorBits: Number(floorBits),
    burst: Number(burst),
    personalBurst: personalBurst === null ? null : Number(personalBurst),
    lastMint: Number(lastMint),
    anchorBlock: Number(anchor[0]),
    anchor: anchor[1],
    prev
  };
}
export async function readRecentMints(ctx, minted, limit = 8) {
  const count = Math.max(0, Math.min(8, limit, minted)),
    items = [];
  for (let i = 0; i < count; i += 2) {
    items.push(...(await Promise.all(Array.from({
      length: Math.min(2, count - i)
    }, async (_, j) => {
      const id = minted - i - j;
      let owner = null;
      try {
        owner = await ctx.contract.ownerOf(id);
      } catch (e) {
        const data = e.data || e.info?.error?.data;
        let name = e.revert?.name;
        if (!name && typeof data === 'string') {
          try {
            name = ctx.contract.interface.parseError(data)?.name;
          } catch {}
        }
        if (name !== 'ERC721NonexistentToken') throw e;
      }
      const [seed, hash, blueprint, rarity, revealed] = await Promise.all([ctx.contract.seeds(id), ctx.contract.workOf(id), ctx.contract.blueprintOf(id), ctx.contract.rarityOf(id), ctx.contract.revealed(id)]);
      return {
        id,
        seed,
        hash,
        blueprint: Number(blueprint),
        rarity: revealed ? Number(rarity) : -1,
        burned: owner === null
      };
    }))));
  }
  return items;
}
