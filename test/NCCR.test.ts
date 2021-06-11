import { NCCRV0Instance } from '../types/truffle-contracts/NCCRV0';

const { expectRevert } = require('@openzeppelin/test-helpers');
import { TestHelper } from '@openzeppelin/cli';
import { shouldSupportInterfaces } from './helpers/interfaces';
import { Contract, Contracts, ZWeb3 } from '@openzeppelin/upgrades';
const web3 = (global as any).web3;
require('chai').should();

const NCCR_V0 = Contracts.getFromLocal('NCCR_V0');

(NCCR_V0 as any).setProvider(web3.currentProvider);

type NCCRInstance = Omit<Contract, 'methods'> & {
  methods: NCCRV0Instance['methods'] & {
    initialize: any;
    safeTransferFrom: any;
  };
};

contract('NCCR_V0', (accounts) => {
  const from = accounts[0];

  describe('contract upgradeability', () => {
    let project: ResolvedReturnType<typeof TestHelper>;
    let nccr: NCCRInstance;

    before(async () => {
      ZWeb3.initialize(web3.currentProvider);
      project = await TestHelper();
    });

    it('should create a proxy contract', async () => {
      nccr = await project.createProxy(NCCR_V0);
      nccr.constructor.name.should.equals('Contract');
    });

    it('should be initializable', async () => {
      (typeof nccr.methods.initialize).should.equals('function');
    });
  });

  describe('contract interfaces', () => {
    let nccr: NCCRInstance;

    before(async () => {
      ZWeb3.initialize(web3.currentProvider);
      const project = await TestHelper();
      nccr = await project.createProxy(NCCR_V0);
    });

    it('should have a `supportsInterface` function', async () => {
      (typeof nccr.methods.supportsInterface).should.equals('function');
    });

    it('should have a `name` function', async () => {
      (typeof nccr.methods.name).should.equals('function');
    });

    it('should have a `getApproved` function', async () => {
      (typeof nccr.methods.getApproved).should.equals('function');
    });

    it('should have a `totalSupply` function', async () => {
      (typeof nccr.methods.totalSupply).should.equals('function');
    });

    it('should have a `tokenOfOwnerByIndex` function', async () => {
      (typeof nccr.methods.tokenOfOwnerByIndex).should.equals('function');
    });

    it('should have a `tokenOfOwnerByIndex` function', async () => {
      (typeof nccr.methods.tokenOfOwnerByIndex).should.equals('function');
    });

    it('should have a `unpause` function', async () => {
      (typeof nccr.methods.unpause).should.equals('function');
    });

    it('should have a `isPauser` function', async () => {
      (typeof nccr.methods.isPauser).should.equals('function');
    });

    it('should have a `tokenByIndex` function', async () => {
      (typeof nccr.methods.tokenByIndex).should.equals('function');
    });

    it('should have a `mintWithTokenURI` function', async () => {
      (typeof nccr.methods.mintWithTokenURI).should.equals('function');
    });

    it('should have a `paused` function', async () => {
      (typeof nccr.methods.paused).should.equals('function');
    });

    it('should have a `ownerOf` function', async () => {
      (typeof nccr.methods.ownerOf).should.equals('function');
    });

    it('should have a `renouncePauser` function', async () => {
      (typeof nccr.methods.renouncePauser).should.equals('function');
    });

    it('should have a `balanceOf` function', async () => {
      (typeof nccr.methods.balanceOf).should.equals('function');
    });

    it('should have a `addPauser` function', async () => {
      (typeof nccr.methods.addPauser).should.equals('function');
    });

    it('should have a `pause` function', async () => {
      (typeof nccr.methods.pause).should.equals('function');
    });

    it('should have a `symbol` function', async () => {
      (typeof nccr.methods.symbol).should.equals('function');
    });

    it('should have a `addMinter` function', async () => {
      (typeof nccr.methods.addMinter).should.equals('function');
    });

    it('should have a `renounceMinter` function', async () => {
      (typeof nccr.methods.renounceMinter).should.equals('function');
    });

    it('should have a `isMinter` function', async () => {
      (typeof nccr.methods.isMinter).should.equals('function');
    });

    it('should have a `tokenURI` function', async () => {
      (typeof nccr.methods.tokenURI).should.equals('function');
    });

    it('should have a `setApprovalForAll` function', async () => {
      (typeof nccr.methods.setApprovalForAll).should.equals('function');
    });

    it('should have a `transferFrom` function', async () => {
      (typeof nccr.methods.transferFrom).should.equals('function');
    });

    it('should have a `isApprovedForAll` function', async () => {
      (typeof nccr.methods.isApprovedForAll).should.equals('function');
    });

    it('should have a `initialize` function', async () => {
      (typeof (nccr.methods as any).initialize).should.equals('function');
    });

    it('should have a `approve` function', async () => {
      (typeof nccr.methods.approve).should.equals('function');
    });

    it('should have a `safeTransferFrom` function', async () => {
      (typeof (nccr.methods as any).safeTransferFrom).should.equals('function');
    });
    describe('non-standard functions', () => {
      it('should have a `tokenData` function', async () => {
        (typeof nccr.methods.tokenData).should.equals('function');
      });

      it('should have a `mintWithTokenURIAndData` function', async () => {
        (typeof nccr.methods.mintWithTokenURIAndData).should.equals('function');
      });
    });
  });

  describe('contract behaviors', () => {
    let nccr: NCCRInstance;

    beforeEach(async () => {
      ZWeb3.initialize(web3.currentProvider);
      const project = await TestHelper();
      nccr = await project.createProxy(NCCR_V0, {
        initMethod: 'initialize',
        initArgs: [],
      });
      (nccr as any).setProvider(web3.currentProvider);
    });

    describe('initialize', () => {
      it('should have registered its interface', async () => {
        await shouldSupportInterfaces(nccr as any, [
          'ERC165',
          'ERC721',
          'ERC721Enumerable',
          'ERC721Metadata',
        ]);
      });

      it('should have been given a symbol', async () => {
        (await nccr.methods.symbol()).should.equal('NCCR');
      });

      it('should have been given a name', async () => {
        (await nccr.methods.name()).should.equal(
          'Nori Certificate of Carbon Removal'
        );
      });

      it('should have granted the deployer the minter role', async () => {
        (await nccr.methods.isMinter(from)).should.equal(true);
      });

      it('should have granted the deployer the pauser role', async () => {
        (await nccr.methods.isPauser(from)).should.equal(true);
      });

      it('should not be paused', async () => {
        (await nccr.methods.paused()).should.equal(false);
      });
    });

    describe('minting', () => {
      describe('mintWithTokenURIAndData', () => {
        let gas: any;

        beforeEach(async () => {
          gas = (
            (await nccr.methods.mintWithTokenURIAndData(
              from,
              1,
              'https://example.com',
              '{"buyer":"Bill O","NRTs":17,"sources":[{"source":0,"NRTs":17,"serial":"20191018-m01-USMD023-s5746173184835584-p4617357183558443-n4080--4096"}]}'
            )) as any
          ).estimateGas();
          await (
            nccr.methods.mintWithTokenURIAndData(
              from,
              1,
              'https://example.com',
              '{"buyer":"Bill O","NRTs":17,"sources":[{"source":0,"NRTs":17,"serial":"20191018-m01-USMD023-s5746173184835584-p4617357183558443-n4080--4096"}]}'
            ) as any
          ).send({ from, gas });
        });

        describe('reverting', () => {
          it('should not allow minting from a non-minter', async () => {
            await expectRevert(
              nccr.methods.mintWithTokenURIAndData(
                from,
                1,
                'https://example.com',
                '{"buyer":"Bill O","NRTs":17,"sources":[{"source":0,"NRTs":17,"serial":"20191018-m01-USMD023-s5746173184835584-p4617357183558443-n4080--4096"}]}'
              ) as any
            ).send({ from: accounts[1], gas }),
              'revert MinterRole: caller does not have the Minter role';
          });
        });

        describe('success', () => {
          it('should allow minting from the minter using mintWithTokenURIAndData', async () => {
            (
              (await nccr.methods.mintWithTokenURIAndData(
                from,
                2,
                'https://example.com',
                '{"buyer":"Bill O","NRTs":17,"sources":[{"source":0,"NRTs":17,"serial":"20191018-m01-USMD023-s5746173184835584-p4617357183558443-n4080--4096"}]}'
              )) as any
            ).send({ from, gas });
          });

          it('should assign the token to the `to` address given', async () => {
            (await nccr.methods.ownerOf(1)).should.equal(from);
          });

          it('should increment the NCCR balance of the `to` address given', async () => {
            (await nccr.methods.balanceOf(from)).should.equal('1');
          });

          it('should assign the token to the `to` address given', async () => {
            (await nccr.methods.ownerOf(1)).should.equal(from);
          });

          it('should assign the token to the `to` address given', async () => {
            (await nccr.methods.ownerOf(1)).should.equal(from);
          });

          it('should assign the token a URI', async () => {
            (await nccr.methods.tokenURI(1)).should.equal(
              'https://example.com'
            );
          });

          it('should assign the token human readable data', async () => {
            (await nccr.methods.tokenData(1)).should.equal(
              '{"buyer":"Bill O","NRTs":17,"sources":[{"source":0,"NRTs":17,"serial":"20191018-m01-USMD023-s5746173184835584-p4617357183558443-n4080--4096"}]}'
            );
          });
        });
      });
    });

    describe('overridden standard methods', () => {
      let gas;

      beforeEach(async () => {
        gas = (
          (await nccr.methods.mintWithTokenURIAndData(
            from,
            1,
            'https://example.com',
            '{"buyer":"Bill O","NRTs":17,"sources":[{"source":0,"NRTs":17,"serial":"20191018-m01-USMD023-s5746173184835584-p4617357183558443-n4080--4096"}]}'
          )) as any
        ).estimateGas();
        (
          (await nccr.methods.mintWithTokenURIAndData(
            from,
            1,
            'https://example.com',
            '{"buyer":"Bill O","NRTs":17,"sources":[{"source":0,"NRTs":17,"serial":"20191018-m01-USMD023-s5746173184835584-p4617357183558443-n4080--4096"}]}'
          )) as any
        ).send({ from, gas });
      });

      describe('transferFrom', () => {
        it('should not allow transferring the NCCR after minting via `transferFrom`', async () => {
          const transferFromGas = (
            (await nccr.methods.transferFrom(from, accounts[1], 1)) as any
          ).estimateGas();
          await expectRevert(
            (nccr.methods.transferFrom(from, accounts[1], 1) as any).send({
              from,
              gas: transferFromGas,
            }),
            'NCCRs are retired after they are minted.'
          );
        });
      });

      describe('approve', () => {
        it('should not allow approving the NCCR after minting via `approve`', async () => {
          const approveGas = (
            (await nccr.methods.approve(accounts[1], 1)) as any
          ).estimateGas();
          await expectRevert(
            (nccr.methods.approve(accounts[1], 1) as any).send({
              from,
              approveGas,
            }),
            'NCCRs are retired after they are minted.'
          );
        });
      });

      describe('setApprovalForAll', () => {
        it('should not allow approving all NCCRs after minting via `setApprovalForAll`', async () => {
          const setApprovalForAllGas = (
            (await nccr.methods.setApprovalForAll(accounts[1], true)) as any
          ).estimateGas();
          await expectRevert(
            (nccr.methods.setApprovalForAll(accounts[1], true) as any).send({
              from,
              gas: setApprovalForAllGas,
            }),
            'NCCRs are retired after they are minted.'
          );
        });
      });

      describe('safeTransferFrom', () => {
        it('should not allow transferring NCCRs after minting via `safeTransferFrom`', async () => {
          const safeTransferFromGas = await nccr.methods
            .safeTransferFrom(from, accounts[1], 1)
            .estimateGas();
          await expectRevert(
            nccr.methods
              .safeTransferFrom(from, accounts[1], 1)
              .send({ from, gas: safeTransferFromGas }),
            'NCCRs are retired after they are minted.'
          );
        });

        it('should not allow transferring NCCRs after minting via `safeTransferFrom` with a bytes arg', async () => {
          const safeTransferFromGas = (
            (await nccr.methods.safeTransferFrom(
              from,
              accounts[1],
              1,
              '0x'
            )) as any
          ).estimateGas();
          await expectRevert(
            (
              nccr.methods.safeTransferFrom(from, accounts[1], 1, '0x') as any
            ).send({ from, gas: safeTransferFromGas }),
            'NCCRs are retired after they are minted.'
          );
        });
      });

      describe('mintWithTokenURI', () => {
        it('should not allow minting using mintWithTokenURI', async () => {
          const mintWithTokenURIGas = (
            (await nccr.methods.mintWithTokenURI(
              from,
              1,
              'https://example.com'
            )) as any
          ).estimateGas();
          await expectRevert(
            (
              nccr.methods.mintWithTokenURI(
                from,
                1,
                'https://example.com'
              ) as any
            ).send({ from, gas: mintWithTokenURIGas }),
            'NCCRs must be minted using a data parameter'
          );
        });
      });
    });
  });
});
