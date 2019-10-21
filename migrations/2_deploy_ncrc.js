const { scripts, ConfigManager } = require('@openzeppelin/cli');

const { add, push, create } = scripts;

async function deploy(options) {
  add({ contractsData: [{ name: 'NCCR_V0', alias: 'NCCR_V0' }] });
  await push(options);
  await create(
    Object.assign(
      {
        contractAlias: 'NCCR_V0',
        methodName: 'initialize',
        methodArgs: [],
      },
      options
    )
  );
}

module.exports = (deployer, network, accounts) => {
  deployer.then(async () => {
    const {
      network: n,
      txParams,
    } = await ConfigManager.initNetworkConfiguration({
      network,
      from: accounts[0],
    });
    await deploy({ network: n, txParams });
  });
};
