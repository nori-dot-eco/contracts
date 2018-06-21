const abi = require('ethereumjs-abi');

function getParamFromTxEvent(
  transaction,
  paramName,
  contractFactory,
  eventName
) {
  assert.isObject(transaction);
  let logs = transaction.logs;
  if (eventName != null) {
    logs = logs.filter(l => l.event === eventName);
  }
  assert.equal(logs.length, 1, 'too many logs found!');
  const param = logs[0].args[paramName];
  if (contractFactory != null) {
    const contract = contractFactory.at(param);
    assert.isObject(contract, `getting ${paramName} failed for ${param}`);
    return contract;
  }
  return param;
}

function mineBlock(web3, reject, resolve) {
  web3.currentProvider.sendAsync(
    {
      method: 'evm_mine',
      jsonrpc: '2.0',
      id: new Date().getTime(),
    },
    e => (e ? reject(e) : resolve())
  );
}

function increaseTimestamp(web3, increase) {
  return new Promise((resolve, reject) => {
    web3.currentProvider.sendAsync(
      {
        method: 'evm_increaseTime',
        params: [increase],
        jsonrpc: '2.0',
        id: new Date().getTime(),
      },
      e => (e ? reject(e) : mineBlock(web3, reject, resolve))
    );
  });
}

function balanceOf(web3, account) {
  return new Promise((resolve, reject) =>
    web3.eth.getBalance(
      account,
      (e, balance) => (e ? reject(e) : resolve(balance))
    )
  );
}

async function assertThrowsAsynchronously(test, error) {
  try {
    await test();
  } catch (e) {
    if (!error || e instanceof error) return 'everything is fine';
  }
  throw new Error(`Missing rejection${error ? ` with ${error.name}` : ''}`);
}

async function assertRevert(promise) {
  try {
    await promise;
    assert.fail('Expected revert not received');
  } catch (error) {
    const revertFound = error.message.search('revert') >= 0;
    assert(revertFound, `Expected "revert", got ${error} instead`);
  }
}

function encodeCall(name, _arguments, values) {
  const methodId = abi.methodID(name, _arguments).toString('hex');
  const params = abi.rawEncode(_arguments, values).toString('hex');
  return `0x${methodId}${params}`;
}

const sendTx = (from, to, value) =>
  web3.eth.sendTransaction({
    from,
    to,
    value: web3.toWei(value, 'ether'),
  });

// give a percentage of an accounts (or all if from is omitted) balance to a specified user
const giveEth = (toAccount, percentage, fromAccounts) => {
  const accounts = fromAccounts || web3.personal.listAccounts;
  accounts.forEach(fromAccount => {
    sendTx(
      fromAccount,
      toAccount,
      web3.fromWei(web3.eth.getBalance(fromAccount)).toNumber() * percentage
    );
  });
};

Object.assign(exports, {
  giveEth,
  sendTx,
  encodeCall,
  assertRevert,
  getParamFromTxEvent,
  increaseTimestamp,
  balanceOf,
  assertThrowsAsynchronously,
});
