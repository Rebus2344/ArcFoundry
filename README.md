# ArcFoundry

Public client and Solidity source for ArcFoundry, a proof-of-work NFT project on Arc.

Website: https://arcfoundry.fun

## Development

Use Node.js 20 or later.

```sh
npm ci
npm run build
npm test
npm run dev
```

Optional: `npm run compile` compiles the Solidity sources and refreshes public ABIs. The repository contains no deployment interface, hosting backend, analytics service, credentials, or deployment automation.

## Configuration

The client reads public network and contract addresses from `web/public/deployment.json`. Without a configured collection, only the hardware benchmark is available. A benchmark does not mint NFTs. Minting requires a valid proof, USDC and a wallet transaction. Verify the network and addresses before signing.

## Mechanics

CPU or GPU mining searches for a valid proof in the browser. A paid mint creates a Foundry NFT. Eligible NFTs receive funded USDC rent from later mint epochs; burning destroys the NFT and issues SCRAP according to the current epoch quote. Rarity is cosmetic at launch. Rewards and market prices are not guaranteed. Read the in-app documentation and contract source for precise rules.

Solidity access-control and withdrawal rules remain part of the public protocol source. Removing the administrator interface does not remove contract permissions.

Third-party fonts retain their accompanying license notices. Dependency licenses apply to their respective packages.
