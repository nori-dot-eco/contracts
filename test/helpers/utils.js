const abi = require('ethereumjs-abi');
const getNamedAccounts = require('./getNamedAccounts');

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

const onlyWhitelisted = (config, ifWhiteListed) => {
  const { network, web3, accounts } = config;
  const from = accounts[0];
  if (network === 'ropstenGeth' || network === 'ropsten') {
    if (
      ![
        '0xf1bcd758cb3d46d15afe4faef942adad36380148',
        '0x2e4d8353d81b7e903c9e031dab3e9749e8ab69bc',
      ].includes(from.toLowerCase())
    ) {
      throw new Error(
        `${from} is not a whitelisted account for deploying to ropsten.`
      );
    }
  } else if (network === 'develop' || network === 'test') {
    if (!getNamedAccounts(web3).allAccounts.includes(from.toLowerCase())) {
      throw new Error(
        `${from} is not a whitelisted account for deploying to ${network}.`
      );
    }
  }
  return ifWhiteListed(config);
};

const printRegisteredContracts = deployedContracts =>
  deployedContracts.forEach(
    async ({
      proxy,
      upgradeableContractAtProxy,
      upgraded,
      contractName,
      versionName,
      contractToMakeUpgradeable,
    }) => {
      const spaces = ' '.repeat(
        'participantregistry  '.length - contractName.length
      );
      const preface = '   ->    ';

      console.log(
        `${preface}${contractName}${spaces}|  Upgraded: ${upgraded}  |  Version: ${versionName}  |  Proxy: ${
          contractToMakeUpgradeable ? proxy.address : proxy
        }  |  Implementation: ${
          contractToMakeUpgradeable
            ? contractToMakeUpgradeable.address
            : upgradeableContractAtProxy
        }`
      );
    }
  );

const printRegistryInfo = (
  multiAdmin,
  multiSigWallet,
  { registryVersionName, registry, registryImp },
  root,
  deployedContracts
) =>
  setTimeout(() => {
    const preface = '   ->   ';
    console.log('\n\n==========\n\n Migration Info:\n');
    console.log('----------\n\n RootRegistry Info: \n');
    console.log(` ~ Implmentation: ${root.address} \n`);
    console.log('   Registered Contracts:\n');
    console.log(preface, 'MultiAdmin:', multiAdmin.address);
    console.log(preface, 'MultiSigWallet:', multiSigWallet);
    console.log(
      preface,
      `ContractRegistryV${registryVersionName} (proxy):`,
      registry.address
    );
    console.log(`\n----------\n\n ContractRegistry Info:\n`);
    console.log(` ~ Implmentation: ${registryImp} \n`);
    console.log(`   Registered Contracts:\n`);

    printRegisteredContracts(deployedContracts);
    console.log('\n==========\n');
  }, 1500);

Object.assign(exports, {
  onlyWhitelisted,
  giveEth,
  sendTx,
  encodeCall,
  assertRevert,
  getParamFromTxEvent,
  increaseTimestamp,
  balanceOf,
  assertThrowsAsynchronously,
  printRegistryInfo,
});
