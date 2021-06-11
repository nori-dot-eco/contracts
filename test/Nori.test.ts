import { NoriV0Instance } from '../types/truffle-contracts';

import { TestHelper } from '@openzeppelin/cli';
import { Contracts, ZWeb3, Contract } from '@openzeppelin/upgrades';
const web3 = (global as any).web3;

require('chai').should();

const Nori_V0 = Contracts.getFromLocal('Nori_V0');

(Nori_V0 as any).setProvider(web3.currentProvider);

type NORIInstance = Omit<Contract, 'methods'> & {
  methods: NoriV0Instance['methods'];
};

contract('Nori_V0', (accounts) => {
  const from = accounts[0];

  describe('contract behaviors', () => {
    let nori: NORIInstance;
    beforeEach(async () => {
      ZWeb3.initialize(web3.currentProvider);
      const project = await TestHelper();
      nori = await project.createProxy(Nori_V0, {
        initMethod: 'initialize',
        initArgs: [],
      });
      (nori as any).setProvider(web3.currentProvider);
    });
    describe('initialize', () => {
      it('should have been given a symbol', async () => {
        ((await nori.methods.symbol()) as any).call().should.equal('NORI');
      });

      it('should have been given a name', async () => {
        ((await nori.methods.name()) as any).call().should.equal('Nori');
      });

      it('should have granted the deployer the minter role', async () => {
        ((await nori.methods.isMinter(from)) as any).call().should.equal(true);
      });

      it('should have granted the deployer the pauser role', async () => {
        ((await nori.methods.isPauser(from)) as any).call().should.equal(true);
      });

      it('should not be paused', async () => {
        ((await nori.methods.paused()) as any).call().should.equal(false);
      });
    });
  });
});
