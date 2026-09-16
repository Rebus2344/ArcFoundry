import React from 'react';

const contracts = [
  ['address', 'ArcFoundry', 'NFT collection: proof-of-work minting, ownership, funded USDC rent and burning.', 'ArcFoundry.sol'],
  ['token', 'SCRAP token', 'ERC-20 token issued for eligible NFT burns and used in the trading pool.', 'FoundryToken.sol'],
  ['hook', 'Liquidity hook', 'Mint allocations, buybacks, trading fees and pool launch rules.', 'FoundryHook.sol'],
  ['router', 'Swap router', 'Executes SCRAP / USDC trades through the pool.', 'FoundryRouter.sol'],
  ['manager', 'PoolManager', 'Underlying pool infrastructure used by the hook and router.', null],
  ['renderer', 'Artwork renderer', 'Generates onchain NFT metadata and factory artwork.', 'FoundryRenderer.sol'],
  ['buildings', 'Building artwork', 'Stores the factory building artwork layers.', 'FactoryBuildings.sol'],
  ['environment', 'Planet artwork', 'Stores planetary environments and surrounding artwork layers.', 'FactoryEnvironment.sol'],
  ['factory', 'Deployment factory', 'Creates project contracts during deployment.', 'FoundryFactory.sol']
];

export function ContractDirectory({config}) {
  const explorer = /^https:\/\/[a-z0-9.-]+\/?$/i.test(config?.explorer || '') ? config.explorer.replace(/\/$/, '') : null;
  return <section aria-label="Deployed smart contracts">
    <p><strong>{config?.networkName || 'Arc'}</strong>{config?.chainId ? ` · Chain ID ${config.chainId}` : ''}. Addresses below come from the same published configuration used by the app.</p>
    <div className="docs-contract-list">{contracts.map(([key, name, description, source]) => {
      const address = /^0x[0-9a-f]{40}$/i.test(config?.[key] || '') ? config[key] : null;
      return <section className="docs-contract-card" key={key}>
        <h2>{name}</h2><p>{description}</p>
        {address ? explorer ? <a className="docs-contract-address" href={`${explorer}/address/${address}`} target="_blank" rel="noopener noreferrer"><code>{address}</code> ↗</a> : <code className="docs-contract-address">{address}</code> : <p>Address not published yet.</p>}
        {source && <a className="docs-contract-source" href={`https://github.com/Rebus2344/ArcFoundry/blob/main/contracts/${source}`} target="_blank" rel="noopener noreferrer">View source on GitHub ↗</a>}
      </section>;
    })}</div>
    <p>Supporting libraries and access-control base contracts are included in the source repository; they do not each have a separate deployed address. Owner and partner wallets are not smart-contract entries in this list.</p>
    <a href="https://github.com/Rebus2344/ArcFoundry/tree/main/contracts" target="_blank" rel="noopener noreferrer">Browse all contract sources ↗</a>
  </section>;
}
