import { assertRevert } from '../helpers/utils';
import {
  UnstructuredUpgradeableTokenV1,
  UnstructuredUpgradeableTokenV2,
  UnstructuredUpgradeableTokenV3,
} from '../helpers/Artifacts';
import { getLogs, getLatestVersionFromFs } from '../helpers/contracts';
import { upgradeTo } from './UnstructuredUpgrades';
import { shouldBehaveLikeTonToken } from './UnstructuredTonToken';

const shouldBehaveLikeUnstructuredUpgradeableToken = (
  admin,
  mintRecipient,
  transferRecipient,
  contract,
  initParams,
  upgradeable
) => {
  if (upgradeable === 0 || !upgradeable) {
    shouldBehaveLikeUnstructuredUpgradeableTokenV0(
      admin,
      mintRecipient,
      transferRecipient,
      contract,
      initParams,
      upgradeable
    );
  } else if (upgradeable === 1) {
    shouldBehaveLikeUnstructuredUpgradeableTokenV1(
      admin,
      mintRecipient,
      transferRecipient,
      contract,
      initParams,
      upgradeable
    );
  } else if (upgradeable === 2) {
    shouldBehaveLikeUnstructuredUpgradeableTokenV2(
      admin,
      mintRecipient,
      transferRecipient,
      contract,
      initParams,
      upgradeable
    );
  } else if (upgradeable === 3) {
    shouldBehaveLikeUnstructuredUpgradeableTokenV3(
      admin,
      mintRecipient,
      transferRecipient,
      contract,
      initParams,
      upgradeable
    );
  } else if (upgradeable === 4) {
    shouldBehaveLikeUnstructuredUpgradeableTokenV4(
      admin,
      mintRecipient,
      transferRecipient,
      contract,
      initParams,
      upgradeable
    );
  }
};

const shouldBehaveLikeUnstructuredUpgradeableTokenV0 = (
  admin,
  mintRecipient,
  transferRecipient,
  contract,
  initParams,
  upgradeable
) => {
  let upgradeableTokenV0;
  let initialSupply;

  beforeEach(async () => {
    const upgradeToV = upgradeTo(upgradeable);
    [upgradeableTokenV0, initialSupply] = await upgradeToV(
      admin,
      contract,
      initParams
    );
  });

  context(
    'Thee UpgradeableToken should be able to do everything the TonToken was able to do',
    () => {
      shouldBehaveLikeTonToken(
        admin,
        mintRecipient,
        transferRecipient,
        contract,
        initParams,
        upgradeable
      );
    }
  );

  describe('name', () => {
    it('returns the correct name', async () => {
      const name = await upgradeableTokenV0.name();
      assert.equal(`Upgradeable NORI Token`, name);
    });
  });
  describe('totalSupply', () => {
    context('when there are no tokens', () => {
      it('returns zero', async () => {
        const totalSupply = await upgradeableTokenV0.totalSupply();
        assert.equal(totalSupply, initialSupply || 0);
      });
    });

    context('when there are some tokens', () => {
      beforeEach(async () => {
        await upgradeableTokenV0.mint(admin, 100, '0x0', { from: admin });
      });

      it('returns the total amount of tokens', async () => {
        const totalSupply = await upgradeableTokenV0.totalSupply();
        assert.equal(totalSupply, initialSupply + 100 || 100);
      });
    });
  });

  describe('balanceOf', () => {
    context('when the requested account has no tokens', () => {
      it('returns zero', async () => {
        const balance = await upgradeableTokenV0.balanceOf(mintRecipient);
        assert.equal(balance, 0);
      });
    });

    context('when the requested account has some tokens', () => {
      beforeEach(async () => {
        await upgradeableTokenV0.mint(mintRecipient, 100, '0x0', {
          from: admin,
        });
      });

      it('returns the total amount of tokens', async () => {
        const balance = await upgradeableTokenV0.balanceOf(mintRecipient);
        assert.equal(balance, 100);
      });
    });
  });

  context('toggle erc20 interface', () => {
    describe('disableERC20', () => {
      it('should disable erc20 compatibility and try to call an erc20 only function', async () => {
        await upgradeableTokenV0.disableERC20({ from: admin });
        await assertRevert(upgradeableTokenV0.decimals.call());
      });
    });
    describe('enableERC20', () => {
      it('should enable ERC20 compatibility and try to call an erc20 only function', async () => {
        await upgradeableTokenV0.enableERC20({ from: admin });
        const decimals = await upgradeableTokenV0.decimals.call();
        assert.equal(decimals, 18);
      });
    });
  });

  describe('transfer', () => {
    const amount = 100;
    context('when the sender does not have enough balance', () => {
      beforeEach(async () => {
        await upgradeableTokenV0.mint(mintRecipient, amount - 1, '0x0', {
          from: admin,
        });
      });
      it('reverts', async () => {
        await assertRevert(
          upgradeableTokenV0.transfer(transferRecipient, amount, {
            from: mintRecipient,
          })
        );
      });
    });
  });
};

