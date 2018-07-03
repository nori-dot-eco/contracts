/* globals artifacts */
import expectThrow from '../helpers/expectThrow';

const utils = require('../helpers/utils');

const MultiSigWallet = artifacts.require('MultiSigWallet');
const web3 = MultiSigWallet.web3;
const NoriV0 = artifacts.require('NoriV0');
const TestCalls = artifacts.require('TestCalls');
const RootRegistryV0_1_0 = artifacts.require('RootRegistryV0_1_0');

const deployCalls = () => TestCalls.new();

const shouldBehaveLikeMultiSigWallet = (MultiSigContract, accounts) => {
  let multisigInstance;
  let tokenInstance;
  let contractRegistry;
  let callsInstance;
  const requiredConfirmations = 2;

  beforeEach(async () => {
    contractRegistry = await RootRegistryV0_1_0.deployed();
    assert.ok(contractRegistry);
    multisigInstance = await MultiSigContract.new(
      [accounts[0], accounts[1]],
      requiredConfirmations,
      contractRegistry.address,
      { from: accounts[0] }
    );

    assert.ok(multisigInstance);

    tokenInstance = await NoriV0.new();
    await tokenInstance.initialize(
      'NORI Token',
      'NORI',
      1,
      0,
      contractRegistry.address,
      accounts[0]
    );
    assert.ok(tokenInstance);
    callsInstance = await deployCalls();
    assert.ok(callsInstance);

    const deposit = 10000000;

    // Send money to wallet contract
    await new Promise((resolve, reject) =>
      web3.eth.sendTransaction(
        { to: multisigInstance.address, value: deposit, from: accounts[0] },
        e => (e ? reject(e) : resolve())
      )
    );
    const balance = await utils.balanceOf(web3, multisigInstance.address);
    assert.equal(balance.valueOf(), deposit);
  });

  context('EIP820 compatibility', () => {
    describe('toggleTokenReceiver', () => {
      it('should disable IEIP777TokensRecipient interface', async () => {
        const toggle = !await multisigInstance.tokenReceiver.call();
        await multisigInstance.toggleTokenReceiver(toggle);
        const tokenReceiver = await multisigInstance.tokenReceiver.call();
        assert.equal(
          tokenReceiver,
          false,
          `setting token receiver functionality to ${toggle} failed`
        );
      });
      it('should enable IEIP777TokensRecipient interface after disabling', async () => {
        const toggle = !await multisigInstance.tokenReceiver.call();
        await multisigInstance.toggleTokenReceiver(toggle);
        let tokenReceiver = await multisigInstance.tokenReceiver.call();
        assert.equal(
          tokenReceiver,
          false,
          `setting token receiver functionality to ${toggle} failed`
        );
        await multisigInstance.toggleTokenReceiver(!toggle);
        tokenReceiver = await multisigInstance.tokenReceiver.call();
        assert.equal(
          tokenReceiver,
          true,
          `setting token receiver functionality to ${!toggle} failed`
        );
      });
    });

    describe('tokensReceived', () => {
      it('should disable IEIP777TokensRecipient interface then fail receiving tokens', async () => {
        const toggle = await multisigInstance.tokenReceiver.call();
        await multisigInstance.toggleTokenReceiver(!toggle);
        await expectThrow(
          tokenInstance.mint(multisigInstance.address, 1000000, '0x0', {
            from: accounts[0],
          })
        );
      });
    });
  });
  context('MultiSigWallet standard functions', () => {
    describe('addOwner', () => {
      it('should add a new owner', async () => {
        const proposedOwner = accounts[4];
        assert.equal(
          false,
          await multisigInstance.isOwner.call(proposedOwner),
          'owner already exists'
        );
        const addOwnerEncoded = multisigInstance.contract.addOwner.getData(
          proposedOwner
        );
        const transactionId = utils.getParamFromTxEvent(
          await multisigInstance.submitTransaction(
            multisigInstance.address,
            0,
            addOwnerEncoded,
            { from: accounts[0] }
          ),
          'transactionId',
          null,
          'Submission'
        );
        const executedTransactionId = utils.getParamFromTxEvent(
          await multisigInstance.confirmTransaction(transactionId, {
            from: accounts[1],
          }),
          'transactionId',
          null,
          'Execution'
        );
        assert.ok(transactionId.equals(executedTransactionId));
        assert.equal(
          true,
          await multisigInstance.isOwner.call(proposedOwner),
          'failed adding new owner'
        );
      });
      it('should not allow adding duplicate owner', async () => {
        const proposedOwner = accounts[0];
        assert.equal(
          true,
          await multisigInstance.isOwner.call(proposedOwner),
          'owner doesnt exist'
        );
        const addOwnerEncoded = multisigInstance.contract.addOwner.getData(
          proposedOwner
        );
        expectThrow(
          await multisigInstance.submitTransaction(
            multisigInstance.address,
            0,
            addOwnerEncoded,
            { from: accounts[0] }
          )
        );
      });
    });
    describe('removeOwner', () => {
      it('should remove an existing owner', async () => {
        const proposedOwner = accounts[1];
        assert.equal(
          true,
          await multisigInstance.isOwner.call(proposedOwner),
          'owner doesnt exists'
        );
        const removeOwnerEncoded = multisigInstance.contract.removeOwner.getData(
          proposedOwner
        );
        const transactionId = utils.getParamFromTxEvent(
          await multisigInstance.submitTransaction(
            multisigInstance.address,
            0,
            removeOwnerEncoded,
            { from: accounts[0] }
          ),
          'transactionId',
          null,
          'Submission'
        );
        const executedTransactionId = utils.getParamFromTxEvent(
          await multisigInstance.confirmTransaction(transactionId, {
            from: accounts[1],
          }),
          'transactionId',
          null,
          'Execution'
        );
        assert.ok(transactionId.equals(executedTransactionId));
        assert.equal(
          false,
          await multisigInstance.isOwner.call(proposedOwner),
          'failed removing new owner'
        );
      });
    });

    describe('replaceOwner', () => {
      it('should replace an existing owner', async () => {
        const ownerToReplace = accounts[1];
        const newOwner = accounts[4];
        assert.equal(
          true,
          await multisigInstance.isOwner.call(ownerToReplace),
          'owner doesnt exists'
        );
        assert.equal(
          false,
          await multisigInstance.isOwner.call(newOwner),
          'owner already exists'
        );

        const replaceOwnerEncoded = multisigInstance.contract.replaceOwner.getData(
          ownerToReplace,
          newOwner
        );
        const transactionId = utils.getParamFromTxEvent(
          await multisigInstance.submitTransaction(
            multisigInstance.address,
            0,
            replaceOwnerEncoded,
            { from: accounts[0] }
          ),
          'transactionId',
          null,
          'Submission'
        );
        const executedTransactionId = utils.getParamFromTxEvent(
          await multisigInstance.confirmTransaction(transactionId, {
            from: accounts[1],
          }),
          'transactionId',
          null,
          'Execution'
        );
        assert.ok(transactionId.equals(executedTransactionId));
        assert.equal(
          false,
          await multisigInstance.isOwner.call(ownerToReplace),
          'failed replacing with new owner'
        );
        assert.equal(
          true,
          await multisigInstance.isOwner.call(newOwner),
          'failed replacing old owner'
        );
      });
      it('should not be possible to replace owner with an already existing owner', async () => {
        const ownerToReplace = accounts[1];
        const newOwner = accounts[0];
        assert.equal(
          true,
          await multisigInstance.isOwner.call(ownerToReplace),
          'owner doesnt exists'
        );

        const replaceOwnerEncoded = multisigInstance.contract.replaceOwner.getData(
          ownerToReplace,
          newOwner
        );
        expectThrow(
          await multisigInstance.submitTransaction(
            multisigInstance.address,
            0,
            replaceOwnerEncoded,
            { from: accounts[1] }
          )
        );
      });
    });
  });

  context(
    'Transfer tokens from wallet to user account by satisfying minimum number of mutual confirmations amongst multisig owners',
    () => {
      it('should transfer tokens after checking payload size', async () => {
        // Issue tokens to the multisig address
        const issueResult = await tokenInstance.mint(
          multisigInstance.address,
          1000000,
          '0x0',
          { from: accounts[0] }
        );
        assert.ok(issueResult);
        // Encode transfer call for the multisig
        const transferEncoded = tokenInstance.contract.send.getData(
          accounts[1],
          1000000,
          '0x0'
        );
        const transactionId = utils.getParamFromTxEvent(
          await multisigInstance.submitTransaction(
            tokenInstance.address,
            0,
            transferEncoded,
            { from: accounts[0] }
          ),
          'transactionId',
          null,
          'Submission'
        );

        const executedTransactionId = utils.getParamFromTxEvent(
          await multisigInstance.confirmTransaction(transactionId, {
            from: accounts[1],
          }),
          'transactionId',
          null,
          'Execution'
        );
        // Check that transaction has been executed
        assert.ok(transactionId.equals(executedTransactionId));
        // Check that the transfer has actually occured
        assert.equal(1000000, await tokenInstance.balanceOf(accounts[1]));
      });
    }
  );
  describe('Disallow token transfers when receiving multiple confirmations from a single multisig owner', () => {
    it('should fail transfering tokens', async () => {
      // Encode transfer call for the multisig
      const transferEncoded = tokenInstance.contract.send.getData(
        accounts[1],
        1000000,
        '0x0'
      );
      const transactionId = utils.getParamFromTxEvent(
        await multisigInstance.submitTransaction(
          tokenInstance.address,
          0,
          transferEncoded,
          { from: accounts[0] }
        ),
        'transactionId',
        null,
        'Submission'
      );
      // Transfer without issuance - expected to fail
      const failedTransactionId = utils.getParamFromTxEvent(
        await multisigInstance.confirmTransaction(transactionId, {
          from: accounts[1],
        }),
        'transactionId',
        null,
        'ExecutionFailure'
      );
      // Check that transaction has been executed
      assert.ok(transactionId.equals(failedTransactionId));
    });
  });

  describe('Test transactions after changing the number of mutual confirmations from multisig owners', () => {
    it('change multisig transaction requirements and invoke a newly valid transaction', async () => {
      const deposit = 1000;

      // Send money to wallet contract
      await new Promise((resolve, reject) =>
        web3.eth.sendTransaction(
          { to: multisigInstance.address, value: deposit, from: accounts[0] },
          e => (e ? reject(e) : resolve())
        )
      );
      const balance = await utils.balanceOf(web3, multisigInstance.address);
      assert.equal(balance.valueOf(), deposit + 10000000);

      // Add owner wa_4
      const addOwnerData = multisigInstance.contract.addOwner.getData(
        accounts[3]
      );
      const transactionId = utils.getParamFromTxEvent(
        await multisigInstance.submitTransaction(
          multisigInstance.address,
          0,
          addOwnerData,
          { from: accounts[0] }
        ),
        'transactionId',
        null,
        'Submission'
      );

      // There is one pending transaction
      const excludePending = false;
      const includePending = true;
      const excludeExecuted = false;
      const includeExecuted = true;
      assert.deepEqual(
        await multisigInstance.getTransactionIds(
          0,
          1,
          includePending,
          excludeExecuted
        ),
        [transactionId]
      );

      // Update required to 1
      const newRequired = 1;
      const updateRequirementData = multisigInstance.contract.changeRequirement.getData(
        newRequired
      );

      // Submit successfully
      const transactionId2 = utils.getParamFromTxEvent(
        await multisigInstance.submitTransaction(
          multisigInstance.address,
          0,
          updateRequirementData,
          { from: accounts[0] }
        ),
        'transactionId',
        null,
        'Submission'
      );

      assert.deepEqual(
        await multisigInstance.getTransactionIds(
          0,
          2,
          includePending,
          excludeExecuted
        ),
        [transactionId, transactionId2]
      );

      // Confirm change requirement transaction
      await multisigInstance.confirmTransaction(transactionId2, {
        from: accounts[1],
      });
      assert.equal((await multisigInstance.required()).toNumber(), newRequired);
      assert.deepEqual(
        await multisigInstance.getTransactionIds(
          0,
          1,
          excludePending,
          includeExecuted
        ),
        [transactionId2]
      );

      // Execution fails, because sender is not wallet owner
      utils.assertThrowsAsynchronously(() =>
        multisigInstance.executeTransaction(transactionId, {
          from: accounts[9],
        })
      );

      // Because the # required confirmations changed to 1, the addOwner transaction can be executed now
      await multisigInstance.executeTransaction(transactionId, {
        from: accounts[0],
      });
      assert.deepEqual(
        await multisigInstance.getTransactionIds(
          0,
          2,
          excludePending,
          includeExecuted
        ),
        [transactionId, transactionId2]
      );
    });
  });

  describe('Test assembly encodings done by multisig wallet in order to invoke contract functions', () => {
    it('callReceive1uint', async () => {
      // Encode call for the multisig
      const receive1uintEncoded = callsInstance.contract.receive1uint.getData(
        12345
      );
      const transactionId = utils.getParamFromTxEvent(
        await multisigInstance.submitTransaction(
          callsInstance.address,
          67890,
          receive1uintEncoded,
          { from: accounts[0] }
        ),
        'transactionId',
        null,
        'Submission'
      );

      const executedTransactionId = utils.getParamFromTxEvent(
        await multisigInstance.confirmTransaction(transactionId, {
          from: accounts[1],
        }),
        'transactionId',
        null,
        'Execution'
      );
      // Check that transaction has been executed
      assert.ok(transactionId.equals(executedTransactionId));
      // Check that the expected parameters and values were passed
      assert.equal(12345, await callsInstance.uint1());
      assert.equal(32 + 4, await callsInstance.lastMsgDataLength());
      assert.equal(67890, await callsInstance.lastMsgValue());
    });

    it('callReceive2uint', async () => {
      // Encode call for the multisig
      const receive2uintsEncoded = callsInstance.contract.receive2uints.getData(
        12345,
        67890
      );
      const transactionId = utils.getParamFromTxEvent(
        await multisigInstance.submitTransaction(
          callsInstance.address,
          4040404,
          receive2uintsEncoded,
          { from: accounts[0] }
        ),
        'transactionId',
        null,
        'Submission'
      );

      const executedTransactionId = utils.getParamFromTxEvent(
        await multisigInstance.confirmTransaction(transactionId, {
          from: accounts[1],
        }),
        'transactionId',
        null,
        'Execution'
      );
      // Check that transaction has been executed
      assert.ok(transactionId.equals(executedTransactionId));
      // Check that the expected parameters and values were passed
      assert.equal(12345, await callsInstance.uint1());
      assert.equal(67890, await callsInstance.uint2());
      assert.equal(32 + 32 + 4, await callsInstance.lastMsgDataLength());
      assert.equal(4040404, await callsInstance.lastMsgValue());
    });

    it('callReceive1bytes', async () => {
      // Encode call for the multisig
      const dataHex = `0x${'0123456789abcdef'.repeat(100)}`; // 800 bytes long

      const receive1bytesEncoded = callsInstance.contract.receive1bytes.getData(
        dataHex
      );
      const transactionId = utils.getParamFromTxEvent(
        await multisigInstance.submitTransaction(
          callsInstance.address,
          10,
          receive1bytesEncoded,
          { from: accounts[0] }
        ),
        'transactionId',
        null,
        'Submission'
      );

      const executedTransactionId = utils.getParamFromTxEvent(
        await multisigInstance.confirmTransaction(transactionId, {
          from: accounts[1],
        }),
        'transactionId',
        null,
        'Execution'
      );
      // Check that transaction has been executed
      assert.ok(transactionId.equals(executedTransactionId));
      // Check that the expected parameters and values were passed
      assert.equal(
        868, // 800 bytes data + 32 bytes offset + 32 bytes data length + 4 bytes method signature
        await callsInstance.lastMsgDataLength()
      );
      assert.equal(10, await callsInstance.lastMsgValue());
      assert.equal(dataHex, await callsInstance.byteArray1());
    });
  });
};

module.exports = {
  shouldBehaveLikeMultiSigWallet,
};
