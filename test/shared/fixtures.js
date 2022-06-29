const { BigNumber, Contract } = require("ethers");

function expandTo18Decimals(n) {
  return BigNumber.from(n).mul(BigNumber.from(10).pow(18))
}

async function v2Fixture() {
  const [wallet] = await ethers.getSigners();
  const IUniswapV2Pair = await artifacts.readArtifact("contracts/core/interfaces/IUniswapV2Pair.sol:IUniswapV2Pair");
  const UniswapV2Factory = await ethers.getContractFactory("UniswapV2Factory");
  const ERC20 = await ethers.getContractFactory("contracts/core/test/ERC20.sol:ERC20");
  const WETH9 = await ethers.getContractFactory("WETH");
  const UniswapV2Router01 = await ethers.getContractFactory("UniswapV2Router01");
  const UniswapV2Router02 = await ethers.getContractFactory("UniswapV2Router02");
  const RouterEventEmitter = await ethers.getContractFactory("RouterEventEmitter");
  // deploy tokens
  const tokenA = await ERC20.deploy(expandTo18Decimals(10000))
  const tokenB = await ERC20.deploy(expandTo18Decimals(10000))
  const WETH = await WETH9.deploy()
  const WETHPartner = await ERC20.deploy(expandTo18Decimals(10000))

  // deploy V2
  const factoryV2 = await UniswapV2Factory.deploy(wallet.address)

  // deploy routers
  const router02 = await UniswapV2Router02.deploy(factoryV2.address, WETH.address)

  // event emitter for testing
  const routerEventEmitter = await RouterEventEmitter.deploy()

  // initialize V2
  await factoryV2.createPair(tokenA.address, tokenB.address)
  const pairAddress = await factoryV2.getPair(tokenA.address, tokenB.address)
  const pair = new Contract(pairAddress, JSON.stringify(IUniswapV2Pair.abi), ethers.provider).connect(wallet)

  const token0Address = await pair.token0()
  const token0 = tokenA.address === token0Address ? tokenA : tokenB
  const token1 = tokenA.address === token0Address ? tokenB : tokenA

  await factoryV2.createPair(WETH.address, WETHPartner.address)
  const WETHPairAddress = await factoryV2.getPair(WETH.address, WETHPartner.address)
  const WETHPair = new Contract(WETHPairAddress, JSON.stringify(IUniswapV2Pair.abi), ethers.provider).connect(wallet)

  return {
    token0,
    token1,
    WETH,
    WETHPartner,
    factoryV2,
    router02,
    router: router02, // the default router, 01 had a minor bug
    routerEventEmitter,
    pair,
    WETHPair
  }
}

module.exports = {
  v2Fixture
}
