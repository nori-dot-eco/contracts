// const { TestHelper } = require('@openzeppelin/cli');
// const { waffle } = require('hardhat');
// const { expect } = require('chai');

// const { shouldSupportInterfaces } = require('./helpers/interfaces');

// const setupTest = async ({ shouldMint = false } = {}) => {
//   const Nccr = await ethers.getContractFactory('NCCR_V0');
//   const nccr = await upgrades.deployProxy(Nccr, [], {
//     initializer: 'initialize()',
//   });
//   await nccr.deployed();
//   if (shouldMint) {
//     await nccr.mintWithTokenURIAndData(
//       (
//         await ethers.getSigners()
//       )[0].address,
//       1,
//       'https://example.com',
//       '{"buyer":"Bill O","NRTs":17,"sources":[{"source":0,"NRTs":17}]}'
//     );
//   }
//   const [signer1, signer2] = await ethers.getSigners();
//   return { nccr, signer1, signer2 };
// };
// describe('NCCR_V0', () => {
//   describe('contract upgradeability', () => {
//     it('should create a proxy contract', async () => {
//       const { nccr } = await setupTest();
//       nccr.constructor.name.should.equals('Contract');
//     });
//   });

//   describe('contract interfaces', () => {
//     it('should have a `supportsInterface` function', async () => {
//       const { nccr } = await setupTest();
//       (typeof nccr.supportsInterface).should.equals('function');
//     });

//     it('should have a `name` function', async () => {
//       const { nccr } = await setupTest();
//       (typeof nccr.name).should.equals('function');
//     });

//     it('should have a `getApproved` function', async () => {
//       const { nccr } = await setupTest();
//       (typeof nccr.getApproved).should.equals('function');
//     });

//     it('should have a `totalSupply` function', async () => {
//       const { nccr } = await setupTest();
//       (typeof nccr.totalSupply).should.equals('function');
//     });

//     it('should have a `tokenOfOwnerByIndex` function', async () => {
//       const { nccr } = await setupTest();
//       (typeof nccr.tokenOfOwnerByIndex).should.equals('function');
//     });

//     it('should have a `tokenOfOwnerByIndex` function', async () => {
//       const { nccr } = await setupTest();
//       (typeof nccr.tokenOfOwnerByIndex).should.equals('function');
//     });

//     it('should have a `unpause` function', async () => {
//       const { nccr } = await setupTest();
//       (typeof nccr.unpause).should.equals('function');
//     });

//     it('should have a `isPauser` function', async () => {
//       const { nccr } = await setupTest();
//       (typeof nccr.isPauser).should.equals('function');
//     });

//     it('should have a `tokenByIndex` function', async () => {
//       const { nccr } = await setupTest();
//       (typeof nccr.tokenByIndex).should.equals('function');
//     });

//     it('should have a `mintWithTokenURI` function', async () => {
//       const { nccr } = await setupTest();
//       (typeof nccr.mintWithTokenURI).should.equals('function');
//     });

//     it('should have a `paused` function', async () => {
//       const { nccr } = await setupTest();
//       (typeof nccr.paused).should.equals('function');
//     });

//     it('should have a `ownerOf` function', async () => {
//       const { nccr } = await setupTest();
//       (typeof nccr.ownerOf).should.equals('function');
//     });

//     it('should have a `renouncePauser` function', async () => {
//       const { nccr } = await setupTest();
//       (typeof nccr.renouncePauser).should.equals('function');
//     });

//     it('should have a `balanceOf` function', async () => {
//       const { nccr } = await setupTest();
//       (typeof nccr.balanceOf).should.equals('function');
//     });

//     it('should have a `addPauser` function', async () => {
//       const { nccr } = await setupTest();
//       (typeof nccr.addPauser).should.equals('function');
//     });

//     it('should have a `pause` function', async () => {
//       const { nccr } = await setupTest();
//       (typeof nccr.pause).should.equals('function');
//     });

//     it('should have a `symbol` function', async () => {
//       const { nccr } = await setupTest();
//       (typeof nccr.symbol).should.equals('function');
//     });

//     it('should have a `addMinter` function', async () => {
//       const { nccr } = await setupTest();
//       (typeof nccr.addMinter).should.equals('function');
//     });