const shouldBehaveLikeUnstructuredUpgradeableTokenV1 = (
  admin,
  mintRecipient,
  transferRecipient,
  contract,
  initParams,
  upgradeable
) => {
  let upgradeableTokenV1;

  // first, test that token V1 still behaves like V0
  context(
    'Assert that upgraded token can do everything that V0 could do',
    () => {
      shouldBehaveLikeUnstructuredUpgradeableTokenV0(
        admin,
        mintRecipient,
        transferRecipient,
        contract,
        initParams,
        upgradeable
      );
    }
  );

  // second, test that token V1 can use the new functions and retrieve new state
  context('Assert that V1 functions and state are usable', () => {
    beforeEach(async () => {
      if (upgradeable >= 0) {
        const upgradeToV = upgradeTo(upgradeable);
        [upgradeableTokenV1, ,] = await upgradeToV(admin);
      } else {
        const contractRegistry = await artifacts
          .require(
            `./ContractRegistryV${await getLatestVersionFromFs(
              'ContractRegistry'
            )}`
          )
          .new({
            from: admin,
          });
        upgradeableTokenV1 = UnstructuredUpgradeableTokenV1.new(
          'NORI Token V1',
          'NORI',
          1,
          0,
          contractRegistry.address,
          admin,
          { from: admin }
        );
      }
    });

    context('Set and get new state using functions newly added to V1', () => {
      describe('addNewState', () => {
        it('can set new state', async () => {
          assert.ok(await upgradeableTokenV1.addNewState({ from: admin }));
        });
      });
      describe('getNewState', () => {
        it('returns the new state', async () => {
          await upgradeableTokenV1.addNewState({ from: admin });
          const newStateVariable = await upgradeableTokenV1.getNewState({
            from: admin,
          });
          assert.equal(newStateVariable, 'new state');
        });
      });
    });
  });
};

const shouldBehaveLikeUnstructuredUpgradeableTokenV2 = (
  admin,
  mintRecipient,
  transferRecipient,
  contract,
  initParams,
  upgradeable
) => {
  let upgradeableTokenV2;

  context('Assert that V2 can do everything that V1 could do', () => {
    shouldBehaveLikeUnstructuredUpgradeableTokenV1(
      admin,
      mintRecipient,
      transferRecipient,
      contract,
      initParams,
      upgradeable
    );
  });

  context('Assert that V2 can use upgraded V2 functions', () => {
    beforeEach(async () => {
      if (upgradeable >= 0) {
        const upgradeToV = upgradeTo(upgradeable, contract);
        [upgradeableTokenV2, ,] = await upgradeToV(admin);
      } else {
        const contractRegistry = await artifacts
          .require(
            `./ContractRegistryV${await getLatestVersionFromFs(
              'ContractRegistry'
            )}`
          )
          .new({
            from: admin,
          });
        upgradeableTokenV2 = UnstructuredUpgradeableTokenV2.new(
          'NORI Token V2',
          'NORI',
          1,
          0,
          contractRegistry.address,
          admin,
          { from: admin }
        );
      }
    });

    context('Set and get new state using functions newly added to V2', () => {
      let addNewStateLogs;
      beforeEach(async () => {
        await upgradeableTokenV2.addNewState({ from: admin });
        addNewStateLogs = await getLogs(upgradeableTokenV2.NewStateAdded);
      });

      context('After setting state', () => {
        describe('NewStateAdded (event)', () => {
          it('returns the new state', async () => {
            const newStateVariable = await upgradeableTokenV2.getNewState({
              from: admin,
            });
            assert.equal(newStateVariable, 'new state');
          });
          it('should put a NewStateAdded event into the logs', () => {
            assert.equal(
              addNewStateLogs.length,
              1,
              'Expected one NewStateAdded event to have been sent'
            );
          });
          it("should include a 'newStateVariable' arg", () => {
            assert.equal(
              addNewStateLogs[0].args.newStateVariable,
              'newStateVariable',
              'Expected NewStateAdded Event "newStateVariable" arg to be the name of the variable added'
            );
          });
        });
      });
    });
    context(
      'Test that V2 has deprecated the logic of a V1 function of the same name',
      () => {
        describe('funcThatV2ShouldDeprecate', () => {
          it('returns the string in V2 and not V1', async () => {
            const newStringReturned = await upgradeableTokenV2.funcThatV2ShouldDeprecate(
              { from: admin }
            );
            assert.equal(
              newStringReturned,
              'V1 func of same name has been deprecated'
            );
          });
        });
      }
    );
  });
};

