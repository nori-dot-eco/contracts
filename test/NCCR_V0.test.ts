import type { Contract } from 'ethers';

import { expect, hardhat, shouldSupportInterfaces } from '@/test/helpers';

const setupTest = hardhat.deployments.createFixture(async (hre) => {
  const { upgrades, ethers } = hre;
  const NccrV0 = await ethers.getContractFactory('NCCR_V0');
  const nccr = await upgrades.deployProxy(NccrV0, [], {
    initializer: 'initialize()',
  });
  const [signer1, signer2] = await ethers.getSigners();
  return { nccr, signer1, signer2, hre };
});

const mint = async ({
  nccr,
  to,
}: {
  nccr: Contract;
  to: string;
}): Promise<void> => {
  await nccr.mintWithTokenURIAndData(
    to,
    1,
    'https://example.com',
    '{"buyer":"Bill O","NRTs":17,"sources":[{"source":0,"NRTs":17}]}'
  );
};

describe('NCCR_V0', () => {
  describe('contract upgradeability', () => {
    it('should create a proxy contract', async () => {
      const { nccr } = await setupTest();
      expect(nccr.constructor.name).to.equals('Contract');
    });
  });

  describe('contract interfaces', () => {
    it('should have a `supportsInterface` function', async () => {
      const { nccr } = await setupTest();
      expect(typeof nccr.supportsInterface).to.equals('function');
    });

    it('should have a `name` function', async () => {
      const { nccr } = await setupTest();
      expect(typeof nccr.name).to.equals('function');
    });

    it('should have a `getApproved` function', async () => {
      const { nccr } = await setupTest();
      expect(typeof nccr.getApproved).to.equals('function');
    });

    it('should have a `totalSupply` function', async () => {
      const { nccr } = await setupTest();
      expect(typeof nccr.totalSupply).to.equals('function');
    });

    it('should have a `tokenOfOwnerByIndex` function', async () => {
      const { nccr } = await setupTest();
      expect(typeof nccr.tokenOfOwnerByIndex).to.equals('function');
    });

    it('should have a `unpause` function', async () => {
      const { nccr } = await setupTest();
      expect(typeof nccr.unpause).to.equals('function');
    });

    it('should have a `isPauser` function', async () => {
      const { nccr } = await setupTest();
      expect(typeof nccr.isPauser).to.equals('function');
    });

    it('should have a `tokenByIndex` function', async () => {
      const { nccr } = await setupTest();
      expect(typeof nccr.tokenByIndex).to.equals('function');
    });

    it('should have a `mintWithTokenURI` function', async () => {
      const { nccr } = await setupTest();
      expect(typeof nccr.mintWithTokenURI).to.equals('function');
    });

    it('should have a `paused` function', async () => {
      const { nccr } = await setupTest();
      expect(typeof nccr.paused).to.equals('function');
    });

    it('should have a `ownerOf` function', async () => {
      const { nccr } = await setupTest();
      expect(typeof nccr.ownerOf).to.equals('function');
    });

    it('should have a `renouncePauser` function', async () => {
      const { nccr } = await setupTest();
      expect(typeof nccr.renouncePauser).to.equals('function');
    });

    it('should have a `balanceOf` function', async () => {
      const { nccr } = await setupTest();
      expect(typeof nccr.balanceOf).to.equals('function');
    });

    it('should have a `addPauser` function', async () => {
      const { nccr } = await setupTest();
      expect(typeof nccr.addPauser).to.equals('function');
    });

    it('should have a `pause` function', async () => {
      const { nccr } = await setupTest();
      expect(typeof nccr.pause).to.equals('function');
    });

    it('should have a `symbol` function', async () => {
      const { nccr } = await setupTest();
      expect(typeof nccr.symbol).to.equals('function');
    });

    it('should have a `addMinter` function', async () => {
      const { nccr } = await setupTest();
      expect(typeof nccr.addMinter).to.equals('function');
    });

    it('should have a `renounceMinter` function', async () => {
      const { nccr } = await setupTest();
      expect(typeof nccr.renounceMinter).to.equals('function');
    });

    it('should have a `isMinter` function', async () => {
      const { nccr } = await setupTest();
      expect(typeof nccr.isMinter).to.equals('function');
    });

    it('should have a `tokenURI` function', async () => {
      const { nccr } = await setupTest();
      expect(typeof nccr.tokenURI).to.equals('function');
    });

    it('should have a `setApprovalForAll` function', async () => {
      const { nccr } = await setupTest();
      expect(typeof nccr.setApprovalForAll).to.equals('function');
    });

    it('should have a `transferFrom` function', async () => {
      const { nccr } = await setupTest();
      expect(typeof nccr.transferFrom).to.equals('function');
    });

    it('should have a `isApprovedForAll` function', async () => {
      const { nccr } = await setupTest();
      expect(typeof nccr.isApprovedForAll).to.equals('function');
    });

    it('should have a `approve` function', async () => {
      const { nccr } = await setupTest();
      expect(typeof nccr.approve).to.equals('function');
    });

    it('should have a `safeTransferFrom` function', async () => {
      const { nccr } = await setupTest();
      expect(
        typeof nccr['safeTransferFrom(address,address,uint256,bytes)']
      ).to.equals('function');
    });
    describe('non-standard functions', () => {
      it('should have a `tokenData` function', async () => {
        const { nccr } = await setupTest();
        expect(typeof nccr.tokenData).to.equals('function');
      });

      it('should have a `mintWithTokenURIAndData` function', async () => {
        const { nccr } = await setupTest();
        expect(typeof nccr.mintWithTokenURIAndData).to.equals('function');
      });
    });
  });

  describe('contract behaviors', () => {
    describe('initialize', () => {
      it('should have registered its interface', async () => {
        const { nccr } = await setupTest();
        await shouldSupportInterfaces(nccr, [
          'ERC165',
          'ERC721',
          'ERC721Enumerable',
          'ERC721Metadata',
        ]);
      });

      it('should have been given a symbol', async () => {
        const { nccr } = await setupTest();
        expect(await nccr.symbol()).to.equal('NCCR');
      });

      it('should have been given a name', async () => {
        const { nccr } = await setupTest();
        expect(await nccr.name()).to.equal(
          'Nori Certificate of Carbon Removal'
        );
      });

      it('should have granted the deployer the minter role', async () => {
        const { nccr, signer1 } = await setupTest();
        expect(await nccr.isMinter(signer1.address)).to.equal(true);
      });

      it('should have granted the deployer the pauser role', async () => {
        const { nccr, signer1 } = await setupTest();
        expect(await nccr.isPauser(signer1.address)).to.equal(true);
      });

      it('should not be paused', async () => {
        const { nccr } = await setupTest();
        expect(await nccr.paused()).to.equal(false);
      });
    });

    describe('minting', () => {
      describe('mintWithTokenURIAndData', () => {
        describe('reverting', () => {
          it('should not allow minting from a non-minter', async () => {
            const { nccr, signer1, signer2 } = await setupTest({
              shouldMint: true,
            });
            const nccrAsSigner2 = await nccr.connect(signer2);
            await expect(
              nccrAsSigner2.mintWithTokenURIAndData(
                signer1.address,
                1,
                'https://example.com',
                '{"buyer":"Bill O","NRTs":17,"sources":[{"source":0,"NRTs":17}]}'
              )
            ).to.be.revertedWith(
              'MinterRole: caller does not have the Minter role'
            );
          });
        });

        describe('success', () => {
          it('should allow minting from the minter using mintWithTokenURIAndData', async () => {
            const { hre, nccr, signer1 } = await setupTest();
            await mint({
              to: (await hre.ethers.getSigners())[0].address,
              nccr,
            });
            await nccr.mintWithTokenURIAndData(
              signer1.address,
              2,
              'https://example.com',
              '{"buyer":"Bill O","NRTs":17,"sources":[{"source":0,"NRTs":17}]}'
            );
            expect(await nccr.ownerOf(2)).to.equal(signer1.address);
          });

          it('should increment the NCCR balance of the `to` address given', async () => {
            const { hre, nccr, signer1 } = await setupTest();
            await mint({
              to: (await hre.ethers.getSigners())[0].address,
              nccr,
            });
            expect(await nccr.balanceOf(signer1.address)).to.equal('1');
          });

          it('should assign the token to the `to` address given', async () => {
            const { hre, nccr, signer1 } = await setupTest();
            await mint({
              to: (await hre.ethers.getSigners())[0].address,
              nccr,
            });
            expect(await nccr.ownerOf(1)).to.equal(signer1.address);
          });

          it('should assign the token a URI', async () => {
            const { hre, nccr } = await setupTest();
            await mint({
              to: (await hre.ethers.getSigners())[0].address,
              nccr,
            });
            expect(await nccr.tokenURI(1)).to.equal('https://example.com');
          });

          it('should assign the token human readable data', async () => {
            const { hre, nccr } = await setupTest();
            await mint({
              to: (await hre.ethers.getSigners())[0].address,
              nccr,
            });
            expect(await nccr.tokenData(1)).to.equal(
              '{"buyer":"Bill O","NRTs":17,"sources":[{"source":0,"NRTs":17}]}'
            );
          });
        });
      });
    });

    describe('overridden standard methods', () => {
      describe('transferFrom', () => {
        it('should not allow transferring the NCCR after minting via `transferFrom`', async () => {
          const { nccr, signer2, signer1 } = await setupTest({
            shouldMint: true,
          });
          const nccrAsSigner2 = await nccr.connect(signer2);
          await expect(
            nccrAsSigner2['safeTransferFrom(address,address,uint256)'](
              signer1.address,
              signer2.address,
              1
            )
          ).to.be.revertedWith('NCCRs are retired after they are minted.');
        });
      });

      describe('approve', () => {
        it('should not allow approving the NCCR after minting via `approve`', async () => {
          const { nccr, signer2 } = await setupTest({
            shouldMint: true,
          });
          const nccrAsSigner2 = await nccr.connect(signer2);
          await expect(
            nccrAsSigner2.approve(signer2.address, 1)
          ).to.be.revertedWith('NCCRs are retired after they are minted.');
        });
      });

      describe('setApprovalForAll', () => {
        it('should not allow approving all NCCRs after minting via `setApprovalForAll`', async () => {
          const { nccr, signer2 } = await setupTest({
            shouldMint: true,
          });
          const nccrAsSigner2 = await nccr.connect(signer2);
          await expect(
            nccrAsSigner2.setApprovalForAll(signer2.address, true)
          ).to.be.revertedWith('NCCRs are retired after they are minted.');
        });
      });

      describe('safeTransferFrom', () => {
        it('should not allow transferring NCCRs after minting via `safeTransferFrom`', async () => {
          const { nccr, signer1, signer2 } = await setupTest({
            shouldMint: true,
          });
          const nccrAsSigner2 = await nccr.connect(signer2);
          await expect(
            nccrAsSigner2['safeTransferFrom(address,address,uint256)'](
              signer1.address,
              signer2.address,
              1
            )
          ).to.be.revertedWith('NCCRs are retired after they are minted.');
        });

        it('should not allow transferring NCCRs after minting via `safeTransferFrom` with a bytes arg', async () => {
          const { nccr, signer1, signer2 } = await setupTest({
            shouldMint: true,
          });
          const nccrAsSigner2 = await nccr.connect(signer2);
          await expect(
            nccrAsSigner2['safeTransferFrom(address,address,uint256,bytes)'](
              signer1.address,
              signer2.address,
              1,
              '0x'
            )
          ).to.be.revertedWith('NCCRs are retired after they are minted.');
        });
      });

      describe('mintWithTokenURI', () => {
        it('should not allow minting using mintWithTokenURI', async () => {
          const { nccr, signer1 } = await setupTest();
          await expect(
            nccr.mintWithTokenURI(signer1.address, 1, 'https://example.com')
          ).to.be.revertedWith('NCCRs must be minted using a data parameter');
        });
      });
    });
  });
});