//     it('should have a `renounceMinter` function', async () => {
//       const { nccr } = await setupTest();
//       (typeof nccr.renounceMinter).should.equals('function');
//     });

//     it('should have a `isMinter` function', async () => {
//       const { nccr } = await setupTest();
//       (typeof nccr.isMinter).should.equals('function');
//     });

//     it('should have a `tokenURI` function', async () => {
//       const { nccr } = await setupTest();
//       (typeof nccr.tokenURI).should.equals('function');
//     });

//     it('should have a `setApprovalForAll` function', async () => {
//       const { nccr } = await setupTest();
//       (typeof nccr.setApprovalForAll).should.equals('function');
//     });

//     it('should have a `transferFrom` function', async () => {
//       const { nccr } = await setupTest();
//       (typeof nccr.transferFrom).should.equals('function');
//     });

//     it('should have a `isApprovedForAll` function', async () => {
//       const { nccr } = await setupTest();
//       (typeof nccr.isApprovedForAll).should.equals('function');
//     });

//     it('should have a `approve` function', async () => {
//       const { nccr } = await setupTest();
//       console.log('approve', typeof nccr.approve);
//       (typeof nccr.approve).should.equals('function');
//     });

//     it('should have a `safeTransferFrom` function', async () => {
//       const { nccr } = await setupTest();
//       (typeof nccr[
//         'safeTransferFrom(address,address,uint256,bytes)'
//       ]).should.equals('function');
//     });
//     describe('non-standard functions', () => {
//       it('should have a `tokenData` function', async () => {
//         const { nccr } = await setupTest();
//         (typeof nccr.tokenData).should.equals('function');
//       });

//       it('should have a `mintWithTokenURIAndData` function', async () => {
//         const { nccr } = await setupTest();
//         (typeof nccr.mintWithTokenURIAndData).should.equals('function');
//       });
//     });
//   });

//   describe('contract behaviors', () => {
//     describe('initialize', () => {
//       it('should have registered its interface', async () => {
//         const { nccr } = await setupTest();
//         await shouldSupportInterfaces(nccr, [
//           'ERC165',
//           'ERC721',
//           'ERC721Enumerable',
//           'ERC721Metadata',
//         ]);
//       });

//       it('should have been given a symbol', async () => {
//         const { nccr } = await setupTest();
//         (await nccr.symbol()).should.equal('NCCR');
//       });

//       it('should have been given a name', async () => {
//         const { nccr } = await setupTest();
//         (await nccr.name()).should.equal('Nori Certificate of Carbon Removal');
//       });

//       it('should have granted the deployer the minter role', async () => {
//         const { nccr, signer1 } = await setupTest();
//         (await nccr.isMinter(signer1.address)).should.equal(true);
//       });

//       it('should have granted the deployer the pauser role', async () => {
//         const { nccr, signer1 } = await setupTest();
//         (await nccr.isPauser(signer1.address)).should.equal(true);
//       });

//       it('should not be paused', async () => {
//         const { nccr } = await setupTest();
//         (await nccr.paused()).should.equal(false);
//       });
//     });

//     describe('minting', () => {
//       describe('mintWithTokenURIAndData', () => {
//         describe('reverting', () => {
//           it('should not allow minting from a non-minter', async () => {
//             const { nccr, signer1, signer2 } = await setupTest({
//               shouldMint: true,
//             });
//             const nccrAsSigner2 = await nccr.connect(signer2);
//             await expect(
//               nccrAsSigner2.mintWithTokenURIAndData(
//                 signer1.address,
//                 1,
//                 'https://example.com',
//                 '{"buyer":"Bill O","NRTs":17,"sources":[{"source":0,"NRTs":17}]}'
//               )
//             ).to.be.revertedWith(
//               'MinterRole: caller does not have the Minter role'
//             );
//           });
//         });

//         describe('success', () => {
//           it('should allow minting from the minter using mintWithTokenURIAndData', async () => {
//             const { nccr, signer1 } = await setupTest({ shouldMint: true });
//             await nccr.mintWithTokenURIAndData(
//               signer1.address,
//               2,
//               'https://example.com',
//               '{"buyer":"Bill O","NRTs":17,"sources":[{"source":0,"NRTs":17}]}'
//             );
//           });

//           it('should assign the token to the `to` address given', async () => {
//             const { nccr, signer1 } = await setupTest({ shouldMint: true });
//             (await nccr.ownerOf(1)).should.equal(signer1.address);
//           });

