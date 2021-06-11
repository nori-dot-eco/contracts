import { scripts, ConfigManager } from '@openzeppelin/cli';
import { TxParams } from '@openzeppelin/upgrades';
const { add, push, create } = scripts;

async function deploy(options: { network: string; txParams: TxParams }) {
  add({ contractsData: [{ name: 'Nori_V0', alias: 'Nori_V0' }] });
  await push(options);
  await create(
    Object.assign(
      {
        contractAlias: 'Nori_V0',
        methodName: 'initialize',
        methodArgs: [],
      },
      options
    )
  );
}

module.exports = ((deployer, network, accounts) => {
  // todo only run when network !== mainnet
  deployer.then(async () => {
    const { network: n, txParams } =
      await ConfigManager.initNetworkConfiguration({
        network,
        from: accounts[0],
      });
    await deploy({ network: n, txParams });
  });
}) as Truffle.MigrationPromise;

export {}; // because of https://stackoverflow.com/questions/40900791/cannot-redeclare-block-scoped-variable-in-unrelated-files
