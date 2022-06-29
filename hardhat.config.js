/**
 * @type import('hardhat/config').HardhatUserConfig
 */

require('@nomiclabs/hardhat-ethers');
require('hardhat-ethernal');

// Change private keys accordingly - ONLY FOR DEMOSTRATION PURPOSES - PLEASE STORE PRIVATE KEYS IN A SAFE PLACE
// Export your private key as
//       export PRIVATE_KEY=0x.....
const privateKey = process.env.PRIVATE_KEY;
const privateKeyDev =
   '0xf3b60a9dad7897e8704131ea8c6cc95b42a6afa922fa97388da580c7268a7812';

module.exports = {
   defaultNetwork: 'hardhat',

   networks: {
      hardhat: {},
      rollup: {
         url: 'http://127.0.0.1:4011',
         accounts: [privateKeyDev],
         chainId: 13527,
      },
   },
   solidity: {
      compilers: [
         {
            version: '0.5.16',
            settings: {
               optimizer: {
                  enabled: true,
                  runs: 200,
               },
            },
         },
         {
            version: '0.6.6',
            settings: {
               optimizer: {
                  enabled: true,
                  runs: 200,
               },
            },
         },
      ],
   },
   paths: {
      sources: './contracts',
      cache: './cache',
      artifacts: './artifacts',
   },
   mocha: {
      timeout: 20000,
   },
   ethernal: {
      email: '<your email>',
      password: '<your password>',
      disableSync: true, // If set to true, plugin will not sync blocks & txs
      disableTrace: true, // If set to true, plugin won't trace transaction
      uploadAST: true,
   },
};
