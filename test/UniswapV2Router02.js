const { BigNumber, Contract } = require("ethers");
const { expect } = require("chai");
const { solidity } = require("ethereum-waffle");
const chai = require("chai");
const { v2Fixture } = require("./shared/fixtures")

chai.use(solidity)

const overrides = {
  gasLimit: 9999999
}
const MaxUint256 = ethers.constants.MaxUint256
const MINIMUM_LIQUIDITY = BigNumber.from(10).pow(3)

function expandTo18Decimals(n) {
  return BigNumber.from(n).mul(BigNumber.from(10).pow(18))
}

describe('UniswapV2Router02', () => {
  const provider = ethers.provider

  let token0
  let token1
  let router
  beforeEach(async function() {
    [wallet] = await ethers.getSigners();
    const fixture = await v2Fixture()
    token0 = fixture.token0
    token1 = fixture.token1
    router = fixture.router02
  })

  it('quote', async () => {
    expect(await router.quote(BigNumber.from(1), BigNumber.from(100), BigNumber.from(200))).to.eq(BigNumber.from(2))
    expect(await router.quote(BigNumber.from(2), BigNumber.from(200), BigNumber.from(100))).to.eq(BigNumber.from(1))
    await expect(router.quote(BigNumber.from(0), BigNumber.from(100), BigNumber.from(200))).to.be.revertedWith(
      'UniswapV2Library: INSUFFICIENT_AMOUNT'
    )
    await expect(router.quote(BigNumber.from(1), BigNumber.from(0), BigNumber.from(200))).to.be.revertedWith(
      'UniswapV2Library: INSUFFICIENT_LIQUIDITY'
    )
    await expect(router.quote(BigNumber.from(1), BigNumber.from(100), BigNumber.from(0))).to.be.revertedWith(
      'UniswapV2Library: INSUFFICIENT_LIQUIDITY'
    )
  })

  it('getAmountOut', async () => {
    expect(await router.getAmountOut(BigNumber.from(2), BigNumber.from(100), BigNumber.from(100))).to.eq(BigNumber.from(1))
    await expect(router.getAmountOut(BigNumber.from(0), BigNumber.from(100), BigNumber.from(100))).to.be.revertedWith(
      'UniswapV2Library: INSUFFICIENT_INPUT_AMOUNT'
    )
    await expect(router.getAmountOut(BigNumber.from(2), BigNumber.from(0), BigNumber.from(100))).to.be.revertedWith(
      'UniswapV2Library: INSUFFICIENT_LIQUIDITY'
    )
    await expect(router.getAmountOut(BigNumber.from(2), BigNumber.from(100), BigNumber.from(0))).to.be.revertedWith(
      'UniswapV2Library: INSUFFICIENT_LIQUIDITY'
    )
  })

  it('getAmountIn', async () => {
    expect(await router.getAmountIn(BigNumber.from(1), BigNumber.from(100), BigNumber.from(100))).to.eq(BigNumber.from(2))
    await expect(router.getAmountIn(BigNumber.from(0), BigNumber.from(100), BigNumber.from(100))).to.be.revertedWith(
      'UniswapV2Library: INSUFFICIENT_OUTPUT_AMOUNT'
    )
    await expect(router.getAmountIn(BigNumber.from(1), BigNumber.from(0), BigNumber.from(100))).to.be.revertedWith(
      'UniswapV2Library: INSUFFICIENT_LIQUIDITY'
    )
    await expect(router.getAmountIn(BigNumber.from(1), BigNumber.from(100), BigNumber.from(0))).to.be.revertedWith(
      'UniswapV2Library: INSUFFICIENT_LIQUIDITY'
    )
  })

  it('getAmountsOut', async () => {
    await token0.approve(router.address, MaxUint256)
    await token1.approve(router.address, MaxUint256)
    await router.addLiquidity(
      token0.address,
      token1.address,
      BigNumber.from(10000),
      BigNumber.from(10000),
      0,
      0,
      wallet.address,
      MaxUint256,
      overrides
    )

    await expect(router.getAmountsOut(BigNumber.from(2), [token0.address])).to.be.revertedWith(
      'UniswapV2Library: INVALID_PATH'
    )
    const path = [token0.address, token1.address]
    expect(await router.getAmountsOut(BigNumber.from(2), path)).to.deep.eq([BigNumber.from(2), BigNumber.from(1)])
  })

  it('getAmountsIn', async () => {
    await token0.approve(router.address, MaxUint256)
    await token1.approve(router.address, MaxUint256)
    await router.addLiquidity(
      token0.address,
      token1.address,
      BigNumber.from(10000),
      BigNumber.from(10000),
      0,
      0,
      wallet.address,
      MaxUint256,
      overrides
    )

    await expect(router.getAmountsIn(BigNumber.from(1), [token0.address])).to.be.revertedWith(
      'UniswapV2Library: INVALID_PATH'
    )
    const path = [token0.address, token1.address]
    expect(await router.getAmountsIn(BigNumber.from(1), path)).to.deep.eq([BigNumber.from(2), BigNumber.from(1)])
  })
})