//           it('should increment the NCCR balance of the `to` address given', async () => {
//             const { nccr, signer1 } = await setupTest({ shouldMint: true });
//             (await nccr.balanceOf(signer1.address)).should.equal('1');
//           });

//           it('should assign the token to the `to` address given', async () => {
//             const { nccr, signer1 } = await setupTest({ shouldMint: true });
//             (await nccr.ownerOf(1)).should.equal(signer1.address);
//           });

//           it('should assign the token to the `to` address given', async () => {
//             const { nccr, signer1 } = await setupTest({ shouldMint: true });
//             (await nccr.ownerOf(1)).should.equal(signer1.address);
//           });

//           it('should assign the token a URI', async () => {
//             const { nccr } = await setupTest({ shouldMint: true });
//             (await nccr.tokenURI(1)).should.equal('https://example.com');
//           });

//           it('should assign the token human readable data', async () => {
//             const { nccr } = await setupTest({ shouldMint: true });
//             (await nccr.tokenData(1)).should.equal(
//               '{"buyer":"Bill O","NRTs":17,"sources":[{"source":0,"NRTs":17}]}'
//             );
//           });
//         });
//       });
//     });

//     describe('overridden standard methods', () => {
//       describe('transferFrom', () => {
//         it('should not allow transferring the NCCR after minting via `transferFrom`', async () => {
//           const { nccr, signer2, signer1 } = await setupTest({
//             shouldMint: true,
//           });
//           const nccrAsSigner2 = await nccr.connect(signer2);
//           await expect(
//             nccrAsSigner2['safeTransferFrom(address,address,uint256)'](
//               signer1.address,
//               signer2.address,
//               1
//             )
//           ).to.be.revertedWith('NCCRs are retired after they are minted.');
//         });
//       });

//       describe('approve', () => {
//         it('should not allow approving the NCCR after minting via `approve`', async () => {
//           const { nccr, signer2 } = await setupTest({
//             shouldMint: true,
//           });
//           const nccrAsSigner2 = await nccr.connect(signer2);
//           await expect(
//             nccrAsSigner2.approve(signer2.address, 1)
//           ).to.be.revertedWith('NCCRs are retired after they are minted.');
//         });
//       });

//       describe('setApprovalForAll', () => {
//         it('should not allow approving all NCCRs after minting via `setApprovalForAll`', async () => {
//           const { nccr, signer2 } = await setupTest({
//             shouldMint: true,
//           });
//           const nccrAsSigner2 = await nccr.connect(signer2);
//           await expect(
//             nccrAsSigner2.setApprovalForAll(signer2.address, true)
//           ).to.be.revertedWith('NCCRs are retired after they are minted.');
//         });
//       });

//       describe('safeTransferFrom', () => {
//         it('should not allow transferring NCCRs after minting via `safeTransferFrom`', async () => {
//           const { nccr, signer1, signer2 } = await setupTest({
//             shouldMint: true,
//           });
//           const nccrAsSigner2 = await nccr.connect(signer2);
//           await expect(
//             nccrAsSigner2['safeTransferFrom(address,address,uint256)'](
//               signer1.address,
//               signer2.address,
//               1
//             )
//           ).to.be.revertedWith('NCCRs are retired after they are minted.');
//         });

//         it('should not allow transferring NCCRs after minting via `safeTransferFrom` with a bytes arg', async () => {
//           const { nccr, signer1, signer2 } = await setupTest({
//             shouldMint: true,
//           });
//           const nccrAsSigner2 = await nccr.connect(signer2);
//           await expect(
//             nccrAsSigner2['safeTransferFrom(address,address,uint256,bytes)'](
//               signer1.address,
//               signer2.address,
//               1,
//               '0x'
//             )
//           ).to.be.revertedWith('NCCRs are retired after they are minted.');
//         });
//       });

//       describe('mintWithTokenURI', () => {
//         it('should not allow minting using mintWithTokenURI', async () => {
//           const { nccr, signer1 } = await setupTest();
//           await expect(
//             nccr.mintWithTokenURI(signer1.address, 1, 'https://example.com')
//           ).to.be.revertedWith('NCCRs must be minted using a data parameter');
//         });
//       });
//     });
//   });
// });
