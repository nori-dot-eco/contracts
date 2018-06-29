import expectThrow from '../helpers/expectThrow';
import { getLogs } from '../helpers/contracts';
import { upgradeTo } from './UnstructuredUpgrades';
import { NoriV0 } from '../helpers/Artifacts';

const shouldBehaveLikeTonToken = (
  admin,
  operator,
  recipient,
  contract,
  initParams,
  upgradeable
) => {
  let tonToken;
  let initialSupply;
  let granularity;

  beforeEach(async () => {
    const upgradeToV = upgradeTo(upgradeable);
    [tonToken, initialSupply] =
      upgradeable === 0
        ? await upgradeToV(admin, contract || NoriV0, initParams)
        : await upgradeToV(admin);
    const name = await tonToken.name();
    assert.equal('Upgradeable NORI Token', name);

    assert.ok(tonToken);
  });
  describe('name', () => {
    it('should get the token name', async () => {
      const name = await tonToken.name();
      await assert.ok(name.length > 1, 'Wrong token name');
    });
  });
  describe('symbol', () => {
    it('should get the token symbol', async () => {
      const symbol = await tonToken.symbol();
      await assert.equal(
        symbol,
        upgradeable >= 0 ? 'NORI' : 'TON',
        'Wrong token symbol'
      );
    });
  });
  describe('granularity', () => {
    it('should get the token granularity', async () => {
      granularity = await tonToken.granularity();
      await assert.equal(granularity, 1, 'Wrong token granularity');
    });
  });

  describe('decimals', () => {
    it('should get the token decimals', async () => {
      const decimals = await tonToken.decimals();
      await assert.equal(decimals, 18, 'Wrong token decimals');
    });
  });
  describe('totalSupply', () => {
    it('should get the token totalSupply', async () => {
      const totalSupply = await tonToken.totalSupply();
      await assert.equal(
        totalSupply,
        initialSupply || 0,
        'Wrong token totalSupply'
      );
    });
  });
  describe('balanceOf', () => {
    context('When the account has no balance', () => {
      it('should get the balance of an account', async () => {
        const adminBal = await tonToken.balanceOf(admin);
        await assert.equal(
          adminBal,
          initialSupply || 0,
          'Wrong account balance'
        );
      });
    });
    context('When the account has a balance', () => {
      beforeEach(async () => {
        await tonToken.mint(admin, 1, '0x0');
      });
      it('should get the balance of an account', async () => {
        const adminBal = await tonToken.balanceOf(admin);
        await assert.equal(
          adminBal,
          initialSupply > 0 ? initialSupply + 1 : 1,
          'Wrong account balance'
        );
      });
    });
  });
  describe('transfer', () => {
    beforeEach(async () => {
      await tonToken.mint(admin, 1, '0x0');
    });
    it('should transfer 1 token', async () => {
      await tonToken.transfer(recipient, 1);
      const adminBal = await tonToken.balanceOf(admin);
      const recipientBal = await tonToken.balanceOf(recipient);
      await assert.equal(
        adminBal,
        initialSupply > 0 ? initialSupply : 0,
        'Wrong admin balance'
      );
      await assert.equal(recipientBal, 1, 'Wrong recipient balance');
    });
    describe('requireMultiple', () => {
      it('should not be able to transfer less than the granularity 1 token', async () => {
        await expectThrow(tonToken.transfer(recipient, 0.1));
      });
    });
  });
  context('Third party operator scenarios', () => {
    context('erc20 operator scenarios', () => {
      describe('approve', () => {
        beforeEach(async () => {
          await tonToken.mint(admin, 1, '0x0', { from: admin });
          await tonToken.enableERC20({ from: admin });
          await tonToken.approve(operator, 1, { from: admin });
        });
        describe('allowance', () => {
          it('should approve 1 token giving the operator 1 allowance', async () => {
            const operatorAllowance = await tonToken.allowance(admin, operator);
            const adminBal = await tonToken.balanceOf(admin);
            await assert.equal(
              adminBal,
              initialSupply > 0 ? initialSupply + 1 : 1,
              'Wrong admin balance'
            );
            await assert.equal(
              operatorAllowance,
              1,
              'Wrong operator allowance'
            );
          });
        });
        describe('transferFrom', () => {
          beforeEach(async () => {
            await tonToken.transferFrom(admin, recipient, 1, {
              from: operator,
            });
          });
          context(
            'Transfer 1 token from a admins account, to a recipient, using an operator account',
            () => {
              it('should allow operator to spend 1 token', async () => {
                const adminBal = await tonToken.balanceOf(admin);
                const recipientBal = await tonToken.balanceOf(recipient);
                await assert.equal(
                  adminBal,
                  initialSupply > 0 ? initialSupply : 0,
                  'Wrong admin balance'
                );
                await assert.equal(recipientBal, 1, 'Wrong recipient balance');
              });
            }
          );
        });
      });
    });
    context('erc777 operator scenarios', () => {
      describe('authorizeOperator', () => {
        beforeEach(async () => {
          await tonToken.mint(admin, 1, '0x0', { from: admin });
          await tonToken.enableERC20({ from: admin });
          await tonToken.authorizeOperator(operator, 1, { from: admin });
        });
        describe('isOperatorFor', () => {
          it('should approve 1 token giving the operator 1 allowance', async () => {
            const isOperator = await tonToken.isOperatorFor(operator, admin);
            const operatorAllowance = await tonToken.allowance(admin, operator);
            await assert.equal(
              operatorAllowance,
              1,
              'Wrong operator allowance'
            );
            const adminBal = await tonToken.balanceOf(admin);
            await assert.equal(
              adminBal,
              initialSupply > 0 ? initialSupply + 1 : 1,
              'Wrong admin balance'
            );
            await assert.equal(isOperator, true, 'Wrong operator allowance');
          });
        });
        context(
          'send 1 token from admins account to recipient using an operator account',
          () => {
            describe('operatorSend', () => {
              it('should allow operator to spend 1 token', async () => {
                await tonToken.operatorSend(admin, recipient, 1, '0x0', '0x0', {
                  from: operator,
                });
                const adminBal = await tonToken.balanceOf(admin);
                const recipientBal = await tonToken.balanceOf(recipient);
                assert.equal(
                  adminBal,
                  initialSupply > 0 ? initialSupply : 0,
                  'Wrong admin balance'
                );
                assert.equal(recipientBal, 1, 'Wrong admin balance');
              });
              it('after spending the operators allowance, the operator should no longer have an allowance ', async () => {
                await tonToken.operatorSend(admin, recipient, 1, '0x0', '0x0', {
                  from: operator,
                });
                const operatorAllowance = await tonToken.allowance(
                  admin,
                  operator
                );
                await assert.equal(
                  operatorAllowance,
                  0,
                  'Wrong operator allowance'
                );
              });
            });
          }
        );
      });
    });
    describe('revokeOperator', () => {
      beforeEach(async () => {
        await tonToken.mint(admin, 1, '0x0');
        await tonToken.authorizeOperator(operator, 1, { from: admin });
      });
      it('should revoke operator, removing allowance', async () => {
        await tonToken.revokeOperator(operator, { from: admin });
        const operatorAllowance = await tonToken.allowance(admin, operator);
        await assert.equal(operatorAllowance, 0, 'Wrong operator allowance');
      });
      it('should revoke operator, removing authorization', async () => {
        await tonToken.revokeOperator(operator, { from: admin });
        const isOperator = await tonToken.isOperatorFor(operator, admin);
        await assert.equal(isOperator, false, 'Wrong operator authorization');
      });
    });
  });

  describe('send', () => {
    beforeEach(async () => {
      await tonToken.mint(admin, 1, '0x0');
    });
    it('should send 1 token', async () => {
      await tonToken.contract.send(recipient, 1, '0x0', {
        from: admin,
      });
      const adminBal = await tonToken.balanceOf(admin);
      const recipientBal = await tonToken.balanceOf(recipient);
      await assert.equal(
        adminBal,
        initialSupply > 0 ? initialSupply : 0,
        'Wrong admin balance'
      );
      await assert.equal(recipientBal, 1, 'Wrong admin balance');
    });
  });

  describe('mint', () => {
    it('should fail when minting less than the specified granularity', async () => {
      await expectThrow(tonToken.mint(admin, granularity / 2, '0x0'));
    });

    it('should not fail when minting a valid granularity', async () => {
      await tonToken.mint(admin, 1, '0x0');
      const mintRecipientBal = await tonToken.balanceOf(admin);
      await assert.equal(
        mintRecipientBal,
        initialSupply > 0 ? initialSupply + 1 : 1,
        'Mint fail'
      );
    });

    context('After minting a token', () => {
      let mintedLogs;
      before(async () => {
        tonToken.mint(admin, 1, '0x0');
        mintedLogs = await getLogs(tonToken.Minted);
      });

      describe('Minted (event)', () => {
        it('should put a Minted event into the logs', () => {
          assert.equal(
            mintedLogs.length,
            1,
            'Expected one Minted event to have been sent'
          );
        });
        it("should include a 'to' arg", () => {
          assert.equal(
            mintedLogs[0].args.to,
            admin,
            'Expected Minted Event "to" arg to be the buyer'
          );
        });
        it("should include an 'amount' arg", () => {
          assert.equal(
            mintedLogs[0].args.amount.toString(),
            1,
            'Expected Minted Event "amount" arg to be the amount minuted'
          );
        });
        it("should include an 'operator' arg", () => {
          assert.equal(
            mintedLogs[0].args.operator,
            admin,
            'Expected Minted Event "operator" arg to be the sender'
          );
        });
      });
    });
  });

  context('toggle erc20 interface', () => {
    describe('disableERC20', () => {
      it('should disable erc20 compatibility and try to call an erc20 only function', async () => {
        await tonToken.disableERC20({ from: admin });
        await expectThrow(tonToken.decimals.call());
      });
    });
    describe('enableERC20', () => {
      it('should enable ERC20 compatibility and try to call an erc20 only function', async () => {
        await tonToken.enableERC20({ from: admin });
        assert.equal(
          await tonToken.decimals.call(),
          18,
          'couldnt call an erc20 modified func'
        );
      });
    });
  });

  context('Burn a token after minting a token', () => {
    let burntLogs;
    let mintRecipientBal;
    beforeEach(async () => {
      await tonToken.mint(admin, 3, '0x0');
      mintRecipientBal = await tonToken.balanceOf(admin);
      assert.equal(
        mintRecipientBal,
        initialSupply > 0 ? initialSupply + 3 : 3,
        'minting failed'
      );
      await tonToken.burn(admin, 1);
      burntLogs = await getLogs(tonToken.Burnt);
    });
    describe('burn', () => {
      it('should burn a token', async () => {
        await tonToken.burn(admin, 1);
        burntLogs = await getLogs(tonToken.Burnt);
        mintRecipientBal = await tonToken.balanceOf(admin);
        assert.equal(
          mintRecipientBal,
          initialSupply > 0 ? initialSupply + 1 : 1,
          'burn fail'
        );
      });
    });
    context('After burning a token', () => {
      describe('Burnt (event)', () => {
        it('should put a Burnt event into the logs', () => {
          assert.equal(
            burntLogs.length,
            1,
            'Expected one Burnt event to have been sent'
          );
        });
        it("should include a 'from' arg", () => {
          assert.equal(
            burntLogs[0].args.from,
            admin,
            'Expected Burnt Event "from" arg to be the sender'
          );
        });

        it("should include an 'amount' arg", () => {
          assert.equal(
            burntLogs[0].args.amount.toString(),
            1,
            'Expected Burnt Event "amount" arg to be the amount burned'
          );
        });
      });
    });
  });
};
module.exports = {
  shouldBehaveLikeTonToken,
};
