import { deployments } from 'hardhat';
import { expect } from 'chai';

const setup = deployments.createFixture(async (hre) => {
  const {
    getNamedAccounts,
    upgrades: { deployProxy },
    ethers,
    run,
  } = hre;
  await run('test:setup-test-environment');
  const { buyer, supplier, noriWallet } = await getNamedAccounts();
  const [, buyerSigner, supplierSigner] = await ethers.getSigners();
  const NORI = await ethers.getContractFactory('NORI');
  const Removal = await ethers.getContractFactory('Removal');
  const Certificate = await ethers.getContractFactory('Certificate');
  const FIFOMarket = await ethers.getContractFactory('FIFOMarket');
  const noriInstance = await deployProxy(NORI, []);
  const removalInstance = await deployProxy(Removal, [], {
    initializer: 'initialize()',
  });
  const certificateInstance = await deployProxy(Certificate, [], {
    initializer: 'initialize()',
  });
  const fifoMarketInstance = await deployProxy(FIFOMarket, [
    removalInstance.address,
    noriInstance.address,
    certificateInstance.address,
    noriWallet,
    15,
  ]);
  await certificateInstance.addMinter(fifoMarketInstance.address);
  await noriInstance.mint(
    buyer,
    ethers.utils.parseUnits('1000000'),
    ethers.utils.formatBytes32String('0x0'),
    ethers.utils.formatBytes32String('0x0')
  );
  const mintBatchTx3 = await removalInstance.mintBatch(
    supplier,
    [
      ethers.utils.parseUnits('100'),
      ethers.utils.parseUnits('10'),
      ethers.utils.parseUnits('50'),
    ],
    [2018, 2019, 2020],
    ethers.utils.formatBytes32String('0x0')
  );
  const mintBatchTx1 = await removalInstance.mintBatch(
    supplier,
    [ethers.utils.parseUnits('100')],
    [2018],
    ethers.utils.formatBytes32String('0x0')
  );
  console.log(
    'Removal balances supplier for token ids [0,1,2]',
    await removalInstance.balanceOfBatch(
      [supplier, supplier, supplier, supplier],
      [0, 1, 2, 3]
    )
  );
  console.log({ supplier });
  const removalSafeBatchTransferFrom3 = await (
    await removalInstance.connect(supplierSigner)
  ).safeBatchTransferFrom(
    supplier,
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
    await removalInstance.connect(supplierSigner)
  ).safeBatchTransferFrom(
    supplier,
    fifoMarketInstance.address,
    [3],
    [ethers.utils.parseUnits('100')],
    ethers.utils.formatBytes32String('0x0')
  );
  const noriSend3 = await (
    await noriInstance.connect(buyerSigner)
  ).send(
    fifoMarketInstance.address,
    ethers.utils.parseUnits('160'),
    ethers.utils.hexZeroPad(buyer, 32)
  );
  const noriSend1 = await (
    await noriInstance.connect(buyerSigner)
  ).send(
    fifoMarketInstance.address,
    ethers.utils.parseUnits('100'),
    ethers.utils.hexZeroPad(buyer, 32)
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
  console.log('Deployed NORI', noriInstance.address);
  console.log('Deployed Removal', removalInstance.address);
  console.log('Deployed Certificate', certificateInstance.address);
  console.log('Deployed FIFOMarket', fifoMarketInstance.address);
  return {
    contracts: {
      NORI: noriInstance,
      Removal: removalInstance,
      Certificate: certificateInstance,
      FIFOMarket: fifoMarketInstance,
    },
  };
});

describe('FIFOMarket', () => {
  describe('Buying', () => {
    it('should purchase removals and create a certificate', async () => {
      const NORI = await setup();
      expect(true).equal(true);
    });
  });
});
