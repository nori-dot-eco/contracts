const { ethers, upgrades } = require('hardhat');
const { singletons } = require('@openzeppelin/test-helpers');

const setupTest = async ({ accounts }) => {
  console.log('BUYER:', accounts[3].address);
  const Nori = await ethers.getContractFactory('NORI');
  const Removal = await ethers.getContractFactory('Removal');
  const Certificate = await ethers.getContractFactory('Certificate');
  const FIFOMarket = await ethers.getContractFactory('FIFOMarket');
  console.log('accounts[0].address.address', accounts[0].address);
  const { deployProxy } = upgrades;
  await singletons.ERC1820Registry(accounts[0].address); // In a test environment an ERC777 token requires deploying an ERC1820 registry
  console.log('DEPLOYED REGISTRY');
  const noriInstance = await deployProxy(Nori, []);
  console.log('Deployed Nori', noriInstance.address);
  const removalInstance = await deployProxy(Removal, [], {
    initializer: 'initialize()',
  });
  console.log('Deployed Removal', removalInstance.address);
  const certificateInstance = await deployProxy(Certificate, [], {
    initializer: 'initialize()',
  });
  console.log('Deployed Certificate', certificateInstance.address, 15);
  const fifoMarketInstance = await deployProxy(FIFOMarket, [
    removalInstance.address,
    noriInstance.address,
    certificateInstance.address,
    accounts[9].address,
    15,
  ]);
  await certificateInstance.addMinter(fifoMarketInstance.address);
  console.log('Deployed FIFOMarket', fifoMarketInstance.address);
  await noriInstance.mint(
    accounts[3].address,
    ethers.utils.parseUnits('1000000'),
    ethers.utils.formatBytes32String('0x0'),
    ethers.utils.formatBytes32String('0x0')
  ).wait;
  console.log(
    'NORI balance accounts[1].address',
    await noriInstance.balanceOf(accounts[1].address)
  );
  const mintBatchTx3 = await removalInstance.mintBatch(
    accounts[2].address,
    [
      ethers.utils.parseUnits('100'),
      ethers.utils.parseUnits('10'),
      ethers.utils.parseUnits('50'),
    ],
    [2018, 2019, 2020],
    ethers.utils.formatBytes32String('0x0')
  );
  const mintBatchTx1 = await removalInstance.mintBatch(
    accounts[2].address,
    [ethers.utils.parseUnits('100')],
    [2018],
    ethers.utils.formatBytes32String('0x0')
  );
  console.log(
    'Removal balances accounts[2].address for token ids [0,1,2]',
    await removalInstance.balanceOfBatch(
      [
        accounts[2].address,
        accounts[2].address,
        accounts[2].address,
        accounts[2].address,
      ],
      [0, 1, 2, 3]
    )
  );
  const removalSafeBatchTransferFrom3 = await (
    await removalInstance.connect(accounts[2])
  ).safeBatchTransferFrom(
    accounts[2].address,
    fifoMarketInstance.address,
    [0, 1, 2],
    [
      ethers.utils.parseUnits('100'),
      ethers.utils.parseUnits('10'),
      ethers.utils.parseUnits('50'),
    ],
    ethers.utils.formatBytes32String('0x0')
  );
  const removalSafeBatchTransferFrom1 = await (
    await removalInstance.connect(accounts[2])
  ).safeBatchTransferFrom(
    accounts[2].address,
    fifoMarketInstance.address,
    [3],
    [ethers.utils.parseUnits('100')],
    ethers.utils.formatBytes32String('0x0')
  );
  const noriSend3 = await (
    await noriInstance.connect(accounts[3])
  ).send(
    fifoMarketInstance.address,
    ethers.utils.parseUnits('160'),
    ethers.utils.hexZeroPad(accounts[3].address, 32)
  );
  const noriSend1 = await (
    await noriInstance.connect(accounts[3])
  ).send(
    fifoMarketInstance.address,
    ethers.utils.parseUnits('100'),
    ethers.utils.hexZeroPad(accounts[3].address, 32)
  );
  console.log(
    'removal.mintBatchTx3 gasUsed',
    (await mintBatchTx3.wait()).gasUsed.toNumber()
  );
  console.log(
    'removal.mintBatchTx1 gasUsed',
    (await mintBatchTx1.wait()).gasUsed.toNumber()
  );
  console.log(
    'removal.safeBatchTransferFrom3 gasUsed',
    (await removalSafeBatchTransferFrom3.wait()).gasUsed.toNumber()
  );
  console.log(
    'removal.safeBatchTransferFrom1 gasUsed',
    (await removalSafeBatchTransferFrom1.wait()).gasUsed.toNumber()
  );
  console.log('noriSend3 gasUsed', (await noriSend3.wait()).gasUsed.toNumber());
  console.log('noriSend1 gasUsed', (await noriSend1.wait()).gasUsed.toNumber());
  // price ranges use 1 gwei - 300 gwei at $2.15 MATIC price
  // Minting 1 removal vintage years using `removal.mintBatch` (gas: 130858):
  // $0.000284 - $0.085228
  // Minting 3 removal vintage years using `removal.mintBatch` (gas: 278961):
  // $0.000602 - $0.180767
  // Listing 1 removal vintage years for sale in FIFOMarket `removal.safeBatchTransferFrom` (gas: 130827):
  // $0.000284 - $0.085365
  // Listing 3 removal vintage years for sale in FIFOMarket `removal.safeBatchTransferFrom` (gas: 271048):
  // $0.000586 - $0.175883
  // buying + minting 1 certificate that crosses 1 removal vintage years for sale in the FIFOMarket `removal.safeBatchTransferFrom (gas: 200120)`:
  // $0.000433 - $0.129858
  // buying + minting 1 certificate that crosses 3 removal vintage years for sale in the FIFOMarket `removal.safeBatchTransferFrom (gas: 120695)`:
  // $0.000261 - $0.078391
  return {
    noriInstance,
    removalInstance,
    certificateInstance,
    fifoMarketInstance,
  };
};

describe('FIFOMarket', () => {
  describe('Buying', () => {
    it('should purchase removals and create a certificate', async () => {
      const accounts = await ethers.getSigners();
      await setupTest({ accounts });
    });
  });
});
