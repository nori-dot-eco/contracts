const { scripts, ConfigManager } = require('@openzeppelin/cli');

const { add, push, create } = scripts;

async function deploy(options) {
  add({
    contractsData: [{ name: 'Nori_Polygon_V0', alias: 'Nori_Polygon_V0' }],
  });
  await push(options);
  await create({
    contractAlias: 'Nori_Polygon_V0',
    methodName: 'initialize',
    methodArgs: [],
    ...options,
  });
}

module.exports = (deployer, network, accounts) => {
  console.log({ network });
  if (['mumbai', 'polygon'].includes(network)) {
    deployer.then(async () => {
      const { txParams } = await ConfigManager.initNetworkConfiguration({
        network,
        from: accounts[0],
      });
      await deploy({
        network,
        txParams: {
          ...txParams,
          chainId: this.web3.utils.toHex(deployer.network_id),
        },
      });
    });
  }
};
