# Deploy Uniswap V2 to local L2 chain

This is a Hardhat setup to deploy the necessary contracts of Uniswap, as well as some testing swap pairs and transactions.

See `scripts/deploy-uniswap.js` for deployment details.

[Ethernal](https://tryethernal.com) is a blockchain explorer for testing.

## Get Started

Install packages:

```
yarn
```

### Build the contracts
```
yarn build
```

### Test the contracts
```
yarn test
```

### Deploy the contracts on local L2 chain

To deploy the contracts in Crab you can run:

```sh
yarn deploy:rollup
```
