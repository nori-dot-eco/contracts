/* eslint func-names: "off", prefer-arrow-callback: "off" */
const { expectRevert } = require('openzeppelin-test-helpers');
const { TestHelper } = require('@openzeppelin/cli');
const { shouldSupportInterfaces } = require('./helpers/interfaces');
const { Contracts, ZWeb3 } = require('@openzeppelin/upgrades');

require('chai').should();

/** @type {import('web3')} */
const web3 = global.web3;
const CRC_V0 = Contracts.getFromLocal('CRC_V0');

CRC_V0.setProvider(web3.currentProvider);

contract('CRC_V0', accounts => {
  const from = accounts[0];
  describe('contract upgradeability', () => {
    let project, crc;

    before(async () => {
      ZWeb3.initialize(web3.currentProvider);
      project = await TestHelper();
    });

    it('should create a proxy contract', async () => {
      crc = await project.createProxy(CRC_V0);
      crc.constructor.name.should.equals('Contract');
    });

    it('should be initializable', async () => {
      (typeof crc.methods.initialize).should.equals('function');
    });
  });
  describe('contract interfaces', () => {
    let crc;

    before(async () => {
      ZWeb3.initialize(web3.currentProvider);
      const project = await TestHelper();
      crc = await project.createProxy(CRC_V0);
    });
    it('should have a `supportsInterface` function', async () => {
      (typeof crc.methods.supportsInterface).should.equals('function');
    });

    it('should have a `name` function', async () => {
      (typeof crc.methods.name).should.equals('function');
    });

    it('should have a `getApproved` function', async () => {
      (typeof crc.methods.getApproved).should.equals('function');
    });

    it('should have a `totalSupply` function', async () => {
      (typeof crc.methods.totalSupply).should.equals('function');
    });

    it('should have a `tokenOfOwnerByIndex` function', async () => {
      (typeof crc.methods.tokenOfOwnerByIndex).should.equals('function');
    });

    it('should have a `tokenOfOwnerByIndex` function', async () => {
      (typeof crc.methods.tokenOfOwnerByIndex).should.equals('function');
    });

    it('should have a `unpause` function', async () => {
      (typeof crc.methods.unpause).should.equals('function');
    });

    it('should have a `isPauser` function', async () => {
      (typeof crc.methods.isPauser).should.equals('function');
    });

    it('should have a `tokenByIndex` function', async () => {
      (typeof crc.methods.tokenByIndex).should.equals('function');
    });

    it('should have a `mintWithTokenURI` function', async () => {
      (typeof crc.methods.mintWithTokenURI).should.equals('function');
    });

    it('should have a `paused` function', async () => {
      (typeof crc.methods.paused).should.equals('function');
    });

    it('should have a `ownerOf` function', async () => {
      (typeof crc.methods.ownerOf).should.equals('function');
    });

    it('should have a `renouncePauser` function', async () => {
      (typeof crc.methods.renouncePauser).should.equals('function');
    });

    it('should have a `balanceOf` function', async () => {
      (typeof crc.methods.balanceOf).should.equals('function');
    });

    it('should have a `addPauser` function', async () => {
      (typeof crc.methods.addPauser).should.equals('function');
    });

    it('should have a `pause` function', async () => {
      (typeof crc.methods.pause).should.equals('function');
    });

    it('should have a `symbol` function', async () => {
      (typeof crc.methods.symbol).should.equals('function');
    });

    it('should have a `addMinter` function', async () => {
      (typeof crc.methods.addMinter).should.equals('function');
    });

    it('should have a `renounceMinter` function', async () => {
      (typeof crc.methods.renounceMinter).should.equals('function');
    });

    it('should have a `isMinter` function', async () => {
      (typeof crc.methods.isMinter).should.equals('function');
    });

    it('should have a `tokenURI` function', async () => {
      (typeof crc.methods.tokenURI).should.equals('function');
    });

    it('should have a `setApprovalForAll` function', async () => {
      (typeof crc.methods.setApprovalForAll).should.equals('function');
    });

    it('should have a `transferFrom` function', async () => {
      (typeof crc.methods.transferFrom).should.equals('function');
    });

    it('should have a `isApprovedForAll` function', async () => {
      (typeof crc.methods.isApprovedForAll).should.equals('function');
    });

    it('should have a `initialize` function', async () => {
      (typeof crc.methods.initialize).should.equals('function');
    });

    it('should have a `approve` function', async () => {
      (typeof crc.methods.approve).should.equals('function');
    });

    it('should have a `safeTransferFrom` function', async () => {
      (typeof crc.methods.safeTransferFrom).should.equals('function');
    });
  });
  describe('contract behaviors', () => {
    let crc;
    beforeEach(async () => {
      ZWeb3.initialize(web3.currentProvider);
      const project = await TestHelper();
      crc = await project.createProxy(CRC_V0, {
        initMethod: 'initialize',
        initArgs: [],
      });
      crc.setProvider(web3.currentProvider);
    });
    describe('initialize', () => {
      it('should have registered its interface', async () => {
        await shouldSupportInterfaces(crc, [
          'ERC165',
          'ERC721',
          'ERC721Enumerable',
          'ERC721Metadata',
        ]);
      });

      it('should have been given a symbol', async () => {
        (await crc.methods.symbol().call()).should.equal('CRC');
      });

      it('should have been given a name', async () => {
        (await crc.methods.name().call()).should.equal(
          'Carbon Removal Certificate'
        );
      });

      it('should have granted the deployer the minter role', async () => {
        (await crc.methods.isMinter(from).call()).should.equal(true);
      });

      it('should have granted the deployer the pauser role', async () => {
        (await crc.methods.isPauser(from).call()).should.equal(true);
      });

      it('should not be paused', async () => {
        (await crc.methods.paused().call()).should.equal(false);
      });
    });

    describe('minting', () => {
      it('should allow minting from the minter', async () => {
        const gas = await crc.methods
          .mintWithTokenURI(from, 1, 'https://example.com')
          .estimateGas();
        await crc.methods
          .mintWithTokenURI(from, 1, 'https://example.com')
          .send({ from, gas });
      });

      it('should not allow minting from a non-minter', async () => {
        const gas = await crc.methods
          .mintWithTokenURI(from, 1, 'https://example.com')
          .estimateGas();
        await expectRevert(
          crc.methods
            .mintWithTokenURI(from, 1, 'https://example.com')
            .send({ from: accounts[1], gas }),
          'MinterRole: caller does not have the Minter role'
        );
      });

      it('should increment the CRC balance of the `to` address given', async () => {
        const gas = await crc.methods
          .mintWithTokenURI(from, 1, 'https://example.com')
          .estimateGas();
        await crc.methods
          .mintWithTokenURI(from, 1, 'https://example.com')
          .send({ from, gas });
        (await crc.methods.balanceOf(from).call()).should.equal('1');
      });

      it('should assign the token to the `to` address given', async () => {
        const gas = await crc.methods
          .mintWithTokenURI(from, 1, 'https://example.com')
          .estimateGas();
        await crc.methods
          .mintWithTokenURI(from, 1, 'https://example.com')
          .send({ from, gas });
        (await crc.methods.ownerOf(1).call()).should.equal(from);
      });

      it('should not allow transferring the CRC after minting via `transferFrom`', async () => {
        const gas = await crc.methods
          .mintWithTokenURI(from, 1, 'https://example.com')
          .estimateGas();
        await crc.methods
          .mintWithTokenURI(from, 1, 'https://example.com')
          .send({ from, gas });
        await expectRevert(
          crc.methods.transferFrom(from, accounts[1], 1).send({ from, gas }),
          'CRCs are retired after they are minted. You cannot transfer CRCs from an address to another'
        );
      });

      it('should not allow approving the CRC after minting via `approve`', async () => {
        const gas = await crc.methods
          .mintWithTokenURI(from, 1, 'https://example.com')
          .estimateGas();
        await crc.methods
          .mintWithTokenURI(from, 1, 'https://example.com')
          .send({ from, gas });
        await expectRevert(
          crc.methods.approve(accounts[1], 1).send({ from, gas }),
          'CRCs are retired after they are minted. Approving a sending address would be inconsequential'
        );
      });

      it('should not allow approving all CRCs after minting via `setApprovalForAll`', async () => {
        const gas = await crc.methods
          .mintWithTokenURI(from, 1, 'https://example.com')
          .estimateGas();
        await crc.methods
          .mintWithTokenURI(from, 1, 'https://example.com')
          .send({ from, gas });
        await expectRevert(
          crc.methods.setApprovalForAll(accounts[1], true).send({ from, gas }),
          'CRCs are retired after they are minted. Approving all CRCs for a sending address would be inconsequential'
        );
      });

      it('should not allow transferring CRCs after minting via `safeTransferFrom`', async () => {
        const gas = await crc.methods
          .mintWithTokenURI(from, 1, 'https://example.com')
          .estimateGas();
        await crc.methods
          .mintWithTokenURI(from, 1, 'https://example.com')
          .send({ from, gas });
        await expectRevert(
          crc.methods
            .safeTransferFrom(from, accounts[1], 1)
            .send({ from, gas }),
          'CRCs are retired after they are minted. You cannot transfer CRCs from an address to another'
        );
      });

      it('should not allow transferring CRCs after minting via `safeTransferFrom` with a bytes arg', async () => {
        const gas = await crc.methods
          .mintWithTokenURI(from, 1, 'https://example.com')
          .estimateGas();
        await crc.methods
          .mintWithTokenURI(from, 1, 'https://example.com')
          .send({ from, gas });
        await expectRevert(
          crc.methods
            .safeTransferFrom(from, accounts[1], 1, '0x')
            .send({ from, gas }),
          'CRCs are retired after they are minted. You cannot transfer CRCs from an address to another'
        );
      });
    });
  });
});