describe("fee-on-transfer tokens", () => {
  const provider = ethers.provider

  let wallet
  let DTT
  let WETH
  let router
  let pair
  beforeEach(async () => {
    [wallet] = await ethers.getSigners();
    const fixture = await v2Fixture()
    WETH = fixture.WETH
    router = fixture.router02
    const DeflatingERC20 = await ethers.getContractFactory("DeflatingERC20");
    DTT = await DeflatingERC20.deploy(expandTo18Decimals(10000))

    // make a DTT<>WETH pair
    await fixture.factoryV2.createPair(DTT.address, WETH.address)
    const pairAddress = await fixture.factoryV2.getPair(DTT.address, WETH.address)
    const IUniswapV2Pair = await artifacts.readArtifact("contracts/core/interfaces/IUniswapV2Pair.sol:IUniswapV2Pair");
    pair = new Contract(pairAddress, JSON.stringify(IUniswapV2Pair.abi), provider).connect(wallet)
  })

  afterEach(async function() {
    expect(await provider.getBalance(router.address)).to.eq(0)
  })

  async function addLiquidity(DTTAmount, WETHAmount) {
    await DTT.approve(router.address, MaxUint256)
    await router.addLiquidityETH(DTT.address, DTTAmount, DTTAmount, WETHAmount, wallet.address, MaxUint256, {
      ...overrides,
      value: WETHAmount
    })
  }

  it('removeLiquidityETHSupportingFeeOnTransferTokens', async () => {
    const DTTAmount = expandTo18Decimals(1)
    const ETHAmount = expandTo18Decimals(4)
    await addLiquidity(DTTAmount, ETHAmount)

    const DTTInPair = await DTT.balanceOf(pair.address)
    const WETHInPair = await WETH.balanceOf(pair.address)
    const liquidity = await pair.balanceOf(wallet.address)
    const totalSupply = await pair.totalSupply()
    const NaiveDTTExpected = DTTInPair.mul(liquidity).div(totalSupply)
    const WETHExpected = WETHInPair.mul(liquidity).div(totalSupply)

    await pair.approve(router.address, MaxUint256)
    await router.removeLiquidityETHSupportingFeeOnTransferTokens(
      DTT.address,
      liquidity,
      NaiveDTTExpected,
      WETHExpected,
      wallet.address,
      MaxUint256,
      overrides
    )
  })

  describe('swapExactTokensForTokensSupportingFeeOnTransferTokens', () => {
    const DTTAmount = expandTo18Decimals(5)
      .mul(100)
      .div(99)
    const ETHAmount = expandTo18Decimals(10)
    const amountIn = expandTo18Decimals(1)

    beforeEach(async () => {
      await addLiquidity(DTTAmount, ETHAmount)
    })

    it('DTT -> WETH', async () => {
      await DTT.approve(router.address, MaxUint256)

      await router.swapExactTokensForTokensSupportingFeeOnTransferTokens(
        amountIn,
        0,
        [DTT.address, WETH.address],
        wallet.address,
        MaxUint256,
        overrides
      )
    })

    // WETH -> DTT
    it('WETH -> DTT', async () => {
      await WETH.deposit({ value: amountIn }) // mint WETH
      await WETH.approve(router.address, MaxUint256)

      await router.swapExactTokensForTokensSupportingFeeOnTransferTokens(
        amountIn,
        0,
        [WETH.address, DTT.address],
        wallet.address,
        MaxUint256,
        overrides
      )
    })
  })

  // ETH -> DTT
  it('swapExactETHForTokensSupportingFeeOnTransferTokens', async () => {
    const DTTAmount = expandTo18Decimals(10)
      .mul(100)
      .div(99)
    const ETHAmount = expandTo18Decimals(5)
    const swapAmount = expandTo18Decimals(1)
    await addLiquidity(DTTAmount, ETHAmount)

    await router.swapExactETHForTokensSupportingFeeOnTransferTokens(
      0,
      [WETH.address, DTT.address],
      wallet.address,
      MaxUint256,
      {
        ...overrides,
        value: swapAmount
      }
    )
  })

  // DTT -> ETH
  it('swapExactTokensForETHSupportingFeeOnTransferTokens', async () => {
    const DTTAmount = expandTo18Decimals(5)
      .mul(100)
      .div(99)
    const ETHAmount = expandTo18Decimals(10)
    const swapAmount = expandTo18Decimals(1)

    await addLiquidity(DTTAmount, ETHAmount)
    await DTT.approve(router.address, MaxUint256)

    await router.swapExactTokensForETHSupportingFeeOnTransferTokens(
      swapAmount,
      0,
      [DTT.address, WETH.address],
      wallet.address,
      MaxUint256,
      overrides
    )
  })
})