// // Test removing all token functionality and reset state
const shouldBehaveLikeUnstructuredUpgradeableTokenV3 = (
  admin,
  mintRecipient,
  transferRecipient,
  contract,
  initParams,
  upgradeable
) => {
  let upgradeableTokenV3;
  let v2TotalSupply;
  beforeEach(async () => {
    if (upgradeable >= 0) {
      const upgradeToV = upgradeTo(upgradeable);
      [upgradeableTokenV3, v2TotalSupply] = await upgradeToV(admin);
    } else {
      upgradeableTokenV3 = UnstructuredUpgradeableTokenV3.new({
        from: admin,
      });
    }
  });

  context('Assert that V3 can not call a standard V0 function', () => {
    describe('totalSupply', () => {
      it('should be an undefined function', done => {
        assert.ok(typeof upgradeableTokenV3.totalSupply === 'undefined');
        done();
      });
    });
  });
  context('Assert that V3 did not inherit state from V2', () => {
    describe('checkStateNotPreserved', () => {
      it('should verify state was not preserved', async () => {
        const supplyState = await upgradeableTokenV3.checkStateNotPreserved(); // state is kinda preserved, but storage alignment is messed up
        assert.notEqual(supplyState.toNumber(), v2TotalSupply.toNumber());
      });
    });
  });
  context('Assert that V3 can call its function', () => {
    // note: technically it can also call public Ownable functions
    describe('theOnlyFunction', () => {
      it('should return a string by calling the only function', async () => {
        const returnedString = await upgradeableTokenV3.theOnlyFunction();
        assert.equal(returnedString, 'the only function');
      });
    });
  });
};

// this test goes through a scennario which upgrades the token from v0-v1-v2-v3
// and in v3 since v2 was not inherited, access to state is lost.
// However, v4 rolls back to V2 and recovers state
const shouldBehaveLikeUnstructuredUpgradeableTokenV4 = (
  admin,
  mintRecipient,
  transferRecipient,
  contract,
  initParams,
  upgradeable
) => {
  let upgradeableTokenV4;
  let v2TotalSupply;
  beforeEach(async () => {
    const upgradeToV = upgradeTo(upgradeable);
    [upgradeableTokenV4, v2TotalSupply] = await upgradeToV(admin);
  });

  context(
    'Recover state from V2 after losing acces to it in an upgrade to V3',
    () => {
      it('should return a total supply equiv to the state which was set in v2 before upgrding to version which overwrote its access', async () => {
        const v4TotalSupply = await upgradeableTokenV4.totalSupply();
        assert.equal(v4TotalSupply.toNumber(), v2TotalSupply.toNumber());
      });
    }
  );
};

module.exports = {
  shouldBehaveLikeUnstructuredUpgradeableToken,
  shouldBehaveLikeUnstructuredUpgradeableTokenV0,
  shouldBehaveLikeUnstructuredUpgradeableTokenV1,
  shouldBehaveLikeUnstructuredUpgradeableTokenV2,
  shouldBehaveLikeUnstructuredUpgradeableTokenV3,
  shouldBehaveLikeUnstructuredUpgradeableTokenV4,
};
