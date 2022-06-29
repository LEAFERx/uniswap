const { ethers } = require('hardhat');
const ethernal = require('hardhat-ethernal');
const hre = require("hardhat");

const { BigNumber, Contract } = ethers;
const MaxUint256 = ethers.constants.MaxUint256

function expandTo18Decimals(n) {
    return BigNumber.from(n).mul(BigNumber.from(10).pow(18))
}
const overrides = { gasLimit: 8000000 };

const txns = [];

// Deploy function
async function deploy() {
    const [account] = await ethers.getSigners();
    const deployerAddress = account.address;
    console.log(`Deploying contracts using ${deployerAddress}`);

    // Deploy WETH
    const weth = await ethers.getContractFactory('WETH');
    const wethInstance = await weth.deploy();
    await wethInstance.deployed();

    console.log(`WETH deployed to : ${wethInstance.address}`);

    // Deploy Factory
    const factory = await ethers.getContractFactory('UniswapV2Factory');
    const factoryInstance = await factory.deploy(deployerAddress);
    await factoryInstance.deployed();

    console.log(`Factory deployed to : ${factoryInstance.address}`);

    // Deploy Router passing Factory Address and WETH Address
    const router = await ethers.getContractFactory('UniswapV2Router02');
    const routerInstance = await router.deploy(
        factoryInstance.address,
        wethInstance.address
    );
    await routerInstance.deployed();

    console.log(`Router V02 deployed to :  ${routerInstance.address}`);

    // Deploy Multicall (needed for Interface)
    const multicall = await ethers.getContractFactory('Multicall');
    const multicallInstance = await multicall.deploy();
    await multicallInstance.deployed();

    console.log(`Multicall deployed to : ${multicallInstance.address}`);

    // END OF UNISWAP DEPLOYMENT

    const ERC20 = await ethers.getContractFactory("contracts/core/test/ERC20.sol:ERC20");
    const tokenA = await ERC20.deploy(expandTo18Decimals(10000));
    const tokenB = await ERC20.deploy(expandTo18Decimals(10000));
    const tokenC = await ERC20.deploy(expandTo18Decimals(10000));
    const tokenD = await ERC20.deploy(expandTo18Decimals(10000));
    await Promise.all([
        tokenA.deployed(),
        tokenB.deployed(),
        tokenC.deployed(),
        tokenD.deployed(),
    ]);

    // await Promise.all([
    //     hre.ethernal.push({
    //         name: 'WETH',
    //         address: wethInstance.address,
    //     }),
    //     hre.ethernal.push({
    //         name: 'UniswapV2Factory',
    //         address: factoryInstance.address,
    //     }),
    //     hre.ethernal.push({
    //         name: 'UniswapV2Router02',
    //         address: routerInstance.address,
    //     }),
    //     hre.ethernal.push({
    //         name: 'Multicall',
    //         address: multicallInstance.address,
    //     }),
    //     hre.ethernal.push({
    //         name: 'ERC20',
    //         address: tokenA.address,
    //     }),
    //     hre.ethernal.push({
    //         name: 'ERC20',
    //         address: tokenB.address,
    //     }),
    //     hre.ethernal.push({
    //         name: 'ERC20',
    //         address: tokenC.address,
    //     }),
    //     hre.ethernal.push({
    //         name: 'ERC20',
    //         address: tokenD.address,
    //     }),
    // ]);
    
    const IUniswapV2Pair = await artifacts.readArtifact("contracts/core/interfaces/IUniswapV2Pair.sol:IUniswapV2Pair");
    await factoryInstance.createPair(tokenA.address, tokenB.address);
    await factoryInstance.createPair(tokenA.address, tokenC.address);
    await factoryInstance.createPair(tokenA.address, tokenD.address);
    await factoryInstance.createPair(tokenB.address, tokenC.address);
    await factoryInstance.createPair(tokenB.address, tokenD.address);
    await factoryInstance.createPair(tokenC.address, tokenD.address);
    await tokenA.approve(routerInstance.address, MaxUint256),
    await tokenB.approve(routerInstance.address, MaxUint256),
    await tokenC.approve(routerInstance.address, MaxUint256),
    await tokenD.approve(routerInstance.address, MaxUint256),
    await routerInstance.addLiquidity(
        tokenA.address,
        tokenB.address,
        BigNumber.from(1000000),
        BigNumber.from(1000000),
        0,
        0,
        account.address,
        MaxUint256,
        overrides,
    );
    await routerInstance.addLiquidity(
        tokenA.address,
        tokenC.address,
        BigNumber.from(1000000),
        BigNumber.from(1000000),
        0,
        0,
        account.address,
        MaxUint256,
        overrides,
    );
    await routerInstance.addLiquidity(
        tokenA.address,
        tokenD.address,
        BigNumber.from(1000000),
        BigNumber.from(1000000),
        0,
        0,
        account.address,
        MaxUint256,
        overrides,
    );
    await routerInstance.addLiquidity(
        tokenB.address,
        tokenC.address,
        BigNumber.from(1000000),
        BigNumber.from(1000000),
        0,
        0,
        account.address,
        MaxUint256,
        overrides,
    );
    await routerInstance.addLiquidity(
        tokenB.address,
        tokenD.address,
        BigNumber.from(1000000),
        BigNumber.from(1000000),
        0,
        0,
        account.address,
        MaxUint256,
        overrides,
    );
    await routerInstance.addLiquidity(
        tokenC.address,
        tokenD.address,
        BigNumber.from(1000000),
        BigNumber.from(1000000),
        0,
        0,
        account.address,
        MaxUint256,
        overrides,
    );

    const tokens = [tokenA.address, tokenB.address, tokenC.address, tokenD.address];

    for (let i = 0; i < 100; i++) {
        shuffle(tokens);
        let pathlen = Math.floor(Math.random() * 3) + 2;
        let txn;
        let action = Math.floor(Math.random() * 4);
        if (action === 0) {
            txn = await routerInstance.swapExactTokensForTokens(
                BigNumber.from(Math.floor(Math.random() * 500) + 50),
                BigNumber.from(0),
                tokens.slice(0, pathlen),
                account.address,
                MaxUint256,
                overrides,
            )
        } else if (action === 1) {
            txn = await routerInstance.swapTokensForExactTokens(
                BigNumber.from(0),
                BigNumber.from(Math.floor(Math.random() * 500) + 50),
                tokens.slice(0, pathlen),
                account.address,
                MaxUint256,
                overrides,
            )
        } else if (action === 2) {
            txn = await routerInstance.addLiquidity(
                tokens[0],
                tokens[1],
                BigNumber.from(Math.floor(Math.random() * 500) + 100),
                BigNumber.from(Math.floor(Math.random() * 500) + 100),
                0,
                0,
                account.address,
                MaxUint256,
                overrides,
            )
        } else {
            txn = await routerInstance.removeLiquidity(
                tokens[0],
                tokens[1],
                BigNumber.from(Math.floor(Math.random() * 5) + 1),
                0,
                0,
                account.address,
                MaxUint256,
                overrides,
            )
        }
        txns.push(txn.hash);
    }
    console.log(txns);
}

function shuffle(array) {
    array.sort(() => Math.random() - 0.5);
}

deploy()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