describe('fee-on-transfer tokens: reloaded', () => {
  const provider = ethers.provider

  let DTT
  let DTT2
  let router
  beforeEach(async function() {
    [wallet] = await ethers.getSigners();
    const fixture = await v2Fixture()

    router = fixture.router02

    const DeflatingERC20 = await ethers.getContractFactory("DeflatingERC20");
    DTT = await DeflatingERC20.deploy(expandTo18Decimals(10000))
    DTT2 = await DeflatingERC20.deploy(expandTo18Decimals(10000))

    // make a DTT<>WETH pair
    await fixture.factoryV2.createPair(DTT.address, DTT2.address)
    const pairAddress = await fixture.factoryV2.getPair(DTT.address, DTT2.address)
  })

  afterEach(async function() {
    expect(await provider.getBalance(router.address)).to.eq(0)
  })

  async function addLiquidity(DTTAmount, DTT2Amount) {
    await DTT.approve(router.address, MaxUint256)
    await DTT2.approve(router.address, MaxUint256)
    await router.addLiquidity(
      DTT.address,
      DTT2.address,
      DTTAmount,
      DTT2Amount,
      DTTAmount,
      DTT2Amount,
      wallet.address,
      MaxUint256,
      overrides
    )
  }

  describe('swapExactTokensForTokensSupportingFeeOnTransferTokens', () => {
    const DTTAmount = expandTo18Decimals(5)
      .mul(100)
      .div(99)
    const DTT2Amount = expandTo18Decimals(5)
    const amountIn = expandTo18Decimals(1)

    beforeEach(async () => {
      await addLiquidity(DTTAmount, DTT2Amount)
    })

    it('DTT -> DTT2', async () => {
      await DTT.approve(router.address, MaxUint256)

      await router.swapExactTokensForTokensSupportingFeeOnTransferTokens(
        amountIn,
        0,
        [DTT.address, DTT2.address],
        wallet.address,
        MaxUint256,
        overrides
      )
    })
  })
})
