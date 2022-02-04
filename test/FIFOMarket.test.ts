import type {
  Certificate,
  Certificate__factory,
  FIFOMarket,
  FIFOMarket__factory,
  NORI,
  NORI__factory,
  Removal,
  Removal__factory,
} from '../typechain-types';

import { expect, hardhat } from '@/test/helpers';

const setupTest = hardhat.deployments.createFixture(async (hre) => {
  const { getNamedAccounts, upgrades, run, ethers } = hre;
  await run('deploy:erc1820');
  const { noriWallet } = await getNamedAccounts();
  const NORI = await ethers.getContractFactory<NORI__factory>('NORI');
  const Removal = await ethers.getContractFactory<Removal__factory>('Removal');
  const Certificate = await ethers.getContractFactory<Certificate__factory>(
    'Certificate'
  );
  const FIFOMarket = await ethers.getContractFactory<FIFOMarket__factory>(
    'FIFOMarket'
  );
  const noriInstance = await upgrades.deployProxy<NORI>(NORI, []);
  const removalInstance = await upgrades.deployProxy<Removal>(Removal, [], {
    initializer: 'initialize()',
  });
  const certificateInstance = await upgrades.deployProxy<Certificate>(
    Certificate,
    [],
    {
      initializer: 'initialize()',
    }
  );
  const fifoMarketInstance = await upgrades.deployProxy<FIFOMarket>(
    FIFOMarket,
    [
      removalInstance.address,
      noriInstance.address,
      certificateInstance.address,
      noriWallet,
      15,
    ],
    {
      initializer: 'initialize(address,address,address,address,uint256)',
    }
  );
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
      const {
        contracts: { NORI, Removal, Certificate, FIFOMarket },
      } = await setupTest();
      const { supplier, buyer, noriWallet } = await hardhat.getNamedAccounts();

      const buyerInitialNoriBalance = '1000000';
      const supplierInitialNoriBalance = '0';
      const noriInitialNoriBalance = '0';

      const parcelIdentifier = hardhat.ethers.utils.formatBytes32String(
        'someParcelIdentifier'
      );
      const listNow = true;
      const packedData = hardhat.ethers.utils.defaultAbiCoder.encode(
        ['address', 'bytes32', 'bool'],
        [FIFOMarket.address, parcelIdentifier, listNow]
      );
      await Promise.all([
        Removal.mintBatch(
          supplier,
          [hardhat.ethers.utils.parseUnits('100')],
          [2018],
          packedData
        ),
        NORI.mint(
          buyer,
          hardhat.ethers.utils.parseUnits(buyerInitialNoriBalance),
          hardhat.ethers.utils.formatBytes32String('0x0'),
          hardhat.ethers.utils.formatBytes32String('0x0')
        ),
        Certificate.addMinter(FIFOMarket.address),
      ]);
      const accounts = await hardhat.ethers.getSigners();

      await Certificate.connect(accounts[0]);
      await NORI.connect(accounts[6]).send(
        FIFOMarket.address,
        hardhat.ethers.utils.parseUnits('1.15'),
        hardhat.ethers.utils.hexZeroPad(buyer, 32)
      );

      const buyerFinalNoriBalance = await NORI.balanceOf(buyer);
      const supplierFinalNoriBalance = await NORI.balanceOf(supplier);
      const noriFinalNoriBalance = await NORI.balanceOf(noriWallet);

      expect(buyerFinalNoriBalance).to.equal(
        hardhat.ethers.utils
          .parseUnits(buyerInitialNoriBalance)
          .sub(hardhat.ethers.utils.parseUnits('1.15', 18))
          .toString()
      );

      expect(supplierFinalNoriBalance).to.equal(
        hardhat.ethers.utils
          .parseUnits(supplierInitialNoriBalance)
          .add(hardhat.ethers.utils.parseUnits('1', 18))
          .toString()
      );

      expect(noriFinalNoriBalance).to.equal(
        hardhat.ethers.utils
          .parseUnits(noriInitialNoriBalance)
          .add(hardhat.ethers.utils.parseUnits('0.15', 18))
          .toString()
      );

      expect(await Certificate.balanceOf(buyer, 0)).to.equal(
        hardhat.ethers.utils.parseUnits('1', 18)
      );
    });
  });
});
